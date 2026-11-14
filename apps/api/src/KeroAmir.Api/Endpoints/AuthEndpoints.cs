using KeroAmir.Api.Infrastructure;
using KeroAmir.Application.Common.Messaging;
using KeroAmir.Application.Features.Auth;

namespace KeroAmir.Api.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/auth").WithTags("Auth").RequireRateLimiting(AuthSetup.AuthRateLimit);

        group.MapPost("/login", async (LoginRequest body, IHandler<LoginRequest, LoginResponse> handler, CancellationToken ct) =>
                (await handler.HandleAsync(body, ct)).ToHttp())
            .Validate<LoginRequest>()
            .Produces<LoginResponse>()
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPost("/2fa", async (TwoFactorLoginRequest body, IHandler<TwoFactorLoginRequest, AuthTokens> handler, CancellationToken ct) =>
                (await handler.HandleAsync(body, ct)).ToHttp())
            .Validate<TwoFactorLoginRequest>()
            .Produces<AuthTokens>()
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPost("/refresh", async (RefreshRequest body, IHandler<RefreshRequest, AuthTokens> handler, CancellationToken ct) =>
                (await handler.HandleAsync(body, ct)).ToHttp())
            .Validate<RefreshRequest>()
            .Produces<AuthTokens>()
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPost("/logout", async (LogoutRequest body, IHandler<LogoutRequest, bool> handler, CancellationToken ct) =>
                (await handler.HandleAsync(body, ct)).ToHttp(_ => TypedResults.NoContent()))
            .Validate<LogoutRequest>()
            .Produces(StatusCodes.Status204NoContent);

        return app;
    }
}
