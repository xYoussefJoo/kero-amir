using KeroAmir.Domain.Common;

namespace KeroAmir.Domain.Timeline;

public enum TimelineKind
{
    Work,
    Education,
    Award,
    Milestone,
}

/// <summary>A step in Kero's journey. <see cref="EndDate"/> null means "present".</summary>
public class TimelineEntry : BaseEntity, ITranslatable<TimelineEntryTranslation>
{
    public TimelineKind Kind { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }

    /// <summary>Company or school; a proper name, so not translated.</summary>
    public string? Organization { get; set; }

    public string? Location { get; set; }
    public int SortOrder { get; set; }
    public ICollection<TimelineEntryTranslation> Translations { get; } = [];
}

public class TimelineEntryTranslation : ITranslation
{
    public Guid TimelineEntryId { get; set; }
    public required string Locale { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
}
