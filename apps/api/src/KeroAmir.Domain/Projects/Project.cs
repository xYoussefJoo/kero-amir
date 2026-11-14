using KeroAmir.Domain.Catalog;
using KeroAmir.Domain.Common;

namespace KeroAmir.Domain.Projects;

public enum PublishStatus
{
    Draft,
    Published,
}

/// <summary>A portfolio project. Only Published projects are visible on the public site.</summary>
public class Project : BaseEntity, ITranslatable<ProjectTranslation>, ISortable
{
    public required string Slug { get; set; }
    public int Year { get; set; }

    /// <summary>ISO 3166 alpha-2 country codes, comma-separated (e.g. "US,FR").</summary>
    public string Countries { get; set; } = "";

    /// <summary>Cover image URL (media library in Phase 3). Null: the site renders a branded cover.</summary>
    public string? CoverImageUrl { get; set; }

    /// <summary>Accent for the card and branded cover, e.g. "#FF6535".</summary>
    public string? AccentColor { get; set; }

    public bool IsFeatured { get; set; }
    public PublishStatus Status { get; set; }
    public DateTimeOffset? PublishedAt { get; set; }
    public int SortOrder { get; set; }

    public ICollection<ProjectTranslation> Translations { get; } = [];
    public ICollection<Category> Categories { get; } = [];
    public ICollection<Tool> Tools { get; } = [];
}

public class ProjectTranslation : ITranslation
{
    public Guid ProjectId { get; set; }
    public required string Locale { get; set; }
    public required string Title { get; set; }
    public required string Summary { get; set; }

    /// <summary>Short highlight shown on the card, e.g. "Full brand book".</summary>
    public string? Highlight { get; set; }
}
