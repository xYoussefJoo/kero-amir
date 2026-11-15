namespace KeroAmir.Infrastructure.Email;

/// <summary>
/// Alert emails through Resend (resend.com). Without <see cref="ResendApiKey"/> alerts are only logged.
/// <see cref="From"/> must be on a domain verified in Resend; before that, Resend's test sender
/// "onboarding@resend.dev" can send to the Resend account's own address.
/// </summary>
public sealed class EmailOptions
{
    public const string SectionName = "Email";

    public string? ResendApiKey { get; set; }
    public string From { get; set; } = "Kero Amir website <onboarding@resend.dev>";
    /// <summary>Where alerts go (Kero's inbox).</summary>
    public string? To { get; set; }
    /// <summary>Added under every alert, e.g. https://keroamir.com/admin.</summary>
    public string? DashboardUrl { get; set; }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ResendApiKey) && !string.IsNullOrWhiteSpace(To);
}
