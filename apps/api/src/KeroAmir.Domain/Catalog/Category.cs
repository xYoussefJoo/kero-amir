using KeroAmir.Domain.Common;

namespace KeroAmir.Domain.Catalog;

/// <summary>A kind of work, e.g. Branding, Packaging, 3D, Motion. Used to filter projects.</summary>
public class Category : BaseEntity, ITranslatable<CategoryTranslation>
{
    public required string Slug { get; set; }
    public int SortOrder { get; set; }
    public ICollection<CategoryTranslation> Translations { get; } = [];
}

public class CategoryTranslation : ITranslation
{
    public Guid CategoryId { get; set; }
    public required string Locale { get; set; }
    public required string Name { get; set; }
}
