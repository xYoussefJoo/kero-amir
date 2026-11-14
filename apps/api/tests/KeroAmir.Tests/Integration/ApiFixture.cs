using KeroAmir.Infrastructure.Identity;
using KeroAmir.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.MsSql;

namespace KeroAmir.Tests.Integration;

/// <summary>
/// The real API on a real, throwaway SQL Server database.
/// Set KEROAMIR_TEST_SQL_SERVER (e.g. "Server=.;Trusted_Connection=True;TrustServerCertificate=True") to use a local
/// instance; otherwise a SQL Server container is started (needs Docker, which CI has).
/// </summary>
public sealed class ApiFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
    public const string OwnerEmail = "owner@test.local";
    public const string OwnerPassword = "correct-horse-battery";

    private MsSqlContainer? _container;
    private string _connectionString = "";

    public async ValueTask InitializeAsync()
    {
        var server = Environment.GetEnvironmentVariable("KEROAMIR_TEST_SQL_SERVER");
        if (string.IsNullOrWhiteSpace(server))
        {
            _container = new MsSqlBuilder("mcr.microsoft.com/mssql/server:2022-latest").Build();
            await _container.StartAsync();
            server = _container.GetConnectionString();
        }

        _server = server;
        _connectionString = await CreateDatabaseAsync();
    }

    private string _server = "";
    private readonly List<string> _extraDatabases = [];

    /// <summary>A new, migrated, empty database on the same server. Dropped when the fixture is disposed.</summary>
    public async Task<string> CreateDatabaseAsync()
    {
        var connectionString = new SqlConnectionStringBuilder(_server)
        {
            InitialCatalog = $"KeroAmir_Tests_{Guid.NewGuid():N}",
        }.ConnectionString;

        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer(connectionString).Options);
        await db.Database.MigrateAsync();

        if (_connectionString.Length > 0)
            _extraDatabases.Add(connectionString);
        return connectionString;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:Sql", _connectionString);
        builder.UseSetting("Jwt:SigningKey", "test-signing-key-that-is-at-least-32-chars");
        builder.UseSetting("Seed:OwnerEmail", OwnerEmail);
        builder.UseSetting("Seed:OwnerPassword", OwnerPassword);
        builder.UseSetting("RateLimits:AuthPerMinute", "1000");
    }

    /// <summary>Creates an extra account (no role) so destructive tests don't touch the owner.</summary>
    public async Task<(string Email, string Password)> CreateUserAsync()
    {
        using var scope = Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var email = $"user-{Guid.NewGuid():N}@test.local";
        const string password = "another-long-password";
        var result = await users.CreateAsync(new AppUser { UserName = email, Email = email }, password);
        Assert.True(result.Succeeded);
        return (email, password);
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();

        if (_container is not null)
        {
            await _container.DisposeAsync();
            return;
        }

        // Local instance: drop the throwaway databases.
        foreach (var connectionString in _extraDatabases.Append(_connectionString))
        {
            await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
                .UseSqlServer(connectionString).Options);
            await db.Database.EnsureDeletedAsync();
        }
    }
}

[CollectionDefinition(Name)]
public sealed class ApiTestGroup : ICollectionFixture<ApiFixture>
{
    public const string Name = "api";
}
