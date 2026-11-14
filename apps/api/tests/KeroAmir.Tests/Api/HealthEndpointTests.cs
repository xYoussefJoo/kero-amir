using System.Net;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace KeroAmir.Tests.Api;

public class HealthEndpointTests(HealthEndpointTests.ApiFactory factory) : IClassFixture<HealthEndpointTests.ApiFactory>
{
    public sealed class ApiFactory : WebApplicationFactory<Program>
    {
        // A connection string is required at startup; these tests never open it.
        protected override void ConfigureWebHost(IWebHostBuilder builder) =>
            builder
                .UseSetting("ConnectionStrings:Sql", "Server=unused;Database=unused")
                .UseSetting("Jwt:SigningKey", "test-signing-key-that-is-at-least-32-chars");
    }

    [Fact]
    public async Task Live_returns_ok()
    {
        var response = await factory.CreateClient().GetAsync("/api/v1/health/live", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task OpenApi_document_is_served()
    {
        var response = await factory.CreateClient().GetAsync("/openapi/v1.json", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Unknown_route_returns_problem_details()
    {
        var response = await factory.CreateClient().GetAsync("/api/v1/nope", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }
}
