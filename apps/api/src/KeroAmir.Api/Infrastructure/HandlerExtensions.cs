using KeroAmir.Application.Common.Messaging;

namespace KeroAmir.Api.Infrastructure;

public static class HandlerExtensions
{
    /// <summary>Runs a use case and maps its result: 200 with the value, or ProblemDetails.</summary>
    public static async Task<IResult> Ok<TRequest, TResponse>(
        this IHandler<TRequest, TResponse> handler, TRequest request, CancellationToken ct) =>
        (await handler.HandleAsync(request, ct)).ToHttp();

    /// <summary>Runs a use case and maps its result: 204, or ProblemDetails.</summary>
    public static async Task<IResult> NoContent<TRequest, TResponse>(
        this IHandler<TRequest, TResponse> handler, TRequest request, CancellationToken ct) =>
        (await handler.HandleAsync(request, ct)).ToHttp(_ => TypedResults.NoContent());

    /// <summary>Runs a create use case: 201 with a Location header, or ProblemDetails.</summary>
    public static async Task<IResult> Created<TRequest, TResponse>(
        this IHandler<TRequest, TResponse> handler, TRequest request, Func<TResponse, string> location, CancellationToken ct) =>
        (await handler.HandleAsync(request, ct)).ToHttp(value => TypedResults.Created(location(value), value));
}
