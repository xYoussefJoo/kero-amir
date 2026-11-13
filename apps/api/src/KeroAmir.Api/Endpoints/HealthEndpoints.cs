using KeroAmir.Infrastructure.Persistence;

namespace KeroAmir.Api.Endpoints;

public static class HealthEndpoints
{
    public static IEndpointRouteBuilder MapHealthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/health").WithTags("Health");

        // The process is up (liveness probe).
        group.MapGet("/live", () => TypedResults.Ok(new { status = "ok" }));

        // The process can reach the database (readiness probe).
        group.MapGet("/ready", async Task<IResult> (AppDbContext db, CancellationToken ct) =>
            await db.Database.CanConnectAsync(ct)
                ? TypedResults.Ok(new { status = "ok" })
                : TypedResults.Problem("Database unreachable", statusCode: StatusCodes.Status503ServiceUnavailable));

        return app;
    }
}
