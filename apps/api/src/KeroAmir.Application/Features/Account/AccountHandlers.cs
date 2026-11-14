using FluentValidation;
using KeroAmir.Application.Common.Abstractions;
using KeroAmir.Application.Common.Messaging;
using KeroAmir.Application.Common.Results;

namespace KeroAmir.Application.Features.Account;

public sealed record MeRequest(Guid UserId);

public sealed record MeResponse(Guid Id, string Email, IReadOnlyList<string> Roles, bool TwoFactorEnabled);

public sealed record TwoFactorSetupRequest(Guid UserId);

/// <summary><see cref="AuthenticatorUri"/> is what the QR code encodes; <see cref="SharedKey"/> is for manual entry.</summary>
public sealed record TwoFactorSetupResponse(string SharedKey, string AuthenticatorUri);

public sealed record TwoFactorCodeBody(string Code);

public sealed record SetTwoFactorRequest(Guid UserId, string Code, bool Enable);

internal sealed class TwoFactorCodeBodyValidator : AbstractValidator<TwoFactorCodeBody>
{
    public TwoFactorCodeBodyValidator() =>
        RuleFor(x => x.Code).NotEmpty().Matches("^[0-9]{6}$").WithMessage("Enter the 6-digit code.");
}

internal sealed class MeHandler(IIdentityService identity) : IHandler<MeRequest, MeResponse>
{
    public async Task<Result<MeResponse>> HandleAsync(MeRequest request, CancellationToken ct)
    {
        var user = await identity.FindByIdAsync(request.UserId, ct);
        return user is null
            ? Error.NotFound("User", request.UserId)
            : new MeResponse(user.Id, user.Email, user.Roles, user.TwoFactorEnabled);
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
            : Error.Validation(new Dictionary<string, string[]> { ["code"] = ["The code is wrong or has expired."] });
}
