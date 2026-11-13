using KeroAmir.Api.Endpoints;
using KeroAmir.Application;
using KeroAmir.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails();
builder.Services.AddOpenApi("v1");
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();

app.MapOpenApi("/openapi/{documentName}.json");

var v1 = app.MapGroup("/api/v1");
v1.MapHealthEndpoints();

app.Run();

// Exposed for WebApplicationFactory in the tests.
public partial class Program;
