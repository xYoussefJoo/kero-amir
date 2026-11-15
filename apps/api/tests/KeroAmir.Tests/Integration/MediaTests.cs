using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using KeroAmir.Application.Features.Media;

namespace KeroAmir.Tests.Integration;

[Collection(ApiTestGroup.Name)]
public class MediaTests(ApiFixture api)
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    // A real 1×1 PNG.
    private static readonly byte[] Png = Convert.FromBase64String(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");

    private static MultipartFormDataContent Form(byte[] bytes, string fileName, string declaredType)
    {
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue(declaredType);
        return new MultipartFormDataContent { { file, "file", fileName } };
    }

    [Fact]
    public async Task Uploaded_images_are_served_with_a_long_cache()
    {
        var owner = await api.CreateOwnerClientAsync(Ct);
        var upload = await owner.PostAsync("/api/v1/admin/media", Form(Png, "cover.png", "image/png"), Ct);
        Assert.Equal(HttpStatusCode.Created, upload.StatusCode);
        var media = (await upload.Content.ReadFromJsonAsync<MediaDto>(Ct))!;
        Assert.Equal(($"/media/{media.Id}", "image/png", Png.Length), (media.Url, media.ContentType, media.Size));

        var served = await api.CreateClient().GetAsync($"/api/v1/media/{media.Id}", Ct);
        Assert.Equal(HttpStatusCode.OK, served.StatusCode);
        Assert.Equal("image/png", served.Content.Headers.ContentType?.MediaType);
        Assert.Equal(Png, await served.Content.ReadAsByteArrayAsync(Ct));
        Assert.True(served.Headers.CacheControl?.Public);
        Assert.Equal(TimeSpan.FromDays(365), served.Headers.CacheControl?.MaxAge);
    }

    [Fact]
    public async Task Files_that_are_not_images_are_rejected_whatever_their_name()
    {
        var owner = await api.CreateOwnerClientAsync(Ct);
        var fake = await owner.PostAsync("/api/v1/admin/media", Form("not an image"u8.ToArray(), "photo.png", "image/png"), Ct);
        Assert.Equal(HttpStatusCode.BadRequest, fake.StatusCode);

        var svg = Encoding.UTF8.GetBytes("<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>");
        var script = await owner.PostAsync("/api/v1/admin/media", Form(svg, "logo.svg", "image/svg+xml"), Ct);
        Assert.Equal(HttpStatusCode.BadRequest, script.StatusCode);
    }

    [Fact]
    public async Task Uploading_needs_the_owner_and_unknown_ids_are_404()
    {
        var anonymous = api.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PostAsync("/api/v1/admin/media", Form(Png, "a.png", "image/png"), Ct)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await anonymous.GetAsync($"/api/v1/media/{Guid.NewGuid()}", Ct)).StatusCode);
    }
}

public class ImageTypeTests
{
    [Theory]
    [InlineData(new byte[] { 0xFF, 0xD8, 0xFF, 0xE0 }, "image/jpeg")]
    [InlineData(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }, "image/png")]
    [InlineData(new byte[] { 0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50 }, "image/webp")]
    [InlineData(new byte[] { 0, 0, 0, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66 }, "image/avif")]
    [InlineData(new byte[] { 0x3C, 0x73, 0x76, 0x67 }, null)] // "<svg"
    [InlineData(new byte[] { 0x47, 0x49, 0x46, 0x38 }, null)] // GIF: not accepted
    public void Detects_formats_by_their_first_bytes(byte[] bytes, string? expected) =>
        Assert.Equal(expected, ImageType.Detect(bytes));
}
