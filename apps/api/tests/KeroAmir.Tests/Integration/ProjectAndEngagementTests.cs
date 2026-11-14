using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using KeroAmir.Application.Common.Paging;
using KeroAmir.Application.Features.Categories;
using KeroAmir.Application.Features.Engagement;
using KeroAmir.Application.Features.Projects;
using KeroAmir.Domain.Engagement;
using KeroAmir.Domain.Projects;

namespace KeroAmir.Tests.Integration;

[Collection(ApiTestGroup.Name)]
public class ProjectAndEngagementTests(ApiFixture api)
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

    private async Task<(HttpClient Admin, CategoryAdminDto Category, ProjectAdminDto Project)> CreateDraftProject()
    {
        var admin = await api.CreateOwnerClientAsync(Ct);
        var category = await Read<CategoryAdminDto>(await admin.PostAsJsonAsync("/api/v1/admin/categories",
            new CategoryInput(Unique("cat"), [new("en", "Packaging"), new("de", "Verpackung")]), Ct), HttpStatusCode.Created);
        var input = new ProjectInput(Unique("proj"), 2025, ["DE", "FR"], null, "#ff6535", IsFeatured: true,
            [category.Id], [], [new("en", "Moonlight tea", "Packaging for a tea brand.", "Gold foil"), new("de", "Mondschein-Tee", "Verpackung für eine Teemarke.", null)]);
        var project = await Read<ProjectAdminDto>(await admin.PostAsJsonAsync("/api/v1/admin/projects", input, Json, Ct), HttpStatusCode.Created);
        return (admin, category, project);
    }

    private async Task<PagedResult<ProjectCardDto>> PublicProjects(string query) =>
        (await api.CreateClient().GetFromJsonAsync<PagedResult<ProjectCardDto>>($"/api/v1/projects?{query}", Json, Ct))!;

    [Fact]
    public async Task Draft_projects_stay_hidden_until_published()
    {
        var (admin, category, project) = await CreateDraftProject();
        Assert.Equal(PublishStatus.Draft, project.Status);
        Assert.DoesNotContain((await PublicProjects($"category={category.Slug}")).Items, p => p.Id == project.Id);
        Assert.Equal(HttpStatusCode.NotFound, (await api.CreateClient().GetAsync($"/api/v1/projects/{project.Slug}", Ct)).StatusCode);

        var published = await Read<ProjectAdminDto>(await admin.PutAsJsonAsync($"/api/v1/admin/projects/{project.Id}/status",
            new ProjectStatusBody(PublishStatus.Published), Json, Ct), HttpStatusCode.OK);
        Assert.NotNull(published.PublishedAt);

        var card = Assert.Single((await PublicProjects($"category={category.Slug}&locale=de")).Items);
        Assert.Equal(("Mondschein-Tee", "Gold foil", "#FF6535"), (card.Title, card.Highlight, card.AccentColor)); // highlight falls back to English
        Assert.Equal(["DE", "FR"], card.Countries);
        Assert.Equal("Verpackung", Assert.Single(card.Categories).Name);
    }

    [Fact]
    public async Task Project_with_unknown_category_is_rejected()
    {
        var admin = await api.CreateOwnerClientAsync(Ct);
        var input = new ProjectInput(Unique("proj"), 2025, [], null, null, false, [Guid.NewGuid()], [],
            [new("en", "Ghost", "Has a category that does not exist.", null)]);
        var response = await admin.PostAsJsonAsync("/api/v1/admin/projects", input, Json, Ct);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Testimonials_need_approval_before_they_show()
    {
        var text = $"Great collaboration on our rebrand, every detail fit perfectly. {Guid.NewGuid():N}";
        var submit = await api.CreateClient().PostAsJsonAsync("/api/v1/testimonials",
            new TestimonialInput("Lena", "CMO", "Nordlicht", "DE", 5, text, "de", Website: null), Json, Ct);
        Assert.Equal(HttpStatusCode.Accepted, submit.StatusCode);

        var publicList = async () => (await api.CreateClient().GetFromJsonAsync<List<TestimonialDto>>("/api/v1/testimonials", Json, Ct))!;
        Assert.DoesNotContain(await publicList(), t => t.Text == text);

        var admin = await api.CreateOwnerClientAsync(Ct);
        var pending = await admin.GetFromJsonAsync<PagedResult<TestimonialAdminDto>>("/api/v1/admin/testimonials?status=Pending&pageSize=100", Json, Ct);
        var mine = pending!.Items.Single(t => t.Text == text);

        await Read<TestimonialAdminDto>(await admin.PutAsJsonAsync($"/api/v1/admin/testimonials/{mine.Id}/moderation",
            new ModerationBody(ModerationStatus.Approved, IsFeatured: true), Json, Ct), HttpStatusCode.OK);
        Assert.Contains(await publicList(), t => t.Text == text && t.IsFeatured);
    }

    [Fact]
    public async Task Honeypot_submissions_are_accepted_but_dropped()
    {
        var text = $"Totally legit review from a very real human being. {Guid.NewGuid():N}";
        var submit = await api.CreateClient().PostAsJsonAsync("/api/v1/testimonials",
            new TestimonialInput("Bot", null, null, null, 5, text, "en", Website: "http://spam.example"), Json, Ct);
        Assert.Equal(HttpStatusCode.Accepted, submit.StatusCode); // bots learn nothing

        var admin = await api.CreateOwnerClientAsync(Ct);
        var all = await admin.GetFromJsonAsync<PagedResult<TestimonialAdminDto>>("/api/v1/admin/testimonials?pageSize=100", Json, Ct);
        Assert.DoesNotContain(all!.Items, t => t.Text == text);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    public async Task Rating_must_be_1_to_5(int rating)
    {
        var response = await api.CreateClient().PostAsJsonAsync("/api/v1/testimonials",
            new TestimonialInput("Sam", null, null, null, rating, "A long enough review text for validation.", "en", null), Json, Ct);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Contact_messages_land_in_the_inbox()
    {
        var message = $"We need a full identity for our new bakery chain in Berlin. {Guid.NewGuid():N}";
        var submit = await api.CreateClient().PostAsJsonAsync("/api/v1/contact",
            new ContactInput("Jonas", "jonas@example.com", "Backhaus", "brand-identity", "3k-10k", message, "de", null), Json, Ct);
        Assert.Equal(HttpStatusCode.Accepted, submit.StatusCode);

        var admin = await api.CreateOwnerClientAsync(Ct);
        var inbox = await admin.GetFromJsonAsync<PagedResult<ContactMessageDto>>("/api/v1/admin/messages?status=New&pageSize=100", Json, Ct);
        var received = inbox!.Items.Single(m => m.Message == message);
        Assert.Equal(("Jonas", "3k-10k", InboxStatus.New), (received.Name, received.Budget, received.Status));

        var replied = await Read<ContactMessageDto>(await admin.PutAsJsonAsync($"/api/v1/admin/messages/{received.Id}/status",
            new InboxStatusBody(InboxStatus.Replied), Json, Ct), HttpStatusCode.OK);
        Assert.Equal(InboxStatus.Replied, replied.Status);
    }

    [Fact]
    public async Task Contact_rejects_bad_email_and_unknown_budget()
    {
        var response = await api.CreateClient().PostAsJsonAsync("/api/v1/contact",
            new ContactInput("X", "not-an-email", null, null, "a-million", "Short", "en", null), Json, Ct);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Inbox_and_moderation_need_the_owner()
    {
        var anonymous = api.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/v1/admin/messages", Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/v1/admin/testimonials", Ct)).StatusCode);
    }
}
