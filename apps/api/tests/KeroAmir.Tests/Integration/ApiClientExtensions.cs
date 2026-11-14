using System.Net.Http.Headers;
using System.Net.Http.Json;
using KeroAmir.Application.Features.Auth;

namespace KeroAmir.Tests.Integration;

public static class ApiClientExtensions
{
    /// <summary>A client signed in as the owner.</summary>
    public static async Task<HttpClient> CreateOwnerClientAsync(this ApiFixture api, CancellationToken ct)
    {
        var client = api.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/login",
            new LoginRequest(ApiFixture.OwnerEmail, ApiFixture.OwnerPassword), ct);
        response.EnsureSuccessStatusCode();
        var login = await response.Content.ReadFromJsonAsync<LoginResponse>(ct);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", login!.Tokens!.AccessToken);
        return client;
    }
}
