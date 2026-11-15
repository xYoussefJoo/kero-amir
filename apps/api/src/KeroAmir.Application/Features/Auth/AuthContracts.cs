using FluentValidation;

namespace KeroAmir.Application.Features.Auth;

public sealed record AuthTokens(
    string AccessToken,
    DateTimeOffset AccessTokenExpiresAt,
    string RefreshToken,
    DateTimeOffset RefreshTokenExpiresAt);

/// <summary>Either tokens, or (when 2FA is on) a challenge to send back with the code.</summary>
public sealed record LoginResponse(bool RequiresTwoFactor, string? ChallengeToken, AuthTokens? Tokens);

public sealed record LoginRequest(string Email, string Password);

public sealed record TwoFactorLoginRequest(string ChallengeToken, string Code);

public sealed record RefreshRequest(string RefreshToken);

public sealed record LogoutRequest(string RefreshToken);

internal sealed class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(x => x.Password).NotEmpty().MaximumLength(256);
    }
}

internal sealed class TwoFactorLoginRequestValidator : AbstractValidator<TwoFactorLoginRequest>
{
    public TwoFactorLoginRequestValidator()
    {
        RuleFor(x => x.ChallengeToken).NotEmpty().MaximumLength(4096);
        // The 6-digit authenticator code, or a recovery code like AB12C-D34EF.
        RuleFor(x => x.Code).NotEmpty().Matches("^([0-9]{6}|[A-Za-z0-9]{5}-?[A-Za-z0-9]{5})$")
            .WithMessage("Enter the 6-digit code or a recovery code.");
    }
}

internal sealed class RefreshRequestValidator : AbstractValidator<RefreshRequest>
{
    public RefreshRequestValidator() => RuleFor(x => x.RefreshToken).NotEmpty().MaximumLength(512);
}

internal sealed class LogoutRequestValidator : AbstractValidator<LogoutRequest>
{
    public LogoutRequestValidator() => RuleFor(x => x.RefreshToken).NotEmpty().MaximumLength(512);
}
