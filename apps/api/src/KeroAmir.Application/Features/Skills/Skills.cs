using FluentValidation;
using KeroAmir.Application.Common.Abstractions;
using KeroAmir.Application.Common.Content;
using KeroAmir.Application.Common.Messaging;
using KeroAmir.Application.Common.Paging;
using KeroAmir.Application.Common.Results;
using KeroAmir.Domain.Common;
using KeroAmir.Domain.Skills;
using Microsoft.EntityFrameworkCore;

namespace KeroAmir.Application.Features.Skills;

// ---- Contracts
public sealed record NameTranslationInput(string Locale, string Name);

public sealed record SkillGroupInput(IReadOnlyList<NameTranslationInput> Translations);

public sealed record SkillInput(Guid SkillGroupId, Guid? ToolId, int Level, IReadOnlyList<NameTranslationInput> Translations);

/// <summary>Public shape: groups with their skills, in display order, in one request.</summary>
public sealed record SkillGroupDto(Guid Id, string Name, IReadOnlyList<SkillDto> Skills);

public sealed record SkillDto(Guid Id, string Name, int Level, string? ToolSlug);

public sealed record SkillGroupAdminDto(Guid Id, int SortOrder, IReadOnlyList<NameTranslationInput> Translations, int SkillCount);

public sealed record SkillAdminDto(
    Guid Id, Guid SkillGroupId, Guid? ToolId, int Level, int SortOrder, IReadOnlyList<NameTranslationInput> Translations);

public sealed record ListSkills(string Locale);
public sealed record ListSkillGroupsAdmin;
public sealed record CreateSkillGroup(SkillGroupInput Input);
public sealed record UpdateSkillGroup(Guid Id, SkillGroupInput Input);
public sealed record DeleteSkillGroup(Guid Id);
public sealed record ReorderSkillGroups(IReadOnlyList<Guid> Ids);
public sealed record ListSkillsAdmin(Guid? SkillGroupId, PageRequest Page);
public sealed record CreateSkill(SkillInput Input);
public sealed record UpdateSkill(Guid Id, SkillInput Input);
public sealed record DeleteSkill(Guid Id);
public sealed record ReorderSkills(IReadOnlyList<Guid> Ids);

internal sealed class SkillGroupInputValidator : AbstractValidator<SkillGroupInput>
{
    public SkillGroupInputValidator()
    {
        RuleFor(x => x.Translations).ValidTranslations(t => t.Locale);
        RuleForEach(x => x.Translations).ChildRules(t => t.RuleFor(x => x.Name).NotEmpty().MaximumLength(80));
    }
}

internal sealed class SkillInputValidator : AbstractValidator<SkillInput>
{
    public SkillInputValidator()
    {
        RuleFor(x => x.SkillGroupId).NotEmpty();
        RuleFor(x => x.Level).InclusiveBetween(Skill.MinLevel, Skill.MaxLevel);
        RuleFor(x => x.Translations).ValidTranslations(t => t.Locale);
        RuleForEach(x => x.Translations).ChildRules(t => t.RuleFor(x => x.Name).NotEmpty().MaximumLength(80));
    }
}

