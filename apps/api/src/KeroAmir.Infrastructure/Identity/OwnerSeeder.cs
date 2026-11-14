using KeroAmir.Domain.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace KeroAmir.Infrastructure.Identity;

/// <summary>
/// Creates the Owner role and Kero's account on startup when Seed:OwnerEmail and Seed:OwnerPassword are set
/// (user-secrets or environment). Safe to run every time: existing accounts are left alone.
/// </summary>
public static partial class OwnerSeeder
{
    public static async Task SeedOwnerAsync(this IServiceProvider services, IConfiguration configuration)
    {
        var email = configuration["Seed:OwnerEmail"];
        var password = configuration["Seed:OwnerPassword"];
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            return;

        using var scope = services.CreateScope();
        var roles = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger(typeof(OwnerSeeder));

        if (!await roles.RoleExistsAsync(Roles.Owner))
            await roles.CreateAsync(new IdentityRole<Guid>(Roles.Owner));

        if (await users.FindByEmailAsync(email) is not null)
            return;

        var owner = new AppUser { UserName = email, Email = email, EmailConfirmed = true };
        var result = await users.CreateAsync(owner, password);
        if (!result.Succeeded)
            throw new InvalidOperationException(
                "Could not create the owner account: " + string.Join("; ", result.Errors.Select(e => e.Description)));

        await users.AddToRoleAsync(owner, Roles.Owner);
        LogOwnerCreated(logger, email);
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Created owner account {Email}")]
    private static partial void LogOwnerCreated(ILogger logger, string email);
}
