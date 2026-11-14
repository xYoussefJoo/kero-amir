using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using KeroAmir.Application.Common.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace KeroAmir.Infrastructure.Identity;

public sealed class TokenService(IOptions<JwtOptions> options, TimeProvider clock) : ITokenService
{
    private readonly JwtOptions _options = options.Value;
    private readonly JsonWebTokenHandler _handler = new();

    public static SymmetricSecurityKey KeyFrom(JwtOptions options) => new(Encoding.UTF8.GetBytes(options.SigningKey));

    public AccessToken CreateAccessToken(UserInfo user)
    {
        var expires = clock.GetUtcNow().AddMinutes(_options.AccessTokenMinutes);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };
        claims.AddRange(user.Roles.Select(r => new Claim("role", r)));

        return new AccessToken(Create(claims, _options.Audience, expires), expires);
    }

    public NewRefreshToken CreateRefreshToken()
    {
        // 256 bits of randomness; opaque to the client, only its hash is stored.
        var token = Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(32));
        return new NewRefreshToken(token, HashRefreshToken(token), clock.GetUtcNow().AddDays(_options.RefreshTokenDays));
    }

    public string HashRefreshToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    public string CreateTwoFactorChallenge(Guid userId) =>
        Create([new Claim(JwtRegisteredClaimNames.Sub, userId.ToString())],
            _options.TwoFactorAudience, clock.GetUtcNow().AddMinutes(_options.TwoFactorChallengeMinutes));

    public async Task<Guid?> ReadTwoFactorChallengeAsync(string challenge)
    {
        var result = await _handler.ValidateTokenAsync(challenge, new TokenValidationParameters
        {
            ValidIssuer = _options.Issuer,
            ValidAudience = _options.TwoFactorAudience,
            IssuerSigningKey = KeyFrom(_options),
            ClockSkew = TimeSpan.Zero,
            LifetimeValidator = (_, expires, _, _) => expires > clock.GetUtcNow().UtcDateTime,
        });

        return result.IsValid
               && result.Claims.TryGetValue(JwtRegisteredClaimNames.Sub, out var sub)
               && Guid.TryParse(sub as string, out var userId)
            ? userId
            : null;
    }

    private string Create(IEnumerable<Claim> claims, string audience, DateTimeOffset expires) =>
        _handler.CreateToken(new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Issuer = _options.Issuer,
            Audience = audience,
            IssuedAt = clock.GetUtcNow().UtcDateTime,
            NotBefore = clock.GetUtcNow().UtcDateTime,
            Expires = expires.UtcDateTime,
            SigningCredentials = new SigningCredentials(KeyFrom(_options), SecurityAlgorithms.HmacSha256),
        });
}
