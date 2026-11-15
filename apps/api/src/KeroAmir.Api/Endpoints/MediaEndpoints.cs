using KeroAmir.Api.Infrastructure;
using KeroAmir.Application.Common.Messaging;
using KeroAmir.Application.Features.Media;
using KeroAmir.Domain.Media;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

namespace KeroAmir.Api.Endpoints;

public static class MediaEndpoints
{
    public static void MapMediaEndpoints(this RouteGroupBuilder v1, RouteGroupBuilder admin)
    {
        // Public: an image never changes under its id, so browsers and the CDN may keep it for a year.
        v1.MapGet("/media/{id:guid}", async (Guid id, HttpContext http, IHandler<GetMedia, MediaContent> h, CancellationToken ct) =>
            {
                var result = await h.HandleAsync(new GetMedia(id), ct);
                if (!result.IsSuccess)
                    return result.ToHttp();
                http.Response.Headers.CacheControl = "public, max-age=31536000, immutable";
                return TypedResults.File(result.Value!.Data, result.Value.ContentType,
                    lastModified: result.Value.CreatedAt, entityTag: new EntityTagHeaderValue($"\"{id:N}\""));
            })
            .WithTags("Media")
            .Produces<FileContentHttpResult>(StatusCodes.Status200OK, "image/webp", "image/jpeg", "image/png", "image/avif")
            .ProducesProblem(StatusCodes.Status404NotFound);

        // Upload: multipart form with one "file". Bearer-token auth (no cookies), so no antiforgery token is needed.
        admin.MapPost("/media", async ([FromForm] IFormFile file, IHandler<UploadMedia, MediaDto> h, CancellationToken ct) =>
            {
                if (file.Length > MediaFile.MaxBytes)
                    return TypedResults.Problem($"Images can be at most {MediaFile.MaxBytes / 1024 / 1024} MB.", statusCode: StatusCodes.Status400BadRequest);
                using var buffer = new MemoryStream((int)file.Length);
                await file.CopyToAsync(buffer, ct);
                var result = await h.HandleAsync(new UploadMedia(file.FileName, buffer.ToArray()), ct);
                return result.ToHttp(media => TypedResults.Created(media.Url, media));
            })
            .WithTags("Admin: Media")
            .DisableAntiforgery()
            .WithMetadata(new RequestSizeLimitAttribute(MediaFile.MaxBytes + 64 * 1024))
            .Accepts<IFormFile>("multipart/form-data")
            .Produces<MediaDto>(StatusCodes.Status201Created).ProducesValidationProblem();
    }
}
