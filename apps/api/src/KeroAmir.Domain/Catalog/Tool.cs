using KeroAmir.Domain.Common;

namespace KeroAmir.Domain.Catalog;

/// <summary>
/// Software Kero works with (Illustrator, Blender...). Brand names are not translated.
/// Tools with <see cref="ShowInOrbit"/> circle the K in the hero; clicking one filters projects.
/// </summary>
public class Tool : BaseEntity, ISortable
{
    public required string Slug { get; set; }
    public required string Name { get; set; }

    /// <summary>Brand color for the orbit chip, e.g. "#FF9A00". Optional.</summary>
    public string? Color { get; set; }

    public bool ShowInOrbit { get; set; }
    public int SortOrder { get; set; }
}
