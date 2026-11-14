using FluentValidation;
using KeroAmir.Application.Common.Abstractions;
using KeroAmir.Application.Common.Content;
using KeroAmir.Application.Common.Messaging;
using KeroAmir.Application.Common.Paging;
using KeroAmir.Application.Common.Results;
using KeroAmir.Domain.Catalog;
using Microsoft.EntityFrameworkCore;

namespace KeroAmir.Application.Features.Tools;

// ---- Contracts (tool names are brand names: not translated)
public sealed record ToolInput(string Slug, string Name, string? Color, bool ShowInOrbit);

public sealed record ToolDto(Guid Id, string Slug, string Name, string? Color, bool ShowInOrbit);

public sealed record ToolAdminDto(Guid Id, string Slug, string Name, string? Color, bool ShowInOrbit, int SortOrder, DateTimeOffset UpdatedAt);

public sealed record ListTools;
public sealed record ListToolsAdmin(PageRequest Page);
public sealed record GetTool(Guid Id);
public sealed record CreateTool(ToolInput Input);
public sealed record UpdateTool(Guid Id, ToolInput Input);
public sealed record DeleteTool(Guid Id);
public sealed record ReorderTools(IReadOnlyList<Guid> Ids);

internal sealed class ToolInputValidator : AbstractValidator<ToolInput>
{
    public ToolInputValidator()
    {
        RuleFor(x => x.Slug).ValidSlug();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(80);
        RuleFor(x => x.Color).Matches("^#[0-9A-Fa-f]{6}$").When(x => x.Color is not null)
            .WithMessage("Use a hex color like #FF9A00.");
    }
}

// ---- Handlers
internal sealed class ToolHandlers(IAppDbContext db) :
    IHandler<ListTools, IReadOnlyList<ToolDto>>,
    IHandler<ListToolsAdmin, PagedResult<ToolAdminDto>>,
    IHandler<GetTool, ToolAdminDto>,
    IHandler<CreateTool, ToolAdminDto>,
    IHandler<UpdateTool, ToolAdminDto>,
    IHandler<DeleteTool, bool>,
    IHandler<ReorderTools, bool>
{
    private const string Entity = "Tool";

    public async Task<Result<IReadOnlyList<ToolDto>>> HandleAsync(ListTools request, CancellationToken ct) =>
        await db.Tools.AsNoTracking()
            .OrderBy(t => t.SortOrder)
            .Take(Limits.PublicListMax)
            .Select(t => new ToolDto(t.Id, t.Slug, t.Name, t.Color, t.ShowInOrbit))
            .ToListAsync(ct);

    public async Task<Result<PagedResult<ToolAdminDto>>> HandleAsync(ListToolsAdmin request, CancellationToken ct) =>
        await AdminProjection(db.Tools.AsNoTracking().OrderBy(t => t.SortOrder)).ToPagedAsync(request.Page, ct);

    public async Task<Result<ToolAdminDto>> HandleAsync(GetTool request, CancellationToken ct) =>
        await AdminProjection(db.Tools.AsNoTracking().Where(t => t.Id == request.Id)).SingleOrDefaultAsync(ct)
        ?? (Result<ToolAdminDto>)Error.NotFound(Entity, request.Id);

    public async Task<Result<ToolAdminDto>> HandleAsync(CreateTool request, CancellationToken ct)
    {
        if (await SlugTaken(request.Input.Slug, null, ct))
            return SlugConflict(request.Input.Slug);

        var tool = new Tool
        {
            Slug = request.Input.Slug,
            Name = request.Input.Name.Trim(),
            SortOrder = (await db.Tools.MaxAsync(t => (int?)t.SortOrder, ct) ?? -1) + 1,
        };
        Apply(tool, request.Input);
        db.Tools.Add(tool);
        await db.SaveChangesAsync(ct);
        return ToAdmin(tool);
    }

    public async Task<Result<ToolAdminDto>> HandleAsync(UpdateTool request, CancellationToken ct)
    {
        var tool = await db.Tools.SingleOrDefaultAsync(t => t.Id == request.Id, ct);
        if (tool is null)
            return Error.NotFound(Entity, request.Id);
        if (await SlugTaken(request.Input.Slug, request.Id, ct))
            return SlugConflict(request.Input.Slug);

        Apply(tool, request.Input);
        await db.SaveChangesAsync(ct);
        return ToAdmin(tool);
    }

    public async Task<Result<bool>> HandleAsync(DeleteTool request, CancellationToken ct)
    {
        var tool = await db.Tools.SingleOrDefaultAsync(t => t.Id == request.Id, ct);
        if (tool is null)
            return Error.NotFound(Entity, request.Id);

        db.Tools.Remove(tool); // soft delete; skills linked to it simply stop showing the tool
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<Result<bool>> HandleAsync(ReorderTools request, CancellationToken ct)
    {
        var result = await ContentHelpers.ReorderAsync(db.Tools, request.Ids, db, ct);
        return result.IsSuccess ? true : result.Error!;
    }

    private Task<bool> SlugTaken(string slug, Guid? exceptId, CancellationToken ct) =>
        db.Tools.AnyAsync(t => t.Slug == slug && t.Id != exceptId, ct);

    private static Error SlugConflict(string slug) =>
        Error.Conflict("Tool.SlugTaken", $"Another tool already uses the slug '{slug}'.");

    private static void Apply(Tool tool, ToolInput input)
    {
        tool.Slug = input.Slug;
        tool.Name = input.Name.Trim();
        tool.Color = input.Color?.ToUpperInvariant();
        tool.ShowInOrbit = input.ShowInOrbit;
    }

    private static IQueryable<ToolAdminDto> AdminProjection(IQueryable<Tool> query) =>
        query.Select(t => new ToolAdminDto(t.Id, t.Slug, t.Name, t.Color, t.ShowInOrbit, t.SortOrder, t.UpdatedAt));

    private static ToolAdminDto ToAdmin(Tool t) =>
        new(t.Id, t.Slug, t.Name, t.Color, t.ShowInOrbit, t.SortOrder, t.UpdatedAt);
}
