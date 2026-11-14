namespace KeroAmir.Domain.Common;

/// <summary>Entities the admin can drag to reorder.</summary>
public interface ISortable
{
    Guid Id { get; }
    int SortOrder { get; set; }
}
