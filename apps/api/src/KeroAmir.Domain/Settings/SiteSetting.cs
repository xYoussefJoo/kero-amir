using KeroAmir.Domain.Common;

namespace KeroAmir.Domain.Settings;

/// <summary>
/// A key/value setting edited from the admin (hero text, stats, availability, socials...).
/// <see cref="Locale"/> is null for settings that are the same in every language.
/// </summary>
public class SiteSetting : BaseEntity
{
    public required string Key { get; set; }
    public string? Locale { get; set; }
    public required string ValueJson { get; set; }
}
