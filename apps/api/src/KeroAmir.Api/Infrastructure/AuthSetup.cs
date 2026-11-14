using System.Security.Claims;
using System.Threading.RateLimiting;
using KeroAmir.Domain.Auth;
using KeroAmir.Infrastructure.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace KeroAmir.Api.Infrastructure;

public static class AuthSetup
{
    public const string OwnerPolicy = "Owner";
    public const string AuthRateLimit = "auth";

    public static IServiceCollection AddApiAuth(this IServiceCollection services, IConfiguration configuration)
    {
        var jwt = configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(o =>
            {
                o.MapInboundClaims = false; // keep "sub" / "role" as issued
                o.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidIssuer = jwt.Issuer,
                    ValidAudience = jwt.Audience,
                    IssuerSigningKey = TokenService.KeyFrom(jwt),
                    NameClaimType = JwtRegisteredClaimNames.Sub,
                    RoleClaimType = "role",
                    ClockSkew = TimeSpan.FromSeconds(30),
                };
            });

        services.AddAuthorizationBuilder()
            .AddPolicy(OwnerPolicy, p => p.RequireAuthenticatedUser().RequireRole(Roles.Owner));

        // Brute-force guard on sign-in endpoints, per IP (account lockout covers per-account guessing).
        var authPerMinute = configuration.GetValue("RateLimits:AuthPerMinute", 10);
        services.AddRateLimiter(o =>
        {
            o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            o.AddPolicy(AuthRateLimit, http => RateLimitPartition.GetFixedWindowLimiter(
                http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = authPerMinute, Window = TimeSpan.FromMinutes(1) }));
        });

        return services;
    }

    /// <summary>The signed-in user's id from the access token's "sub" claim.</summary>
    public static Guid UserId(this ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirstValue(JwtRegisteredClaimNames.Sub)
                   ?? throw new InvalidOperationException("No sub claim on an authenticated user."));
}
