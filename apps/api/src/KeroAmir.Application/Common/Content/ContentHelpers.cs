using FluentValidation;
using KeroAmir.Application.Common.Abstractions;
using KeroAmir.Application.Common.Results;
using KeroAmir.Domain.Common;
using Microsoft.EntityFrameworkCore;

namespace KeroAmir.Application.Common.Content;

/// <summary>Reorder request: ids in their new order. Ids not listed keep their position after the listed ones.</summary>
public sealed record ReorderRequest(IReadOnlyList<Guid> Ids);

/// <summary>Public reads return whole (small) sets; this cap keeps them bounded even if data grows.</summary>
public static class Limits
{
    public const int PublicListMax = 200;
}

public static class ContentHelpers
{
    /// <summary>Normalises ?locale=: unsupported or missing values fall back to English.</summary>
    public static string Locale(string? requested) => Locales.IsSupported(requested) ? requested! : Locales.Default;

    /// <summary>
    /// Makes <paramref name="existing"/> match <paramref name="inputs"/> by locale: updates matches, adds new, removes missing.
    /// </summary>
    public static void SyncTranslations<TTranslation, TInput>(
        ICollection<TTranslation> existing,
        IEnumerable<TInput> inputs,
        Func<TInput, string> localeOf,
        Func<TInput, TTranslation> create,
        Action<TTranslation, TInput> update)
        where TTranslation : ITranslation
    {
        var byLocale = inputs.ToDictionary(localeOf);

        foreach (var stale in existing.Where(t => !byLocale.ContainsKey(t.Locale)).ToList())
            existing.Remove(stale);

        foreach (var (locale, input) in byLocale)
        {
            var current = existing.FirstOrDefault(t => t.Locale == locale);
            if (current is null)
                existing.Add(create(input));
            else
                update(current, input);
        }
    }

    /// <summary>Sets SortOrder = position for the given ids. One round trip to load, one to save.</summary>
    public static async Task<Result> ReorderAsync<T>(
        IQueryable<T> set, IReadOnlyList<Guid> ids, IAppDbContext db, CancellationToken ct)
        where T : class, ISortable
    {
        var items = await set.Where(x => ids.Contains(x.Id)).ToListAsync(ct);
        if (items.Count != ids.Count)
            return Error.Validation(new Dictionary<string, string[]> { ["ids"] = ["Some ids don't exist."] });

        var position = ids.Select((id, index) => (id, index)).ToDictionary(x => x.id, x => x.index);
        foreach (var item in items)
            item.SortOrder = position[item.Id];

        await db.SaveChangesAsync(ct);
        return Result.Success();
    }
}

public static class ContentRules
{
    public const string SlugPattern = "^[a-z0-9]+(?:-[a-z0-9]+)*$";

    public static IRuleBuilderOptions<T, string> ValidSlug<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty().MaximumLength(80).Matches(SlugPattern)
            .WithMessage("Use lowercase letters, numbers and single hyphens, e.g. brand-identity.");

    /// <summary>Supported locales only, each at most once, and English always present (it is the fallback).</summary>
    public static IRuleBuilderOptions<T, IReadOnlyList<TInput>> ValidTranslations<T, TInput>(
        this IRuleBuilder<T, IReadOnlyList<TInput>> rule, Func<TInput, string> localeOf) =>
        rule.NotNull()
            .Must(list => list.All(x => Locales.IsSupported(localeOf(x))))
            .WithMessage($"Locales must be one of: {string.Join(", ", Locales.All)}.")
            .Must(list => list.Select(localeOf).Distinct().Count() == list.Count)
            .WithMessage("Each locale may appear only once.")
            .Must(list => list.Any(x => localeOf(x) == Locales.Default))
            .WithMessage("An English translation is required.");

    public static IRuleBuilderOptions<T, IReadOnlyList<Guid>> ValidReorder<T>(this IRuleBuilder<T, IReadOnlyList<Guid>> rule) =>
        rule.NotEmpty()
            .Must(ids => ids.Count <= Limits.PublicListMax).WithMessage("Too many ids.")
            .Must(ids => ids.Distinct().Count() == ids.Count).WithMessage("Ids must be unique.");
}

internal sealed class ReorderRequestValidator : AbstractValidator<ReorderRequest>
{
    public ReorderRequestValidator() => RuleFor(x => x.Ids).ValidReorder();
}
