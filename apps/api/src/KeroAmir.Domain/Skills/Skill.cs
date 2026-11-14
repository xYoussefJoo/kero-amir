using KeroAmir.Domain.Catalog;
using KeroAmir.Domain.Common;

namespace KeroAmir.Domain.Skills;

/// <summary>A group of skills, e.g. "Brand identity" or "3D & motion".</summary>
public class SkillGroup : BaseEntity, ITranslatable<SkillGroupTranslation>
{
    public int SortOrder { get; set; }
    public ICollection<SkillGroupTranslation> Translations { get; } = [];
    public ICollection<Skill> Skills { get; } = [];
}

public class SkillGroupTranslation : ITranslation
{
    public Guid SkillGroupId { get; set; }
    public required string Locale { get; set; }
    public required string Name { get; set; }
}

/// <summary>One skill with a 0–100 level. Optionally tied to the <see cref="Tool"/> it is practised with.</summary>
public class Skill : BaseEntity, ITranslatable<SkillTranslation>
{
    public const int MinLevel = 0;
    public const int MaxLevel = 100;

    public Guid SkillGroupId { get; set; }
    public SkillGroup? SkillGroup { get; set; }

    public Guid? ToolId { get; set; }
    public Tool? Tool { get; set; }

    public int Level { get; set; }
    public int SortOrder { get; set; }
    public ICollection<SkillTranslation> Translations { get; } = [];
}

public class SkillTranslation : ITranslation
{
    public Guid SkillId { get; set; }
    public required string Locale { get; set; }
    public required string Name { get; set; }
}
