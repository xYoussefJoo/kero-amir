using KeroAmir.Application.Common.Abstractions;
using KeroAmir.Infrastructure.Persistence;
using KeroAmir.Infrastructure.Persistence.Interceptors;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace KeroAmir.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Sql");
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("ConnectionStrings:Sql is not configured.");

        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<AuditableEntityInterceptor>();
        services.AddDbContext<AppDbContext>((sp, options) => options
            .UseSqlServer(connectionString, sql => sql.EnableRetryOnFailure())
            .AddInterceptors(sp.GetRequiredService<AuditableEntityInterceptor>()));
        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());

        return services;
    }
}