// ---- Handlers
internal sealed class SkillHandlers(IAppDbContext db) :
    IHandler<ListSkills, IReadOnlyList<SkillGroupDto>>,
    IHandler<ListSkillGroupsAdmin, IReadOnlyList<SkillGroupAdminDto>>,
    IHandler<CreateSkillGroup, SkillGroupAdminDto>,
    IHandler<UpdateSkillGroup, SkillGroupAdminDto>,
    IHandler<DeleteSkillGroup, bool>,
    IHandler<ReorderSkillGroups, bool>,
    IHandler<ListSkillsAdmin, PagedResult<SkillAdminDto>>,
    IHandler<CreateSkill, SkillAdminDto>,
    IHandler<UpdateSkill, SkillAdminDto>,
    IHandler<DeleteSkill, bool>,
    IHandler<ReorderSkills, bool>
{
    public async Task<Result<IReadOnlyList<SkillGroupDto>>> HandleAsync(ListSkills request, CancellationToken ct)
    {
        var locale = ContentHelpers.Locale(request.Locale);
        // One query: groups + skills + tool slug, projected (no N+1, only the columns shown).
        return await db.SkillGroups.AsNoTracking()
            .OrderBy(g => g.SortOrder)
            .Take(Limits.PublicListMax)
            .Select(g => new SkillGroupDto(g.Id,
                g.Translations.Where(t => t.Locale == locale).Select(t => t.Name).FirstOrDefault()
                ?? g.Translations.Where(t => t.Locale == Locales.Default).Select(t => t.Name).FirstOrDefault() ?? "",
                g.Skills.OrderBy(s => s.SortOrder).Select(s => new SkillDto(s.Id,
                    s.Translations.Where(t => t.Locale == locale).Select(t => t.Name).FirstOrDefault()
                    ?? s.Translations.Where(t => t.Locale == Locales.Default).Select(t => t.Name).FirstOrDefault() ?? "",
                    s.Level,
                    s.Tool != null ? s.Tool.Slug : null)).ToList()))
            .ToListAsync(ct);
    }

    // ---- Groups
    public async Task<Result<IReadOnlyList<SkillGroupAdminDto>>> HandleAsync(ListSkillGroupsAdmin request, CancellationToken ct) =>
        await db.SkillGroups.AsNoTracking()
            .OrderBy(g => g.SortOrder)
            .Take(Limits.PublicListMax)
            .Select(g => new SkillGroupAdminDto(g.Id, g.SortOrder,
                g.Translations.Select(t => new NameTranslationInput(t.Locale, t.Name)).ToList(), g.Skills.Count))
            .ToListAsync(ct);

    public async Task<Result<SkillGroupAdminDto>> HandleAsync(CreateSkillGroup request, CancellationToken ct)
    {
        var group = new SkillGroup { SortOrder = (await db.SkillGroups.MaxAsync(g => (int?)g.SortOrder, ct) ?? -1) + 1 };
        ApplyNames(group.Translations, request.Input.Translations,
            t => new SkillGroupTranslation { Locale = t.Locale, Name = t.Name.Trim() }, (e, t) => e.Name = t.Name.Trim());
        db.SkillGroups.Add(group);
        await db.SaveChangesAsync(ct);
        return ToAdmin(group, skillCount: 0);
    }

    public async Task<Result<SkillGroupAdminDto>> HandleAsync(UpdateSkillGroup request, CancellationToken ct)
    {
        var group = await db.SkillGroups.SingleOrDefaultAsync(g => g.Id == request.Id, ct);
        if (group is null)
            return Error.NotFound("SkillGroup", request.Id);

        ApplyNames(group.Translations, request.Input.Translations,
            t => new SkillGroupTranslation { Locale = t.Locale, Name = t.Name.Trim() }, (e, t) => e.Name = t.Name.Trim());
        await db.SaveChangesAsync(ct);
        return ToAdmin(group, await db.Skills.CountAsync(s => s.SkillGroupId == group.Id, ct));
    }

    public async Task<Result<bool>> HandleAsync(DeleteSkillGroup request, CancellationToken ct)
    {
        var group = await db.SkillGroups.SingleOrDefaultAsync(g => g.Id == request.Id, ct);
        if (group is null)
            return Error.NotFound("SkillGroup", request.Id);
        if (await db.Skills.AnyAsync(s => s.SkillGroupId == group.Id, ct))
            return Error.Conflict("SkillGroup.NotEmpty", "Move or delete the skills in this group first.");

        db.SkillGroups.Remove(group);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<Result<bool>> HandleAsync(ReorderSkillGroups request, CancellationToken ct)
    {
        var result = await ContentHelpers.ReorderAsync(db.SkillGroups, request.Ids, db, ct);
        return result.IsSuccess ? true : result.Error!;
    }

    // ---- Skills
    public async Task<Result<PagedResult<SkillAdminDto>>> HandleAsync(ListSkillsAdmin request, CancellationToken ct)
    {
        var query = db.Skills.AsNoTracking();
        if (request.SkillGroupId is { } groupId)
            query = query.Where(s => s.SkillGroupId == groupId);

        return await query.OrderBy(s => s.SortOrder)
            .Select(s => new SkillAdminDto(s.Id, s.SkillGroupId, s.ToolId, s.Level, s.SortOrder,
                s.Translations.Select(t => new NameTranslationInput(t.Locale, t.Name)).ToList()))
            .ToPagedAsync(request.Page, ct);
    }

    public async Task<Result<SkillAdminDto>> HandleAsync(CreateSkill request, CancellationToken ct)
    {
        if (await CheckReferences(request.Input, ct) is { } error)
            return error;

        var skill = new Skill
        {
            SortOrder = (await db.Skills.Where(s => s.SkillGroupId == request.Input.SkillGroupId)
                .MaxAsync(s => (int?)s.SortOrder, ct) ?? -1) + 1,
        };
        Apply(skill, request.Input);
        db.Skills.Add(skill);
        await db.SaveChangesAsync(ct);
        return ToAdmin(skill);
    }

    public async Task<Result<SkillAdminDto>> HandleAsync(UpdateSkill request, CancellationToken ct)
    {
        var skill = await db.Skills.SingleOrDefaultAsync(s => s.Id == request.Id, ct);
        if (skill is null)
            return Error.NotFound("Skill", request.Id);
        if (await CheckReferences(request.Input, ct) is { } error)
            return error;

        Apply(skill, request.Input);
        await db.SaveChangesAsync(ct);
        return ToAdmin(skill);
    }

    public async Task<Result<bool>> HandleAsync(DeleteSkill request, CancellationToken ct)
    {
        var skill = await db.Skills.SingleOrDefaultAsync(s => s.Id == request.Id, ct);
        if (skill is null)
            return Error.NotFound("Skill", request.Id);

        db.Skills.Remove(skill);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<Result<bool>> HandleAsync(ReorderSkills request, CancellationToken ct)
    {
        var result = await ContentHelpers.ReorderAsync(db.Skills, request.Ids, db, ct);
        return result.IsSuccess ? true : result.Error!;
    }

    private async Task<Error?> CheckReferences(SkillInput input, CancellationToken ct)
    {
        var errors = new Dictionary<string, string[]>();
        if (!await db.SkillGroups.AnyAsync(g => g.Id == input.SkillGroupId, ct))
            errors["skillGroupId"] = ["This skill group doesn't exist."];
        if (input.ToolId is { } toolId && !await db.Tools.AnyAsync(t => t.Id == toolId, ct))
            errors["toolId"] = ["This tool doesn't exist."];
        return errors.Count > 0 ? Error.Validation(errors) : null;
    }

    private static void Apply(Skill skill, SkillInput input)
    {
        skill.SkillGroupId = input.SkillGroupId;
        skill.ToolId = input.ToolId;
        skill.Level = input.Level;
        ApplyNames(skill.Translations, input.Translations,
            t => new SkillTranslation { Locale = t.Locale, Name = t.Name.Trim() }, (e, t) => e.Name = t.Name.Trim());
    }

    private static void ApplyNames<T>(ICollection<T> existing, IReadOnlyList<NameTranslationInput> inputs,
        Func<NameTranslationInput, T> create, Action<T, NameTranslationInput> update) where T : ITranslation =>
        ContentHelpers.SyncTranslations(existing, inputs, t => t.Locale, create, update);

    private static SkillGroupAdminDto ToAdmin(SkillGroup g, int skillCount) => new(g.Id, g.SortOrder,
        [.. g.Translations.Select(t => new NameTranslationInput(t.Locale, t.Name))], skillCount);

    private static SkillAdminDto ToAdmin(Skill s) => new(s.Id, s.SkillGroupId, s.ToolId, s.Level, s.SortOrder,
        [.. s.Translations.Select(t => new NameTranslationInput(t.Locale, t.Name))]);
}
