using KeroAmir.Api.Infrastructure;
using KeroAmir.Application.Common.Messaging;
using KeroAmir.Application.Features.Dashboard;

namespace KeroAmir.Api.Endpoints;

public static class DashboardEndpoints
{
    /// <summary>The admin home: counts and the latest items to act on. Mapped under /admin (Owner policy).</summary>
    public static IEndpointRouteBuilder MapDashboardEndpoints(this IEndpointRouteBuilder admin)
    {
        admin.MapGet("/overview", async (IHandler<GetDashboardOverview, DashboardOverview> handler, CancellationToken ct) =>
                (await handler.HandleAsync(new GetDashboardOverview(), ct)).ToHttp())
            .WithTags("Admin: Dashboard")
            .Produces<DashboardOverview>();
        return admin;
    }
}
