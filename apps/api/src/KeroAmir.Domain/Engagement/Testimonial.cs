using KeroAmir.Domain.Common;

namespace KeroAmir.Domain.Engagement;

public enum ModerationStatus
{
    Pending,
    Approved,
    Rejected,
}

/// <summary>A review left by a client. Visitors submit; it shows on the site only after Kero approves it.</summary>
public class Testimonial : BaseEntity
{
    public const int MinRating = 1;
    public const int MaxRating = 5;

    public required string AuthorName { get; set; }
    public string? Role { get; set; }
    public string? Company { get; set; }

    /// <summary>ISO 3166 alpha-2, shown as a flag.</summary>
    public string? CountryCode { get; set; }

    public int Rating { get; set; }
    public required string Text { get; set; }

    /// <summary>Language the review was written in (shown as-is; reviews aren't translated).</summary>
    public required string Locale { get; set; }

    public ModerationStatus Status { get; set; } = ModerationStatus.Pending;
    public bool IsFeatured { get; set; }

    /// <summary>SHA-256 of the submitter's IP, for abuse handling without storing the IP itself.</summary>
    public string? IpHash { get; set; }
}
