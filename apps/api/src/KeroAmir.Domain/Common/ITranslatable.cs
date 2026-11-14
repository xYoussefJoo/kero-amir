namespace KeroAmir.Domain.Common;

/// <summary>Per-locale text for an entity. Stored in a child table keyed by (ParentId, Locale).</summary>
public interface ITranslation
{
    string Locale { get; }
}

public interface ITranslatable<TTranslation> where TTranslation : ITranslation
{
    ICollection<TTranslation> Translations { get; }
}
