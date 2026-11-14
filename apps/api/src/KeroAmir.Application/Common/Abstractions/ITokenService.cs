namespace KeroAmir.Application.Common.Abstractions;

public sealed record AccessToken(string Token, DateTimeOffset ExpiresAt);

public sealed record NewRefreshToken(string Token, string Hash, DateTimeOffset ExpiresAt);

/// <summary>Creates and reads tokens. Implemented in Infrastructure (JWT signing, random generation, hashing).</summary>
public interface ITokenService
{
    AccessToken CreateAccessToken(UserInfo user);

    NewRefreshToken CreateRefreshToken();

    string HashRefreshToken(string token);

    /// <summary>A short-lived token proving the password step passed, exchanged for tokens with a 2FA code.</summary>
    string CreateTwoFactorChallenge(Guid userId);

    /// <summary>The user id inside a valid, unexpired challenge, or null.</summary>
    Task<Guid?> ReadTwoFactorChallengeAsync(string challenge);
}
