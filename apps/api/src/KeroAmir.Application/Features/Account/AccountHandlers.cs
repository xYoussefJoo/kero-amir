using FluentValidation;
using KeroAmir.Application.Common.Abstractions;
using KeroAmir.Application.Common.Messaging;
using KeroAmir.Application.Common.Results;
using Microsoft.EntityFrameworkCore;

namespace KeroAmir.Application.Features.Account;

public sealed record MeRequest(Guid UserId);

public sealed record MeResponse(Guid Id, string Email, IReadOnlyList<string> Roles, bool TwoFactorEnabled, int RecoveryCodesLeft);

public sealed record TwoFactorSetupRequest(Guid UserId);

/// <summary><see cref="AuthenticatorUri"/> is what the QR code encodes; <see cref="SharedKey"/> is for manual entry.</summary>
public sealed record TwoFactorSetupResponse(string SharedKey, string AuthenticatorUri);

public sealed record TwoFactorCodeBody(string Code);

public sealed record SetTwoFactorRequest(Guid UserId, string Code, bool Enable);

/// <summary>One-time backup codes for signing in without the phone. Shown once; only hashes are kept.</summary>
public sealed record RecoveryCodesResponse(IReadOnlyList<string> Codes);

public sealed record EnableTwoFactorRequest(Guid UserId, string Code);
public sealed record NewRecoveryCodesRequest(Guid UserId, string Code);

public sealed record ChangePasswordBody(string CurrentPassword, string NewPassword);
public sealed record ChangePasswordRequest(Guid UserId, string CurrentPassword, string NewPassword);

internal sealed class TwoFactorCodeBodyValidator : AbstractValidator<TwoFactorCodeBody>
{
    public TwoFactorCodeBodyValidator() =>
        RuleFor(x => x.Code).NotEmpty().Matches("^[0-9]{6}$").WithMessage("Enter the 6-digit code.");
}

internal sealed class ChangePasswordBodyValidator : AbstractValidator<ChangePasswordBody>
{
    public ChangePasswordBodyValidator()
    {
        RuleFor(x => x.CurrentPassword).NotEmpty().MaximumLength(200);
        RuleFor(x => x.NewPassword).NotEmpty().MinimumLength(12).WithMessage("Use at least 12 characters.").MaximumLength(200)
            .NotEqual(x => x.CurrentPassword).WithMessage("Choose a password you haven't used here.");
    }
}

internal sealed class MeHandler(IIdentityService identity) : IHandler<MeRequest, MeResponse>
{
    public async Task<Result<MeResponse>> HandleAsync(MeRequest request, CancellationToken ct)
    {
        var user = await identity.FindByIdAsync(request.UserId, ct);
        return user is null
            ? Error.NotFound("User", request.UserId)
            : new MeResponse(user.Id, user.Email, user.Roles, user.TwoFactorEnabled, user.RecoveryCodesLeft);
    }
}

internal sealed class TwoFactorSetupHandler(IIdentityService identity) : IHandler<TwoFactorSetupRequest, TwoFactorSetupResponse>
{
    private const string Issuer = "Kero Amir";

    public async Task<Result<TwoFactorSetupResponse>> HandleAsync(TwoFactorSetupRequest request, CancellationToken ct)
    {
        var user = await identity.FindByIdAsync(request.UserId, ct);
        if (user is null)
            return Error.NotFound("User", request.UserId);

        var key = await identity.GetOrCreateAuthenticatorKeyAsync(user.Id, ct);
        var label = Uri.EscapeDataString($"{Issuer}:{user.Email}");
        var uri = $"otpauth://totp/{label}?secret={key}&issuer={Uri.EscapeDataString(Issuer)}&digits=6";
        return new TwoFactorSetupResponse(key, uri);
    }
}

internal sealed class SetTwoFactorHandler(IIdentityService identity) : IHandler<SetTwoFactorRequest, bool>
{
    public async Task<Result<bool>> HandleAsync(SetTwoFactorRequest request, CancellationToken ct) =>
        await identity.SetTwoFactorEnabledAsync(request.UserId, request.Code, request.Enable, ct)
            ? request.Enable
            : AccountErrors.WrongCode;
}

/// <summary>Turns 2FA on (the code proves the app is set up) and hands out the first recovery codes.</summary>
internal sealed class EnableTwoFactorHandler(IIdentityService identity) : IHandler<EnableTwoFactorRequest, RecoveryCodesResponse>
{
    public async Task<Result<RecoveryCodesResponse>> HandleAsync(EnableTwoFactorRequest request, CancellationToken ct)
    {
        if (!await identity.SetTwoFactorEnabledAsync(request.UserId, request.Code, enabled: true, ct))
            return AccountErrors.WrongCode;
        return new RecoveryCodesResponse(await identity.NewRecoveryCodesAsync(request.UserId, ct));
    }
}

/// <summary>A fresh set of recovery codes (the old set stops working). Needs a current authenticator code.</summary>
internal sealed class NewRecoveryCodesHandler(IIdentityService identity) : IHandler<NewRecoveryCodesRequest, RecoveryCodesResponse>
{
    public async Task<Result<RecoveryCodesResponse>> HandleAsync(NewRecoveryCodesRequest request, CancellationToken ct)
    {
        var user = await identity.FindByIdAsync(request.UserId, ct);
        if (user is null || !user.TwoFactorEnabled)
            return Error.Validation(new Dictionary<string, string[]> { ["code"] = ["Turn on two-factor sign-in first."] });
        if (!await identity.VerifyAuthenticatorCodeAsync(request.UserId, request.Code, ct))
            return AccountErrors.WrongCode;
        return new RecoveryCodesResponse(await identity.NewRecoveryCodesAsync(request.UserId, ct));
    }
}

/// <summary>Changes the password and ends every session (all refresh tokens), so a leaked password stops working everywhere.</summary>
internal sealed class ChangePasswordHandler(IIdentityService identity, IAppDbContext db, TimeProvider clock)
    : IHandler<ChangePasswordRequest, bool>
{
    public async Task<Result<bool>> HandleAsync(ChangePasswordRequest request, CancellationToken ct)
    {
        var change = await identity.ChangePasswordAsync(request.UserId, request.CurrentPassword, request.NewPassword, ct);
        if (!change.Succeeded)
            return Error.Validation(new Dictionary<string, string[]> { ["password"] = [.. change.Errors] });

        await db.RefreshTokens.Where(t => t.UserId == request.UserId && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, clock.GetUtcNow()), ct);
        return true;
    }
}

internal static class AccountErrors
{
    public static Error WrongCode => Error.Validation(new Dictionary<string, string[]> { ["code"] = ["The code is wrong or has expired."] });
}
