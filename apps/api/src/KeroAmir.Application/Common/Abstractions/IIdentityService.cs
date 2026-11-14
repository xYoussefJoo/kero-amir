namespace KeroAmir.Application.Common.Abstractions;

public enum PasswordCheckStatus
{
    Success,
    InvalidCredentials,
    LockedOut,
}

public sealed record PasswordCheck(PasswordCheckStatus Status, Guid UserId = default, bool RequiresTwoFactor = false);

public sealed record UserInfo(Guid Id, string Email, IReadOnlyList<string> Roles, bool TwoFactorEnabled);

/// <summary>User accounts, passwords, lockout and 2FA. Implemented with ASP.NET Core Identity in Infrastructure.</summary>
public interface IIdentityService
{
    /// <summary>Checks the password and counts failures toward lockout.</summary>
    Task<PasswordCheck> CheckPasswordAsync(string email, string password, CancellationToken ct);

    /// <summary>Checks an authenticator code; a wrong code counts toward lockout.</summary>
    Task<PasswordCheckStatus> CheckTwoFactorCodeAsync(Guid userId, string code, CancellationToken ct);

    Task<UserInfo?> FindByIdAsync(Guid userId, CancellationToken ct);

    /// <summary>Returns the authenticator key, creating one if the user has none yet.</summary>
    Task<string> GetOrCreateAuthenticatorKeyAsync(Guid userId, CancellationToken ct);

    /// <summary>Turns 2FA on or off; both require a valid current code. Returns false if the code is wrong.</summary>
    Task<bool> SetTwoFactorEnabledAsync(Guid userId, string code, bool enabled, CancellationToken ct);
}
