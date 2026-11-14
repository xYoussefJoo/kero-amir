using FluentValidation;
using KeroAmir.Application.Common.Messaging;
using KeroAmir.Application.Features.Auth;
using Microsoft.Extensions.DependencyInjection;

namespace KeroAmir.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = typeof(DependencyInjection).Assembly;

        // Every IHandler<,> implementation, registered by its interface.
        var handlers = assembly.GetTypes()
            .Where(t => t is { IsClass: true, IsAbstract: false })
            .SelectMany(t => t.GetInterfaces()
                .Where(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IHandler<,>))
                .Select(i => (Service: i, Implementation: t)));
        foreach (var (service, implementation) in handlers)
            services.AddScoped(service, implementation);

        services.AddScoped<TokenIssuer>();
        services.AddValidatorsFromAssembly(assembly, includeInternalTypes: true);
        return services;
    }
}
