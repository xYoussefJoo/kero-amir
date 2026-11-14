using System.Net;
using System.Net.Http.Json;
using KeroAmir.Application.Common.Content;
using KeroAmir.Application.Common.Paging;
using KeroAmir.Application.Features.Categories;

namespace KeroAmir.Tests.Integration;

[Collection(ApiTestGroup.Name)]
public class CategoryTests(ApiFixture api)
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static string Slug() => $"cat-{Guid.NewGuid():N}"[..20];

    private static CategoryInput Input(string slug, string en, string? de = null) =>
        new(slug, de is null
            ? [new("en", en)]
            : [new("en", en), new("de", de)]);

    private static async Task<CategoryAdminDto> Create(HttpClient admin, CategoryInput input)
    {
        var response = await admin.PostAsJsonAsync("/api/v1/admin/categories", input, Ct);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<CategoryAdminDto>(Ct))!;
    }

    private async Task<List<CategoryDto>> PublicList(string locale) =>
        (await api.CreateClient().GetFromJsonAsync<List<CategoryDto>>($"/api/v1/categories?locale={locale}", Ct))!;

    [Fact]
    public async Task Created_category_is_public_in_both_languages_with_english_fallback()
    {
        var admin = await api.CreateOwnerClientAsync(Ct);
        var both = await Create(admin, Input(Slug(), "Packaging", "Verpackung"));
        var englishOnly = await Create(admin, Input(Slug(), "Motion"));

        var de = await PublicList("de");
        Assert.Equal("Verpackung", de.Single(c => c.Id == both.Id).Name);
        Assert.Equal("Motion", de.Single(c => c.Id == englishOnly.Id).Name); // no German: falls back to English
    }

    [Fact]
    public async Task Editing_evicts_the_public_cache()
    {
        var admin = await api.CreateOwnerClientAsync(Ct);
        var created = await Create(admin, Input(Slug(), "Before"));
        Assert.Contains(await PublicList("en"), c => c.Name == "Before"); // now cached

        var update = await admin.PutAsJsonAsync($"/api/v1/admin/categories/{created.Id}", Input(created.Slug, "After"), Ct);
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);

        var list = await PublicList("en");
        Assert.Contains(list, c => c.Id == created.Id && c.Name == "After");
    }

    [Fact]
    public async Task Duplicate_slug_is_a_conflict()
    {
        var admin = await api.CreateOwnerClientAsync(Ct);
        var slug = Slug();
        await Create(admin, Input(slug, "One"));

        var response = await admin.PostAsJsonAsync("/api/v1/admin/categories", Input(slug, "Two"), Ct);
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Theory]
    [InlineData("Bad Slug", "en")]   // invalid slug
    [InlineData("good-slug", "de")]  // no English translation
    [InlineData("good-slug", "fr")]  // unsupported locale
    public async Task Invalid_input_is_rejected(string slug, string locale)
    {
        var admin = await api.CreateOwnerClientAsync(Ct);
        var response = await admin.PostAsJsonAsync("/api/v1/admin/categories",
            new CategoryInput(slug, [new(locale, "Name")]), Ct);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Reorder_and_delete()
    {
        var admin = await api.CreateOwnerClientAsync(Ct);
        var a = await Create(admin, Input(Slug(), "A"));
        var b = await Create(admin, Input(Slug(), "B"));

        var reorder = await admin.PutAsJsonAsync("/api/v1/admin/categories/order", new ReorderRequest([b.Id, a.Id]), Ct);
        Assert.Equal(HttpStatusCode.NoContent, reorder.StatusCode);
        var page = await admin.GetFromJsonAsync<PagedResult<CategoryAdminDto>>("/api/v1/admin/categories?pageSize=100", Ct);
        Assert.True(page!.Items.Single(c => c.Id == b.Id).SortOrder < page.Items.Single(c => c.Id == a.Id).SortOrder);

        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/v1/admin/categories/{a.Id}", Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.GetAsync($"/api/v1/admin/categories/{a.Id}", Ct)).StatusCode);
        Assert.DoesNotContain(await PublicList("en"), c => c.Id == a.Id);

        // Soft-deleted slugs can be reused.
        await Create(admin, Input(a.Slug, "A again"));
    }

    [Fact]
    public async Task Admin_routes_need_the_owner()
    {
        var anonymous = api.CreateClient();
        var response = await anonymous.PostAsJsonAsync("/api/v1/admin/categories", Input(Slug(), "X"), Ct);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
