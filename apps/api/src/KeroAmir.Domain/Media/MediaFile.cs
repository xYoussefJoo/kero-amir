using KeroAmir.Domain.Common;

namespace KeroAmir.Domain.Media;

/// <summary>
/// An uploaded image (e.g. a project cover). Stored in the database, so it survives deploys and is backed up with
/// the content. Files are resized in the browser before upload, so they stay small.
/// </summary>
public class MediaFile : BaseEntity
{
    public const int MaxBytes = 3 * 1024 * 1024;

    public required string ContentType { get; set; }
    public required string FileName { get; set; }
    public int Size { get; set; }
    public required byte[] Data { get; set; }
}
