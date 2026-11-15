using KeroAmir.Application.Common.Abstractions;
using KeroAmir.Application.Common.Messaging;
using KeroAmir.Application.Common.Results;
using KeroAmir.Domain.Media;
using Microsoft.EntityFrameworkCore;

namespace KeroAmir.Application.Features.Media;

// ---- Contracts
/// <summary><see cref="Url"/> is the site path that serves the image (the web app streams it from the API).</summary>
public sealed record MediaDto(Guid Id, string Url, string ContentType, int Size);

public sealed record UploadMedia(string FileName, byte[] Data);
public sealed record GetMedia(Guid Id);
public sealed record MediaContent(byte[] Data, string ContentType, DateTimeOffset CreatedAt);

// ---- Handlers
internal sealed class MediaHandlers(IAppDbContext db) :
    IHandler<UploadMedia, MediaDto>,
    IHandler<GetMedia, MediaContent>
{
    public async Task<Result<MediaDto>> HandleAsync(UploadMedia request, CancellationToken ct)
    {
        if (request.Data.Length == 0)
            return Invalid("The file is empty.");
        if (request.Data.Length > MediaFile.MaxBytes)
            return Invalid($"Images can be at most {MediaFile.MaxBytes / 1024 / 1024} MB.");
        // The type comes from the bytes, not the file name or the browser's claim. SVG is not accepted: it can carry script.
        if (ImageType.Detect(request.Data) is not { } contentType)
            return Invalid("Upload a JPEG, PNG, WebP or AVIF image.");

        var file = new MediaFile
        {
            ContentType = contentType,
            FileName = Path.GetFileName(request.FileName) is { Length: > 0 } name ? name[..Math.Min(name.Length, 200)] : "image",
            Size = request.Data.Length,
            Data = request.Data,
        };
        db.MediaFiles.Add(file);
        await db.SaveChangesAsync(ct);
        return new MediaDto(file.Id, $"/media/{file.Id}", file.ContentType, file.Size);
    }

    public async Task<Result<MediaContent>> HandleAsync(GetMedia request, CancellationToken ct) =>
        await db.MediaFiles.AsNoTracking().Where(m => m.Id == request.Id)
            .Select(m => new MediaContent(m.Data, m.ContentType, m.CreatedAt)).SingleOrDefaultAsync(ct)
        ?? (Result<MediaContent>)Error.NotFound("Media", request.Id);

    private static Error Invalid(string message) =>
        Error.Validation(new Dictionary<string, string[]> { ["file"] = [message] });
}

/// <summary>Recognises the image formats we accept by their first bytes ("magic numbers").</summary>
public static class ImageType
{
    public static string? Detect(ReadOnlySpan<byte> data)
    {
        if (data.StartsWith((ReadOnlySpan<byte>)[0xFF, 0xD8, 0xFF]))
            return "image/jpeg";
        if (data.StartsWith((ReadOnlySpan<byte>)[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))
            return "image/png";
        if (data.Length >= 12 && data[..4].SequenceEqual("RIFF"u8) && data[8..12].SequenceEqual("WEBP"u8))
            return "image/webp";
        if (data.Length >= 12 && data[4..8].SequenceEqual("ftyp"u8) && (data[8..12].SequenceEqual("avif"u8) || data[8..12].SequenceEqual("avis"u8)))
            return "image/avif";
        return null;
    }
}
