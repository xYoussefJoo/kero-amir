using KeroAmir.Api.Endpoints;
using KeroAmir.Api.Infrastructure;
using KeroAmir.Application;
using KeroAmir.Infrastructure;
using KeroAmir.Infrastructure.Identity;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails();
builder.Services.AddOpenApi("v1");
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddApiAuth(builder.Configuration);

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapOpenApi("/openapi/{documentName}.json");

var v1 = app.MapGroup("/api/v1");
v1.MapHealthEndpoints();
v1.MapAuthEndpoints();

var admin = v1.MapGroup("/admin").RequireAuthorization(AuthSetup.OwnerPolicy);
admin.MapAccountEndpoints();

await app.Services.SeedOwnerAsync(app.Configuration);
await app.RunAsync();

// Exposed for WebApplicationFactory in the tests.
public partial class Program;
