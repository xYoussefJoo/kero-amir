using FluentValidation;
using KeroAmir.Application.Common.Abstractions;
using KeroAmir.Application.Common.Content;
using KeroAmir.Application.Common.Messaging;
using KeroAmir.Application.Common.Paging;
using KeroAmir.Application.Common.Results;
using KeroAmir.Domain.Common;
using KeroAmir.Domain.Projects;
using Microsoft.EntityFrameworkCore;

namespace KeroAmir.Application.Features.Projects;

// ---- Contracts
public sealed record ProjectTranslationInput(string Locale, string Title, string Summary, string? Highlight);

public sealed record ProjectInput(
    string Slug, int Year, IReadOnlyList<string> Countries, string? CoverImageUrl, string? AccentColor, bool IsFeatured,
    IReadOnlyList<Guid> CategoryIds, IReadOnlyList<Guid> ToolIds, IReadOnlyList<ProjectTranslationInput> Translations);

public sealed record TagDto(string Slug, string Name);

/// <summary>Everything a project card shows, in one row (no N+1): texts in the requested language.</summary>
public sealed record ProjectCardDto(
    Guid Id, string Slug, string Title, string Summary, string? Highlight, int Year, IReadOnlyList<string> Countries,
    string? CoverImageUrl, string? AccentColor, bool IsFeatured, IReadOnlyList<TagDto> Categories, IReadOnlyList<TagDto> Tools);

public sealed record ProjectAdminDto(
    Guid Id, string Slug, int Year, IReadOnlyList<string> Countries, string? CoverImageUrl, string? AccentColor,
    bool IsFeatured, PublishStatus Status, DateTimeOffset? PublishedAt, int SortOrder,
    IReadOnlyList<Guid> CategoryIds, IReadOnlyList<Guid> ToolIds, IReadOnlyList<ProjectTranslationInput> Translations,
    DateTimeOffset UpdatedAt);

public sealed record ListProjects(string Locale, string? Category, string? Tool, PageRequest Page);
public sealed record GetProject(string Slug, string Locale);
public sealed record ListProjectsAdmin(PageRequest Page);
public sealed record CreateProject(ProjectInput Input);
public sealed record UpdateProject(Guid Id, ProjectInput Input);
public sealed record DeleteProject(Guid Id);
public sealed record SetProjectStatus(Guid Id, PublishStatus Status);
public sealed record ReorderProjects(IReadOnlyList<Guid> Ids);

public sealed record ProjectStatusBody(PublishStatus Status);

internal sealed class ProjectInputValidator : AbstractValidator<ProjectInput>
{
    public ProjectInputValidator()
    {
        RuleFor(x => x.Slug).ValidSlug();
        RuleFor(x => x.Year).InclusiveBetween(1990, 2100);
        RuleFor(x => x.Countries).NotNull().Must(c => c.Count <= 10).WithMessage("At most 10 countries.");
        RuleForEach(x => x.Countries).Matches("^[A-Z]{2}$").WithMessage("Use two-letter country codes like US or DE.");
        RuleFor(x => x.CoverImageUrl).MaximumLength(500)
            .Must(u => u is null || Uri.TryCreate(u, UriKind.Absolute, out var uri) && uri.Scheme == Uri.UriSchemeHttps || u!.StartsWith('/'))
            .WithMessage("Use an https:// URL or a site path.");
        RuleFor(x => x.AccentColor).Matches("^#[0-9A-Fa-f]{6}$").When(x => x.AccentColor is not null);
        RuleFor(x => x.CategoryIds).NotNull().Must(ids => ids.Count <= 10 && ids.Distinct().Count() == ids.Count);
        RuleFor(x => x.ToolIds).NotNull().Must(ids => ids.Count <= 20 && ids.Distinct().Count() == ids.Count);
        RuleFor(x => x.Translations).ValidTranslations(t => t.Locale);
        RuleForEach(x => x.Translations).ChildRules(t =>
        {
            t.RuleFor(x => x.Title).NotEmpty().MaximumLength(150);
            t.RuleFor(x => x.Summary).NotEmpty().MaximumLength(600);
            t.RuleFor(x => x.Highlight).MaximumLength(80);
        });
    }
}

