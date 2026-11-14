using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace KeroAmir.Infrastructure.Persistence;

public static class DatabaseMigrator
{
    /// <summary>
    /// Applies pending EF Core migrations when Database:MigrateOnStartup is true. Used on hosts where the database
    /// is only reachable from the web server (MonsterASP), so migrations can't run from the dev machine.
    /// Safe with one app instance; with several, migrate from a deploy step instead.
    /// </summary>
    public static async Task MigrateDatabaseAsync(this IServiceProvider services, IConfiguration configuration, CancellationToken ct = default)
    {
        if (!configuration.GetValue<bool>("Database:MigrateOnStartup"))
            return;

        using var scope = services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync(ct);
    }
}
