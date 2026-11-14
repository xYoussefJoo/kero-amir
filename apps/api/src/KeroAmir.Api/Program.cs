using System.IO.Compression;
using System.Text.Json.Serialization;
using KeroAmir.Api.Endpoints;
using KeroAmir.Api.Infrastructure;
using KeroAmir.Application;
using KeroAmir.Infrastructure;
using KeroAmir.Infrastructure.Identity;
using KeroAmir.Infrastructure.Persistence;
using KeroAmir.Infrastructure.Seeding;
using Microsoft.AspNetCore.ResponseCompression;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails();
builder.Services.ConfigureHttpJsonOptions(o => o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddOpenApi("v1");
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddApiAuth(builder.Configuration);
builder.Services.AddOutputCache();
builder.Services.AddResponseCompression(o =>
{
    // BREACH needs a secret and attacker-reflected input in one compressed body; token responses reflect no input.
    o.EnableForHttps = true;
    o.Providers.Add<BrotliCompressionProvider>();
    o.Providers.Add<GzipCompressionProvider>();
});
builder.Services.Configure<BrotliCompressionProviderOptions>(o => o.Level = CompressionLevel.Fastest);

var app = builder.Build();

app.UseResponseCompression();
app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.UseOutputCache();

app.MapOpenApi("/openapi/{documentName}.json");

var v1 = app.MapGroup("/api/v1");
var admin = v1.MapGroup("/admin").RequireAuthorization(AuthSetup.OwnerPolicy);

v1.MapHealthEndpoints();
v1.MapAuthEndpoints();
admin.MapAccountEndpoints();
v1.MapSettingEndpoints(admin);
v1.MapCategoryEndpoints(admin);
v1.MapToolEndpoints(admin);
v1.MapSkillEndpoints(admin);
v1.MapTimelineEndpoints(admin);

await app.Services.MigrateDatabaseAsync(app.Configuration);
await app.Services.SeedOwnerAsync(app.Configuration);
await app.Services.SeedContentAsync(app.Configuration);

// Deploy step: seed the target database from the deploying machine, then stop (see deploy/deploy.ps1).
if (args.Contains("--seed-and-exit"))
    return;

await app.RunAsync();

// Exposed for WebApplicationFactory in the tests.
public partial class Program;
