using System.ComponentModel.DataAnnotations;

namespace KeroAmir.Infrastructure.Identity;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    [Required] public string Issuer { get; set; } = "kero-amir-api";
    [Required] public string Audience { get; set; } = "kero-amir-web";

    /// <summary>HMAC-SHA256 key, at least 32 characters. Set via user-secrets or environment, never committed.</summary>
    [Required, MinLength(32)] public string SigningKey { get; set; } = "";

    [Range(1, 60)] public int AccessTokenMinutes { get; set; } = 15;
    [Range(1, 90)] public int RefreshTokenDays { get; set; } = 14;
    [Range(1, 15)] public int TwoFactorChallengeMinutes { get; set; } = 5;

    /// <summary>Audience of the 2FA challenge token, so it can never be used as an access token.</summary>
    public string TwoFactorAudience => Audience + ":2fa";
}
