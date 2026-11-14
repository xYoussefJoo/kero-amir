using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.OutputCaching;

namespace KeroAmir.Api.Infrastructure;

/// <summary>
/// Public content reads are cached in memory per locale and tagged by feature. Admin writes evict their tag,
/// so the next read rebuilds from the database. No Redis: one API instance, small data (see decisions).
/// </summary>
public static class ContentCache
{
    public const string Settings = "settings";
    public const string Categories = "categories";
    public const string Tools = "tools";
    public const string Skills = "skills";
    public const string Timeline = "timeline";

    private static readonly TimeSpan Lifetime = TimeSpan.FromHours(1);

    /// <summary>Caches a public GET, varying by ?locale.</summary>
    public static RouteHandlerBuilder CachedAs(this RouteHandlerBuilder builder, string tag) =>
        builder.CacheOutput(p => p.Expire(Lifetime).SetVaryByQuery("locale").Tag(tag));

    /// <summary>After a successful (2xx) write, evicts the given cache tags.</summary>
    public static TBuilder Evicts<TBuilder>(this TBuilder builder, params string[] tags)
        where TBuilder : IEndpointConventionBuilder =>
        builder.AddEndpointFilter(async (context, next) =>
        {
            var result = await next(context);
            if (result is IStatusCodeHttpResult { StatusCode: >= 200 and < 300 })
            {
                var store = context.HttpContext.RequestServices.GetRequiredService<IOutputCacheStore>();
                foreach (var tag in tags)
                    await store.EvictByTagAsync(tag, context.HttpContext.RequestAborted);
            }
            return result;
        });
}
