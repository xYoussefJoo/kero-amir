using FluentValidation;
using KeroAmir.Application.Common.Abstractions;
using KeroAmir.Application.Common.Content;
using KeroAmir.Application.Common.Messaging;
using KeroAmir.Application.Common.Paging;
using KeroAmir.Application.Common.Results;
using KeroAmir.Domain.Common;
using KeroAmir.Domain.Timeline;
using Microsoft.EntityFrameworkCore;

namespace KeroAmir.Application.Features.Timeline;

// ---- Contracts
public sealed record TimelineTranslationInput(string Locale, string Title, string? Description);

public sealed record TimelineInput(
    TimelineKind Kind, DateOnly StartDate, DateOnly? EndDate, string? Organization, string? Location,
    IReadOnlyList<TimelineTranslationInput> Translations);

public sealed record TimelineEntryDto(
    Guid Id, TimelineKind Kind, DateOnly StartDate, DateOnly? EndDate, string? Organization, string? Location,
    string Title, string? Description);

public sealed record TimelineEntryAdminDto(
    Guid Id, TimelineKind Kind, DateOnly StartDate, DateOnly? EndDate, string? Organization, string? Location,
    IReadOnlyList<TimelineTranslationInput> Translations, DateTimeOffset UpdatedAt);

public sealed record ListTimeline(string Locale);
public sealed record ListTimelineAdmin(PageRequest Page);
public sealed record GetTimelineEntry(Guid Id);
public sealed record CreateTimelineEntry(TimelineInput Input);
public sealed record UpdateTimelineEntry(Guid Id, TimelineInput Input);
public sealed record DeleteTimelineEntry(Guid Id);

internal sealed class TimelineInputValidator : AbstractValidator<TimelineInput>
{
    public TimelineInputValidator()
    {
        RuleFor(x => x.Kind).IsInEnum();
        RuleFor(x => x.StartDate).NotEmpty();
        RuleFor(x => x.EndDate).GreaterThanOrEqualTo(x => x.StartDate).When(x => x.EndDate is not null)
            .WithMessage("The end date can't be before the start date.");
        RuleFor(x => x.Organization).MaximumLength(120);
        RuleFor(x => x.Location).MaximumLength(120);
        RuleFor(x => x.Translations).ValidTranslations(t => t.Locale);
        RuleForEach(x => x.Translations).ChildRules(t =>
        {
            t.RuleFor(x => x.Title).NotEmpty().MaximumLength(150);
            t.RuleFor(x => x.Description).MaximumLength(1000);
        });
    }
}

// ---- Handlers (ordered newest first by date; SortOrder breaks ties for same-month entries)
internal sealed class TimelineHandlers(IAppDbContext db) :
    IHandler<ListTimeline, IReadOnlyList<TimelineEntryDto>>,
    IHandler<ListTimelineAdmin, PagedResult<TimelineEntryAdminDto>>,
    IHandler<GetTimelineEntry, TimelineEntryAdminDto>,
    IHandler<CreateTimelineEntry, TimelineEntryAdminDto>,
    IHandler<UpdateTimelineEntry, TimelineEntryAdminDto>,
    IHandler<DeleteTimelineEntry, bool>
{
    private const string Entity = "TimelineEntry";

    public async Task<Result<IReadOnlyList<TimelineEntryDto>>> HandleAsync(ListTimeline request, CancellationToken ct)
    {
        var locale = ContentHelpers.Locale(request.Locale);
        return await Ordered(db.TimelineEntries.AsNoTracking())
            .Take(Limits.PublicListMax)
            .Select(e => new TimelineEntryDto(e.Id, e.Kind, e.StartDate, e.EndDate, e.Organization, e.Location,
                e.Translations.Where(t => t.Locale == locale).Select(t => t.Title).FirstOrDefault()
                ?? e.Translations.Where(t => t.Locale == Locales.Default).Select(t => t.Title).FirstOrDefault() ?? "",
                // Description follows the same translation as the title.
                e.Translations.Any(t => t.Locale == locale)
                    ? e.Translations.Where(t => t.Locale == locale).Select(t => t.Description).FirstOrDefault()
                    : e.Translations.Where(t => t.Locale == Locales.Default).Select(t => t.Description).FirstOrDefault()))
            .ToListAsync(ct);
    }

    public async Task<Result<PagedResult<TimelineEntryAdminDto>>> HandleAsync(ListTimelineAdmin request, CancellationToken ct) =>
        await AdminProjection(Ordered(db.TimelineEntries.AsNoTracking())).ToPagedAsync(request.Page, ct);

    public async Task<Result<TimelineEntryAdminDto>> HandleAsync(GetTimelineEntry request, CancellationToken ct) =>
        await AdminProjection(db.TimelineEntries.AsNoTracking().Where(e => e.Id == request.Id)).SingleOrDefaultAsync(ct)
        ?? (Result<TimelineEntryAdminDto>)Error.NotFound(Entity, request.Id);

    public async Task<Result<TimelineEntryAdminDto>> HandleAsync(CreateTimelineEntry request, CancellationToken ct)
    {
        var entry = new TimelineEntry();
        Apply(entry, request.Input);
        db.TimelineEntries.Add(entry);
        await db.SaveChangesAsync(ct);
        return ToAdmin(entry);
    }

    public async Task<Result<TimelineEntryAdminDto>> HandleAsync(UpdateTimelineEntry request, CancellationToken ct)
    {
        var entry = await db.TimelineEntries.SingleOrDefaultAsync(e => e.Id == request.Id, ct);
        if (entry is null)
            return Error.NotFound(Entity, request.Id);

        Apply(entry, request.Input);
        await db.SaveChangesAsync(ct);
        return ToAdmin(entry);
    }

    public async Task<Result<bool>> HandleAsync(DeleteTimelineEntry request, CancellationToken ct)
    {
        var entry = await db.TimelineEntries.SingleOrDefaultAsync(e => e.Id == request.Id, ct);
        if (entry is null)
            return Error.NotFound(Entity, request.Id);

        db.TimelineEntries.Remove(entry);
        await db.SaveChangesAsync(ct);
        return true;
    }

    private static IQueryable<TimelineEntry> Ordered(IQueryable<TimelineEntry> query) =>
        query.OrderByDescending(e => e.StartDate).ThenBy(e => e.SortOrder);

    private static void Apply(TimelineEntry entry, TimelineInput input)
    {
        entry.Kind = input.Kind;
        entry.StartDate = input.StartDate;
        entry.EndDate = input.EndDate;
        entry.Organization = input.Organization?.Trim();
        entry.Location = input.Location?.Trim();
        ContentHelpers.SyncTranslations(entry.Translations, input.Translations, t => t.Locale,
            t => new TimelineEntryTranslation { Locale = t.Locale, Title = t.Title.Trim(), Description = t.Description?.Trim() },
            (e, t) => { e.Title = t.Title.Trim(); e.Description = t.Description?.Trim(); });
    }

    private static IQueryable<TimelineEntryAdminDto> AdminProjection(IQueryable<TimelineEntry> query) =>
        query.Select(e => new TimelineEntryAdminDto(e.Id, e.Kind, e.StartDate, e.EndDate, e.Organization, e.Location,
            e.Translations.Select(t => new TimelineTranslationInput(t.Locale, t.Title, t.Description)).ToList(), e.UpdatedAt));

    private static TimelineEntryAdminDto ToAdmin(TimelineEntry e) => new(e.Id, e.Kind, e.StartDate, e.EndDate,
        e.Organization, e.Location,
        [.. e.Translations.Select(t => new TimelineTranslationInput(t.Locale, t.Title, t.Description))], e.UpdatedAt);
}
