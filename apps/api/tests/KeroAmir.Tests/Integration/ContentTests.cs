using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using KeroAmir.Application.Features.Settings;
using KeroAmir.Application.Features.Skills;
using KeroAmir.Application.Features.Timeline;
using KeroAmir.Application.Features.Tools;
using KeroAmir.Domain.Timeline;

namespace KeroAmir.Tests.Integration;

[Collection(ApiTestGroup.Name)]
public class ContentTests(ApiFixture api)
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private static string Unique(string prefix) => $"{prefix}-{Guid.NewGuid():N}"[..20];

    private static async Task<T> Read<T>(HttpResponseMessage response, HttpStatusCode expected)
    {
        Assert.Equal(expected, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<T>(Json, Ct))!;
    }

    [Fact]
    public async Task Skills_are_served_grouped_with_their_tool()
    {
        var admin = await api.CreateOwnerClientAsync(Ct);
        var tool = await Read<ToolAdminDto>(await admin.PostAsJsonAsync("/api/v1/admin/tools",
            new ToolInput(Unique("blender"), "Blender", "#ea7600", ShowInOrbit: true), Ct), HttpStatusCode.Created);
        Assert.Equal("#EA7600", tool.Color);

        var group = await Read<SkillGroupAdminDto>(await admin.PostAsJsonAsync("/api/v1/admin/skill-groups",
            new SkillGroupInput([new("en", "3D & motion"), new("de", "3D & Motion")]), Ct), HttpStatusCode.Created);
        await Read<SkillAdminDto>(await admin.PostAsJsonAsync("/api/v1/admin/skills",
            new SkillInput(group.Id, tool.Id, 90, [new("en", "3D modelling"), new("de", "3D-Modellierung")]), Ct), HttpStatusCode.Created);

        var groups = await api.CreateClient().GetFromJsonAsync<List<SkillGroupDto>>("/api/v1/skills?locale=de", Json, Ct);
        var served = groups!.Single(g => g.Id == group.Id);
        Assert.Equal("3D & Motion", served.Name);
        var skill = Assert.Single(served.Skills);
        Assert.Equal(("3D-Modellierung", 90, tool.Slug), (skill.Name, skill.Level, skill.ToolSlug));
    }

    [Fact]
    public async Task A_group_with_skills_cannot_be_deleted()
    {
        var admin = await api.CreateOwnerClientAsync(Ct);
        var group = await Read<SkillGroupAdminDto>(await admin.PostAsJsonAsync("/api/v1/admin/skill-groups",
            new SkillGroupInput([new("en", "Print")]), Ct), HttpStatusCode.Created);
        await admin.PostAsJsonAsync("/api/v1/admin/skills", new SkillInput(group.Id, null, 70, [new("en", "Prepress")]), Ct);

        var response = await admin.DeleteAsync($"/api/v1/admin/skill-groups/{group.Id}", Ct);
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Theory]
    [InlineData(101)]
    [InlineData(-1)]
    public async Task Skill_level_must_be_0_to_100(int level)
    {
        var admin = await api.CreateOwnerClientAsync(Ct);
        var group = await Read<SkillGroupAdminDto>(await admin.PostAsJsonAsync("/api/v1/admin/skill-groups",
            new SkillGroupInput([new("en", "Levels")]), Ct), HttpStatusCode.Created);

        var response = await admin.PostAsJsonAsync("/api/v1/admin/skills", new SkillInput(group.Id, null, level, [new("en", "X")]), Ct);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Skill_with_unknown_group_is_rejected()
    {
        var admin = await api.CreateOwnerClientAsync(Ct);
        var response = await admin.PostAsJsonAsync("/api/v1/admin/skills",
            new SkillInput(Guid.NewGuid(), null, 50, [new("en", "Orphan")]), Ct);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Timeline_is_newest_first_and_localised()
    {
        var admin = await api.CreateOwnerClientAsync(Ct);
        var org = Unique("org");
        var older = new TimelineInput(TimelineKind.Education, new DateOnly(2014, 9, 1), new DateOnly(2018, 6, 30), org, "Cairo",
            [new("en", "BA Applied Arts", "Graphic design major")]);
        var newer = new TimelineInput(TimelineKind.Work, new DateOnly(2021, 3, 1), null, org, "Berlin",
            [new("en", "Senior designer", null), new("de", "Senior-Designer", null)]);
        await admin.PostAsJsonAsync("/api/v1/admin/timeline", older, Json, Ct);
        await admin.PostAsJsonAsync("/api/v1/admin/timeline", newer, Json, Ct);

        var entries = (await api.CreateClient().GetFromJsonAsync<List<TimelineEntryDto>>("/api/v1/timeline?locale=de", Json, Ct))!
            .Where(e => e.Organization == org).ToList();

        Assert.Equal(["Senior-Designer", "BA Applied Arts"], entries.Select(e => e.Title));
        Assert.Null(entries[0].EndDate); // "present"
        Assert.Equal("Graphic design major", entries[1].Description); // English fallback keeps its description
    }

    [Fact]
    public async Task Timeline_end_before_start_is_rejected()
    {
        var admin = await api.CreateOwnerClientAsync(Ct);
        var input = new TimelineInput(TimelineKind.Award, new DateOnly(2020, 1, 1), new DateOnly(2019, 1, 1), null, null,
            [new("en", "Backwards", null)]);
        var response = await admin.PostAsJsonAsync("/api/v1/admin/timeline", input, Json, Ct);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Locale_setting_overrides_the_shared_one()
    {
        var admin = await api.CreateOwnerClientAsync(Ct);
        var key = "test" + Guid.NewGuid().ToString("N")[..8] + ".headline";
        await admin.PutAsJsonAsync($"/api/v1/admin/settings/{key}",
            new SettingInput(null, JsonSerializer.SerializeToElement("Every piece fits.")), Ct);
        await admin.PutAsJsonAsync($"/api/v1/admin/settings/{key}",
            new SettingInput("de", JsonSerializer.SerializeToElement("Jedes Teil passt.")), Ct);

        var client = api.CreateClient();
        var en = await client.GetFromJsonAsync<Dictionary<string, JsonElement>>("/api/v1/settings?locale=en", Ct);
        var de = await client.GetFromJsonAsync<Dictionary<string, JsonElement>>("/api/v1/settings?locale=de", Ct);
        Assert.Equal("Every piece fits.", en![key].GetString());
        Assert.Equal("Jedes Teil passt.", de![key].GetString());

        // Removing the German override falls back to the shared value (and evicts the cache).
        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/v1/admin/settings/{key}?locale=de", Ct)).StatusCode);
        de = await client.GetFromJsonAsync<Dictionary<string, JsonElement>>("/api/v1/settings?locale=de", Ct);
        Assert.Equal("Every piece fits.", de![key].GetString());
    }

    [Fact]
    public async Task Settings_accept_structured_values_and_reject_bad_keys()
    {
        var admin = await api.CreateOwnerClientAsync(Ct);
        var stats = JsonSerializer.SerializeToElement(new { years = 8, projects = 120, countries = 14 });
        var ok = await admin.PutAsJsonAsync("/api/v1/admin/settings/heroStats", new SettingInput(null, stats), Ct);
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);

        var bad = await admin.PutAsJsonAsync("/api/v1/admin/settings/Bad-Key", new SettingInput(null, stats), Ct);
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
    }
}
