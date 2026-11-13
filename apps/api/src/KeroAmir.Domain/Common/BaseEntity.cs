namespace KeroAmir.Domain.Common;

/// <summary>Every table has these columns. Deletes are soft: <see cref="DeletedAt"/> is set instead.</summary>
public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
}
