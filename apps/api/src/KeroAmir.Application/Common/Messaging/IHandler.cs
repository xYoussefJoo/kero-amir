using KeroAmir.Application.Common.Results;

namespace KeroAmir.Application.Common.Messaging;

/// <summary>
/// One use case. Handlers are plain classes found by assembly scan and injected into endpoints (no mediator).
/// Request validation runs before the handler (see the Api's validation filter).
/// </summary>
public interface IHandler<in TRequest, TResponse>
{
    Task<Result<TResponse>> HandleAsync(TRequest request, CancellationToken ct);
}
