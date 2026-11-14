using KeroAmir.Infrastructure.Persistence;
using KeroAmir.Infrastructure.Persistence.Interceptors;
using KeroAmir.Infrastructure.Seeding;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace KeroAmir.Tests.Integration;

[Collection(ApiTestGroup.Name)]
public class SeedTests(ApiFixture api)
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Content_seed_fills_an_empty_database_once()
    {
        var connectionString = await api.CreateDatabaseAsync();
        await using var services = new ServiceCollection()
            .AddLogging()
            .AddSingleton(TimeProvider.System)
            .AddSingleton<AuditableEntityInterceptor>()
            .AddDbContext<AppDbContext>((sp, o) => o.UseSqlServer(connectionString)
                .AddInterceptors(sp.GetRequiredService<AuditableEntityInterceptor>()))
            .BuildServiceProvider();
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Seed:Content"] = "true" })
            .Build();

        await services.SeedContentAsync(config, Ct);
        await services.SeedContentAsync(config, Ct); // second run must not duplicate

        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(4, await db.Categories.CountAsync(Ct));
        Assert.Equal(8, await db.Tools.CountAsync(Ct));
        Assert.Equal(3, await db.SkillGroups.CountAsync(Ct));
        Assert.Equal(24, await db.Skills.CountAsync(Ct));
        Assert.Equal(3, await db.TimelineEntries.CountAsync(Ct));
        Assert.True(await db.SiteSettings.AnyAsync(s => s.Key == "heroStats", Ct));
        // Skills that name a tool are linked to it.
        Assert.Equal(14, await db.Skills.CountAsync(s => s.ToolId != null, Ct));
    }

    [Fact]
    public async Task Content_seed_is_off_by_default()
    {
        var connectionString = await api.CreateDatabaseAsync();
        await using var services = new ServiceCollection()
            .AddLogging()
            .AddDbContext<AppDbContext>(o => o.UseSqlServer(connectionString))
            .BuildServiceProvider();

        await services.SeedContentAsync(new ConfigurationBuilder().Build(), Ct);

        await using var scope = services.CreateAsyncScope();
        Assert.False(await scope.ServiceProvider.GetRequiredService<AppDbContext>().Categories.AnyAsync(Ct));
    }
}
