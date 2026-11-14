using KeroAmir.Application.Common.Results;

namespace KeroAmir.Application.Features.Auth;

internal static class AuthErrors
{
    // One message for unknown email and wrong password, so the login form doesn't reveal which emails exist.
    public static readonly Error InvalidCredentials =
        Error.Unauthorized("Auth.InvalidCredentials", "Invalid email or password.");

    public static readonly Error LockedOut =
        Error.Unauthorized("Auth.LockedOut", "Too many failed attempts. Try again in 15 minutes.");

    public static readonly Error InvalidCode =
        Error.Unauthorized("Auth.InvalidCode", "The code is wrong or has expired.");

    public static readonly Error InvalidChallenge =
        Error.Unauthorized("Auth.InvalidChallenge", "The sign-in step expired. Sign in again.");

    public static readonly Error InvalidRefreshToken =
        Error.Unauthorized("Auth.InvalidRefreshToken", "Your session has expired. Sign in again.");
}
