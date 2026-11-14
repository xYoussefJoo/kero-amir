using System.Net;
using System.Security.Cryptography;
using System.Text;

namespace KeroAmir.Api.Infrastructure;

public static class ClientIp
{
    public const string ClientIpHeader = "X-Client-IP";
    public const string SecretHeader = "X-Forwarded-Secret";

    /// <summary>
    /// The visitor's IP. Public forms are posted through the Next.js server, so the connection IP is the web server's;
    /// the web server then sends the visitor's IP in X-Client-IP together with a shared secret (Forwarding:Secret).
    /// The header is trusted only when the secret matches, so nobody else can spoof their IP into the rate limiter.
    /// </summary>
    public static string? Get(HttpContext http)
    {
        var secret = http.RequestServices.GetRequiredService<IConfiguration>()["Forwarding:Secret"];
        if (!string.IsNullOrEmpty(secret)
            && http.Request.Headers.TryGetValue(SecretHeader, out var sent)
            && CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(sent.ToString()), Encoding.UTF8.GetBytes(secret))
            && IPAddress.TryParse(http.Request.Headers[ClientIpHeader].ToString(), out var forwarded))
        {
            return forwarded.ToString();
        }
        return http.Connection.RemoteIpAddress?.ToString();
    }
}