// ---- Handlers
internal sealed class ProjectHandlers(IAppDbContext db, TimeProvider clock) :
    IHandler<ListProjects, PagedResult<ProjectCardDto>>,
    IHandler<GetProject, ProjectCardDto>,
    IHandler<ListProjectsAdmin, PagedResult<ProjectAdminDto>>,
    IHandler<CreateProject, ProjectAdminDto>,
    IHandler<UpdateProject, ProjectAdminDto>,
    IHandler<DeleteProject, bool>,
    IHandler<SetProjectStatus, ProjectAdminDto>,
    IHandler<ReorderProjects, bool>
{
    private const string Entity = "Project";

    public async Task<Result<PagedResult<ProjectCardDto>>> HandleAsync(ListProjects request, CancellationToken ct)
    {
        var locale = ContentHelpers.Locale(request.Locale);
        var query = db.Projects.AsNoTracking().Where(p => p.Status == PublishStatus.Published);
        if (!string.IsNullOrWhiteSpace(request.Category))
            query = query.Where(p => p.Categories.Any(c => c.Slug == request.Category));
        if (!string.IsNullOrWhiteSpace(request.Tool))
            query = query.Where(p => p.Tools.Any(t => t.Slug == request.Tool));

        var page = await Cards(query.OrderByDescending(p => p.IsFeatured).ThenBy(p => p.SortOrder).ThenByDescending(p => p.Year), locale)
            .ToPagedAsync(request.Page, ct);
        return new PagedResult<ProjectCardDto>([.. page.Items.Select(ToCard)], page.Page, page.PageSize, page.TotalCount);
    }

    public async Task<Result<ProjectCardDto>> HandleAsync(GetProject request, CancellationToken ct)
    {
        var locale = ContentHelpers.Locale(request.Locale);
        var row = await Cards(db.Projects.AsNoTracking()
                .Where(p => p.Slug == request.Slug && p.Status == PublishStatus.Published), locale)
            .SingleOrDefaultAsync(ct);
        return row is null ? Error.NotFound(Entity, request.Slug) : ToCard(row);
    }

    public async Task<Result<PagedResult<ProjectAdminDto>>> HandleAsync(ListProjectsAdmin request, CancellationToken ct)
    {
        var page = await AdminRows(db.Projects.AsNoTracking().OrderBy(p => p.SortOrder)).ToPagedAsync(request.Page, ct);
        return new PagedResult<ProjectAdminDto>([.. page.Items.Select(ToAdmin)], page.Page, page.PageSize, page.TotalCount);
    }

    public async Task<Result<ProjectAdminDto>> HandleAsync(CreateProject request, CancellationToken ct)
    {
        if (await db.Projects.AnyAsync(p => p.Slug == request.Input.Slug, ct))
            return SlugConflict(request.Input.Slug);

        var project = new Project
        {
            Slug = request.Input.Slug,
            SortOrder = (await db.Projects.MaxAsync(p => (int?)p.SortOrder, ct) ?? -1) + 1,
            Status = PublishStatus.Draft,
        };
        if (await Apply(project, request.Input, ct) is { } error)
            return error;
        db.Projects.Add(project);
        await db.SaveChangesAsync(ct);
        return await LoadAdmin(project.Id, ct);
    }

    public async Task<Result<ProjectAdminDto>> HandleAsync(UpdateProject request, CancellationToken ct)
    {
        var project = await db.Projects.Include(p => p.Categories).Include(p => p.Tools)
            .SingleOrDefaultAsync(p => p.Id == request.Id, ct);
        if (project is null)
            return Error.NotFound(Entity, request.Id);
        if (await db.Projects.AnyAsync(p => p.Slug == request.Input.Slug && p.Id != request.Id, ct))
            return SlugConflict(request.Input.Slug);

        if (await Apply(project, request.Input, ct) is { } error)
            return error;
        await db.SaveChangesAsync(ct);
        return await LoadAdmin(project.Id, ct);
    }

    public async Task<Result<bool>> HandleAsync(DeleteProject request, CancellationToken ct)
    {
        var project = await db.Projects.SingleOrDefaultAsync(p => p.Id == request.Id, ct);
        if (project is null)
            return Error.NotFound(Entity, request.Id);
        db.Projects.Remove(project);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<Result<ProjectAdminDto>> HandleAsync(SetProjectStatus request, CancellationToken ct)
    {
        var project = await db.Projects.SingleOrDefaultAsync(p => p.Id == request.Id, ct);
        if (project is null)
            return Error.NotFound(Entity, request.Id);
        project.Status = request.Status;
        if (request.Status == PublishStatus.Published)
            project.PublishedAt ??= clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
        return await LoadAdmin(project.Id, ct);
    }

    public async Task<Result<bool>> HandleAsync(ReorderProjects request, CancellationToken ct)
    {
        var result = await ContentHelpers.ReorderAsync(db.Projects, request.Ids, db, ct);
        return result.IsSuccess ? true : result.Error!;
    }

    // ---- helpers
    private async Task<Error?> Apply(Project project, ProjectInput input, CancellationToken ct)
    {
        var categories = await db.Categories.Where(c => input.CategoryIds.Contains(c.Id)).ToListAsync(ct);
        var tools = await db.Tools.Where(t => input.ToolIds.Contains(t.Id)).ToListAsync(ct);
        var errors = new Dictionary<string, string[]>();
        if (categories.Count != input.CategoryIds.Count) errors["categoryIds"] = ["Some categories don't exist."];
        if (tools.Count != input.ToolIds.Count) errors["toolIds"] = ["Some tools don't exist."];
        if (errors.Count > 0)
            return Error.Validation(errors);

        project.Slug = input.Slug;
        project.Year = input.Year;
        project.Countries = string.Join(',', input.Countries.Distinct());
        project.CoverImageUrl = input.CoverImageUrl;
        project.AccentColor = input.AccentColor?.ToUpperInvariant();
        project.IsFeatured = input.IsFeatured;

        project.Categories.Clear();
        foreach (var category in categories) project.Categories.Add(category);
        project.Tools.Clear();
        foreach (var tool in tools) project.Tools.Add(tool);

        ContentHelpers.SyncTranslations(project.Translations, input.Translations, t => t.Locale,
            t => new ProjectTranslation { Locale = t.Locale, Title = t.Title.Trim(), Summary = t.Summary.Trim(), Highlight = t.Highlight?.Trim() },
            (e, t) => { e.Title = t.Title.Trim(); e.Summary = t.Summary.Trim(); e.Highlight = t.Highlight?.Trim(); });
        return null;
    }

    private async Task<ProjectAdminDto> LoadAdmin(Guid id, CancellationToken ct) =>
        ToAdmin(await AdminRows(db.Projects.AsNoTracking().Where(p => p.Id == id)).SingleAsync(ct));

    private static IQueryable<AdminRow> AdminRows(IQueryable<Project> query) =>
        query.Select(p => new AdminRow(p.Id, p.Slug, p.Year, p.Countries, p.CoverImageUrl, p.AccentColor, p.IsFeatured,
            p.Status, p.PublishedAt, p.SortOrder,
            p.Categories.Select(c => c.Id).ToList(), p.Tools.Select(t => t.Id).ToList(),
            p.Translations.Select(t => new ProjectTranslationInput(t.Locale, t.Title, t.Summary, t.Highlight)).ToList(),
            p.UpdatedAt));

    private static Error SlugConflict(string slug) =>
        Error.Conflict("Project.SlugTaken", $"Another project already uses the slug '{slug}'.");

    private sealed record CardRow(
        Guid Id, string Slug, string? Title, string? Summary, string? Highlight, int Year, string Countries,
        string? CoverImageUrl, string? AccentColor, bool IsFeatured, List<TagDto> Categories, List<TagDto> Tools);

    private sealed record AdminRow(
        Guid Id, string Slug, int Year, string Countries, string? CoverImageUrl, string? AccentColor, bool IsFeatured,
        PublishStatus Status, DateTimeOffset? PublishedAt, int SortOrder, List<Guid> CategoryIds, List<Guid> ToolIds,
        List<ProjectTranslationInput> Translations, DateTimeOffset UpdatedAt);

    /// <summary>One query per page: card fields, localized texts (English fallback) and tags, projected in SQL.</summary>
    private static IQueryable<CardRow> Cards(IQueryable<Project> query, string locale) =>
        query.Select(p => new CardRow(
            p.Id, p.Slug,
            p.Translations.Where(t => t.Locale == locale).Select(t => t.Title).FirstOrDefault()
                ?? p.Translations.Where(t => t.Locale == Locales.Default).Select(t => t.Title).FirstOrDefault(),
            p.Translations.Where(t => t.Locale == locale).Select(t => t.Summary).FirstOrDefault()
                ?? p.Translations.Where(t => t.Locale == Locales.Default).Select(t => t.Summary).FirstOrDefault(),
            // A short label: fall back to English when the requested language has none.
            p.Translations.Where(t => t.Locale == locale).Select(t => t.Highlight).FirstOrDefault()
                ?? p.Translations.Where(t => t.Locale == Locales.Default).Select(t => t.Highlight).FirstOrDefault(),
            p.Year, p.Countries, p.CoverImageUrl, p.AccentColor, p.IsFeatured,
            p.Categories.OrderBy(c => c.SortOrder).Select(c => new TagDto(c.Slug,
                c.Translations.Where(t => t.Locale == locale).Select(t => t.Name).FirstOrDefault()
                ?? c.Translations.Where(t => t.Locale == Locales.Default).Select(t => t.Name).FirstOrDefault() ?? c.Slug)).ToList(),
            p.Tools.OrderBy(t => t.SortOrder).Select(t => new TagDto(t.Slug, t.Name)).ToList()));

    private static string[] SplitCountries(string countries) =>
        countries.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    private static ProjectCardDto ToCard(CardRow r) => new(r.Id, r.Slug, r.Title ?? r.Slug, r.Summary ?? "", r.Highlight,
        r.Year, SplitCountries(r.Countries), r.CoverImageUrl, r.AccentColor, r.IsFeatured, r.Categories, r.Tools);

    private static ProjectAdminDto ToAdmin(AdminRow r) => new(r.Id, r.Slug, r.Year, SplitCountries(r.Countries),
        r.CoverImageUrl, r.AccentColor, r.IsFeatured, r.Status, r.PublishedAt, r.SortOrder, r.CategoryIds, r.ToolIds,
        r.Translations, r.UpdatedAt);
}
