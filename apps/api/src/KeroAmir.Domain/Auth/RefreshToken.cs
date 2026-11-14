using KeroAmir.Domain.Common;

namespace KeroAmir.Domain.Auth;

/// <summary>
/// One refresh token in a rotation chain. Only the SHA-256 hash is stored, never the token itself.
/// Every token issued from the same login shares a <see cref="FamilyId"/>: if a used (revoked) token is ever
/// presented again, it was stolen or replayed, so the whole family is revoked.
/// </summary>
public class RefreshToken : BaseEntity
{
    public Guid UserId { get; set; }
    public required string TokenHash { get; set; }
    public Guid FamilyId { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }

    public bool IsActive(DateTimeOffset now) => RevokedAt is null && ExpiresAt > now;
}
