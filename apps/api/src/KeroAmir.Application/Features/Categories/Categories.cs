using FluentValidation;
using KeroAmir.Application.Common.Abstractions;
using KeroAmir.Application.Common.Content;
using KeroAmir.Application.Common.Messaging;
using KeroAmir.Application.Common.Paging;
using KeroAmir.Application.Common.Results;
using KeroAmir.Domain.Catalog;
using KeroAmir.Domain.Common;
using Microsoft.EntityFrameworkCore;

namespace KeroAmir.Application.Features.Categories;

// ---- Contracts
public sealed record CategoryTranslationInput(string Locale, string Name);

public sealed record CategoryInput(string Slug, IReadOnlyList<CategoryTranslationInput> Translations);

public sealed record CategoryDto(Guid Id, string Slug, string Name);

public sealed record CategoryAdminDto(
    Guid Id, string Slug, int SortOrder, IReadOnlyList<CategoryTranslationInput> Translations, DateTimeOffset UpdatedAt);

public sealed record ListCategories(string Locale);
public sealed record ListCategoriesAdmin(PageRequest Page);
public sealed record GetCategory(Guid Id);
public sealed record CreateCategory(CategoryInput Input);
public sealed record UpdateCategory(Guid Id, CategoryInput Input);
public sealed record DeleteCategory(Guid Id);
public sealed record ReorderCategories(IReadOnlyList<Guid> Ids);

internal sealed class CategoryInputValidator : AbstractValidator<CategoryInput>
{
    public CategoryInputValidator()
    {
        RuleFor(x => x.Slug).ValidSlug();
        RuleFor(x => x.Translations).ValidTranslations(t => t.Locale);
        RuleForEach(x => x.Translations).ChildRules(t => t.RuleFor(x => x.Name).NotEmpty().MaximumLength(80));
    }
}

// ---- Handlers
internal sealed class CategoryHandlers(IAppDbContext db) :
    IHandler<ListCategories, IReadOnlyList<CategoryDto>>,
    IHandler<ListCategoriesAdmin, PagedResult<CategoryAdminDto>>,
    IHandler<GetCategory, CategoryAdminDto>,
    IHandler<CreateCategory, CategoryAdminDto>,
    IHandler<UpdateCategory, CategoryAdminDto>,
    IHandler<DeleteCategory, bool>,
    IHandler<ReorderCategories, bool>
{
    private const string Entity = "Category";

    public async Task<Result<IReadOnlyList<CategoryDto>>> HandleAsync(ListCategories request, CancellationToken ct)
    {
        var locale = ContentHelpers.Locale(request.Locale);
        return await db.Categories.AsNoTracking()
            .OrderBy(c => c.SortOrder)
            .Take(Limits.PublicListMax)
            .Select(c => new CategoryDto(c.Id, c.Slug,
                c.Translations.Where(t => t.Locale == locale).Select(t => t.Name).FirstOrDefault()
                ?? c.Translations.Where(t => t.Locale == Locales.Default).Select(t => t.Name).FirstOrDefault()
                ?? c.Slug))
            .ToListAsync(ct);
    }

    public async Task<Result<PagedResult<CategoryAdminDto>>> HandleAsync(ListCategoriesAdmin request, CancellationToken ct) =>
        await AdminProjection(db.Categories.AsNoTracking().OrderBy(c => c.SortOrder)).ToPagedAsync(request.Page, ct);

    public async Task<Result<CategoryAdminDto>> HandleAsync(GetCategory request, CancellationToken ct) =>
        await AdminProjection(db.Categories.AsNoTracking().Where(c => c.Id == request.Id)).SingleOrDefaultAsync(ct)
        ?? (Result<CategoryAdminDto>)Error.NotFound(Entity, request.Id);

    public async Task<Result<CategoryAdminDto>> HandleAsync(CreateCategory request, CancellationToken ct)
    {
        if (await SlugTaken(request.Input.Slug, exceptId: null, ct))
            return SlugConflict(request.Input.Slug);

        var category = new Category
        {
            Slug = request.Input.Slug,
            SortOrder = (await db.Categories.MaxAsync(c => (int?)c.SortOrder, ct) ?? -1) + 1,
        };
        Apply(category, request.Input);
        db.Categories.Add(category);
        await db.SaveChangesAsync(ct);
        return ToAdmin(category);
    }

    public async Task<Result<CategoryAdminDto>> HandleAsync(UpdateCategory request, CancellationToken ct)
    {
        var category = await db.Categories.SingleOrDefaultAsync(c => c.Id == request.Id, ct);
        if (category is null)
            return Error.NotFound(Entity, request.Id);
        if (await SlugTaken(request.Input.Slug, request.Id, ct))
            return SlugConflict(request.Input.Slug);

        category.Slug = request.Input.Slug;
        Apply(category, request.Input);
        await db.SaveChangesAsync(ct);
        return ToAdmin(category);
    }

    public async Task<Result<bool>> HandleAsync(DeleteCategory request, CancellationToken ct)
    {
        var category = await db.Categories.SingleOrDefaultAsync(c => c.Id == request.Id, ct);
        if (category is null)
            return Error.NotFound(Entity, request.Id);

        db.Categories.Remove(category); // soft delete (interceptor)
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<Result<bool>> HandleAsync(ReorderCategories request, CancellationToken ct)
    {
        var result = await ContentHelpers.ReorderAsync(db.Categories, request.Ids, db, ct);
        return result.IsSuccess ? true : result.Error!;
    }

    private Task<bool> SlugTaken(string slug, Guid? exceptId, CancellationToken ct) =>
        db.Categories.AnyAsync(c => c.Slug == slug && c.Id != exceptId, ct);

    private static Error SlugConflict(string slug) =>
        Error.Conflict("Category.SlugTaken", $"Another category already uses the slug '{slug}'.");

    private static void Apply(Category category, CategoryInput input) =>
        ContentHelpers.SyncTranslations(category.Translations, input.Translations, t => t.Locale,
            t => new CategoryTranslation { Locale = t.Locale, Name = t.Name.Trim() },
            (existing, t) => existing.Name = t.Name.Trim());

    private static IQueryable<CategoryAdminDto> AdminProjection(IQueryable<Category> query) =>
        query.Select(c => new CategoryAdminDto(c.Id, c.Slug, c.SortOrder,
            c.Translations.Select(t => new CategoryTranslationInput(t.Locale, t.Name)).ToList(), c.UpdatedAt));

    private static CategoryAdminDto ToAdmin(Category c) => new(c.Id, c.Slug, c.SortOrder,
        [.. c.Translations.Select(t => new CategoryTranslationInput(t.Locale, t.Name))], c.UpdatedAt);
}
