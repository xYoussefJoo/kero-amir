using KeroAmir.Application.Common.Abstractions;
using KeroAmir.Application.Common.Messaging;
using KeroAmir.Application.Common.Results;
using Microsoft.EntityFrameworkCore;

namespace KeroAmir.Application.Features.Auth;

internal sealed class LoginHandler(IIdentityService identity, ITokenService tokens, TokenIssuer issuer)
    : IHandler<LoginRequest, LoginResponse>
{
    public async Task<Result<LoginResponse>> HandleAsync(LoginRequest request, CancellationToken ct)
    {
        var check = await identity.CheckPasswordAsync(request.Email, request.Password, ct);
        switch (check.Status)
        {
            case PasswordCheckStatus.LockedOut:
                return AuthErrors.LockedOut;
            case PasswordCheckStatus.InvalidCredentials:
                return AuthErrors.InvalidCredentials;
        }

        if (check.RequiresTwoFactor)
            return new LoginResponse(true, tokens.CreateTwoFactorChallenge(check.UserId), null);

        var issued = await issuer.IssueAsync(check.UserId, familyId: null, ct);
        return issued.IsSuccess ? new LoginResponse(false, null, issued.Value) : issued.Error!;
    }
}

internal sealed class TwoFactorLoginHandler(IIdentityService identity, ITokenService tokens, TokenIssuer issuer)
    : IHandler<TwoFactorLoginRequest, AuthTokens>
{
    public async Task<Result<AuthTokens>> HandleAsync(TwoFactorLoginRequest request, CancellationToken ct)
    {
        var userId = await tokens.ReadTwoFactorChallengeAsync(request.ChallengeToken);
        if (userId is null)
            return AuthErrors.InvalidChallenge;

        return await identity.CheckTwoFactorCodeAsync(userId.Value, request.Code, ct) switch
        {
            PasswordCheckStatus.Success => await issuer.IssueAsync(userId.Value, familyId: null, ct),
            PasswordCheckStatus.LockedOut => AuthErrors.LockedOut,
            _ => AuthErrors.InvalidCode,
        };
    }
}

internal sealed class RefreshHandler(IAppDbContext db, ITokenService tokens, TokenIssuer issuer, TimeProvider clock)
    : IHandler<RefreshRequest, AuthTokens>
{
    public async Task<Result<AuthTokens>> HandleAsync(RefreshRequest request, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var hash = tokens.HashRefreshToken(request.RefreshToken);
        var current = await db.RefreshTokens.SingleOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (current is null)
            return AuthErrors.InvalidRefreshToken;

        if (current.RevokedAt is not null)
        {
            // A used token came back: someone replayed it. End every session in this chain.
            await db.RefreshTokens
                .Where(t => t.FamilyId == current.FamilyId && t.RevokedAt == null)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, now), ct);
            return AuthErrors.InvalidRefreshToken;
        }

        if (!current.IsActive(now))
            return AuthErrors.InvalidRefreshToken;

        current.RevokedAt = now;
        return await issuer.IssueAsync(current.UserId, current.FamilyId, ct);
    }
}

internal sealed class LogoutHandler(IAppDbContext db, ITokenService tokens, TimeProvider clock)
    : IHandler<LogoutRequest, bool>
{
    public async Task<Result<bool>> HandleAsync(LogoutRequest request, CancellationToken ct)
    {
        var hash = tokens.HashRefreshToken(request.RefreshToken);
        var current = await db.RefreshTokens.SingleOrDefaultAsync(t => t.TokenHash == hash, ct);

        // Logging out ends the whole chain. Unknown tokens succeed too: logout is idempotent.
        if (current is not null)
        {
            await db.RefreshTokens
                .Where(t => t.FamilyId == current.FamilyId && t.RevokedAt == null)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, clock.GetUtcNow()), ct);
        }
        return true;
    }
}
