using System.Security.Cryptography;
using System.Text;

namespace KeroAmir.Application.Common.Content;

/// <summary>Stores who submitted something without storing their IP: a SHA-256 of it, for spotting abuse.</summary>
public static class Fingerprint
{
    public static string? HashIp(string? ip) =>
        string.IsNullOrWhiteSpace(ip) ? null : Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(ip)));
}

/// <summary>Public form submissions answer "accepted" whether stored or silently dropped (honeypot), so bots learn nothing.</summary>
public sealed record SubmissionAccepted(string Status);
