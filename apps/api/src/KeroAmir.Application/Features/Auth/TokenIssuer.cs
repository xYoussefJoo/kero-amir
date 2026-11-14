using KeroAmir.Application.Common.Abstractions;
using KeroAmir.Application.Common.Results;
using KeroAmir.Domain.Auth;

namespace KeroAmir.Application.Features.Auth;

/// <summary>Issues an access token + a refresh token and stores the refresh token's hash.</summary>
public sealed class TokenIssuer(IAppDbContext db, ITokenService tokens, IIdentityService identity)
{
    /// <param name="familyId">The rotation chain to continue, or null to start a new one (a fresh login).</param>
    public async Task<Result<AuthTokens>> IssueAsync(Guid userId, Guid? familyId, CancellationToken ct)
    {
        var user = await identity.FindByIdAsync(userId, ct);
        if (user is null)
            return AuthErrors.InvalidCredentials;

        var access = tokens.CreateAccessToken(user);
        var refresh = tokens.CreateRefreshToken();

        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId,
            TokenHash = refresh.Hash,
            FamilyId = familyId ?? Guid.CreateVersion7(),
            ExpiresAt = refresh.ExpiresAt,
        });
        await db.SaveChangesAsync(ct);

        return new AuthTokens(access.Token, access.ExpiresAt, refresh.Token, refresh.ExpiresAt);
    }
}
