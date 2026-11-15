using KeroAmir.Application.Common.Abstractions;
using Microsoft.AspNetCore.Identity;

namespace KeroAmir.Infrastructure.Identity;

public sealed class IdentityService(UserManager<AppUser> users) : IIdentityService
{
    public async Task<PasswordCheck> CheckPasswordAsync(string email, string password, CancellationToken ct)
    {
        var user = await users.FindByEmailAsync(email);
        if (user is null)
            return new PasswordCheck(PasswordCheckStatus.InvalidCredentials);

        if (await users.IsLockedOutAsync(user))
            return new PasswordCheck(PasswordCheckStatus.LockedOut);

        if (!await users.CheckPasswordAsync(user, password))
        {
            await users.AccessFailedAsync(user);
            return new PasswordCheck(await users.IsLockedOutAsync(user)
                ? PasswordCheckStatus.LockedOut
                : PasswordCheckStatus.InvalidCredentials);
        }

        // With 2FA on, the failure counter is reset only after the code step succeeds.
        if (user.TwoFactorEnabled)
            return new PasswordCheck(PasswordCheckStatus.Success, user.Id, RequiresTwoFactor: true);

        await users.ResetAccessFailedCountAsync(user);
        return new PasswordCheck(PasswordCheckStatus.Success, user.Id);
    }

    public async Task<PasswordCheckStatus> CheckTwoFactorCodeAsync(Guid userId, string code, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId.ToString());
        if (user is null || !user.TwoFactorEnabled)
            return PasswordCheckStatus.InvalidCredentials;

        if (await users.IsLockedOutAsync(user))
            return PasswordCheckStatus.LockedOut;

        // Six digits: the authenticator app. Anything else: a one-time recovery code (used up when it works).
        var valid = IsAuthenticatorCode(code)
            ? await users.VerifyTwoFactorTokenAsync(user, TokenOptions.DefaultAuthenticatorProvider, code)
            : (await users.RedeemTwoFactorRecoveryCodeAsync(user, NormalizeRecoveryCode(code))).Succeeded;
        if (!valid)
        {
            await users.AccessFailedAsync(user);
            return await users.IsLockedOutAsync(user) ? PasswordCheckStatus.LockedOut : PasswordCheckStatus.InvalidCredentials;
        }

        await users.ResetAccessFailedCountAsync(user);
        return PasswordCheckStatus.Success;
    }

    public async Task<UserInfo?> FindByIdAsync(Guid userId, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId.ToString());
        if (user is null)
            return null;

        var roles = await users.GetRolesAsync(user);
        return new UserInfo(user.Id, user.Email ?? "", [.. roles], user.TwoFactorEnabled,
            user.TwoFactorEnabled ? await users.CountRecoveryCodesAsync(user) : 0);
    }

    public async Task<string> GetOrCreateAuthenticatorKeyAsync(Guid userId, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId.ToString())
            ?? throw new InvalidOperationException($"User {userId} not found.");

        var key = await users.GetAuthenticatorKeyAsync(user);
        if (string.IsNullOrEmpty(key))
        {
            await users.ResetAuthenticatorKeyAsync(user);
            key = await users.GetAuthenticatorKeyAsync(user);
        }
        return key!;
    }

    public async Task<bool> SetTwoFactorEnabledAsync(Guid userId, string code, bool enabled, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId.ToString());
        if (user is null || !await users.VerifyTwoFactorTokenAsync(user, TokenOptions.DefaultAuthenticatorProvider, code))
            return false;

        await users.SetTwoFactorEnabledAsync(user, enabled);
        if (!enabled)
            await users.ResetAuthenticatorKeyAsync(user); // a later re-enable must scan a fresh key
        return true;
    }

    public async Task<IReadOnlyList<string>> NewRecoveryCodesAsync(Guid userId, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId.ToString())
            ?? throw new InvalidOperationException($"User {userId} not found.");
        return [.. await users.GenerateNewTwoFactorRecoveryCodesAsync(user, RecoveryCodeCount) ?? []];
    }

    public async Task<bool> VerifyAuthenticatorCodeAsync(Guid userId, string code, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId.ToString());
        return user is not null && await users.VerifyTwoFactorTokenAsync(user, TokenOptions.DefaultAuthenticatorProvider, code);
    }

    public async Task<PasswordChange> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId.ToString())
            ?? throw new InvalidOperationException($"User {userId} not found.");
        var result = await users.ChangePasswordAsync(user, currentPassword, newPassword);
        return new PasswordChange(result.Succeeded, [.. result.Errors.Select(e => e.Description)]);
    }

    private const int RecoveryCodeCount = 8;

    private static bool IsAuthenticatorCode(string code) => code.Length == 6 && code.All(char.IsAsciiDigit);

    /// <summary>People type recovery codes with spaces or in lower case; Identity stores them upper case, with the dash.</summary>
    private static string NormalizeRecoveryCode(string code) => code.Replace(" ", "", StringComparison.Ordinal).ToUpperInvariant();
}
