using System.Security.Claims;
using KeroAmir.Api.Infrastructure;
using KeroAmir.Application.Common.Messaging;
using KeroAmir.Application.Features.Account;

namespace KeroAmir.Api.Endpoints;

public static class AccountEndpoints
{
    /// <summary>Signed-in Owner's own account: profile and 2FA. Mapped under /admin (Owner policy).</summary>
    public static IEndpointRouteBuilder MapAccountEndpoints(this IEndpointRouteBuilder admin)
    {
        var group = admin.MapGroup("/account").WithTags("Account");

        group.MapGet("/me", async (ClaimsPrincipal user, IHandler<MeRequest, MeResponse> handler, CancellationToken ct) =>
                (await handler.HandleAsync(new MeRequest(user.UserId()), ct)).ToHttp())
            .Produces<MeResponse>();

        group.MapPost("/2fa/setup", async (ClaimsPrincipal user,
                    IHandler<TwoFactorSetupRequest, TwoFactorSetupResponse> handler, CancellationToken ct) =>
                (await handler.HandleAsync(new TwoFactorSetupRequest(user.UserId()), ct)).ToHttp())
            .Produces<TwoFactorSetupResponse>();

        group.MapPost("/2fa/enable", (ClaimsPrincipal user, TwoFactorCodeBody body,
                    IHandler<SetTwoFactorRequest, bool> handler, CancellationToken ct) =>
                SetTwoFactor(user, body, enable: true, handler, ct))
            .Validate<TwoFactorCodeBody>()
            .Produces(StatusCodes.Status204NoContent);

        group.MapPost("/2fa/disable", (ClaimsPrincipal user, TwoFactorCodeBody body,
                    IHandler<SetTwoFactorRequest, bool> handler, CancellationToken ct) =>
                SetTwoFactor(user, body, enable: false, handler, ct))
            .Validate<TwoFactorCodeBody>()
            .Produces(StatusCodes.Status204NoContent);

        return admin;
    }

    private static async Task<IResult> SetTwoFactor(ClaimsPrincipal user, TwoFactorCodeBody body, bool enable,
        IHandler<SetTwoFactorRequest, bool> handler, CancellationToken ct) =>
        (await handler.HandleAsync(new SetTwoFactorRequest(user.UserId(), body.Code, enable), ct))
            .ToHttp(_ => TypedResults.NoContent());
}
