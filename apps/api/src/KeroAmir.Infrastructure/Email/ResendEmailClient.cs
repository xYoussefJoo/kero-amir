using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.Options;

namespace KeroAmir.Infrastructure.Email;

/// <summary>Sends one plain-text email through Resend's HTTP API (POST /emails).</summary>
public sealed class ResendEmailClient(HttpClient http, IOptions<EmailOptions> options)
{
    public async Task SendAsync(string subject, string text, CancellationToken ct)
    {
        var o = options.Value;
        using var request = new HttpRequestMessage(HttpMethod.Post, "emails")
        {
            Content = JsonContent.Create(new { from = o.From, to = new[] { o.To }, subject, text }),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", o.ResendApiKey);
        using var response = await http.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"Resend answered {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync(ct)}");
    }
}
