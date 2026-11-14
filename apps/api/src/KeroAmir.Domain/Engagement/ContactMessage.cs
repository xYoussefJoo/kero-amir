using KeroAmir.Domain.Common;

namespace KeroAmir.Domain.Engagement;

public enum InboxStatus
{
    New,
    Read,
    Replied,
    Archived,
}

/// <summary>A project enquiry from the contact form. Lands in Kero's admin inbox.</summary>
public class ContactMessage : BaseEntity
{
    public required string Name { get; set; }
    public required string Email { get; set; }
    public string? Company { get; set; }

    /// <summary>What they need, e.g. "brand-identity" (a category slug or "other").</summary>
    public string? Service { get; set; }

    /// <summary>Budget band as chosen in the form, e.g. "1k-3k".</summary>
    public string? Budget { get; set; }

    public required string Message { get; set; }
    public required string Locale { get; set; }
    public InboxStatus Status { get; set; } = InboxStatus.New;
    public string? IpHash { get; set; }
}
