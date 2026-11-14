using KeroAmir.Api.Infrastructure;
using KeroAmir.Application.Common.Content;
using KeroAmir.Application.Common.Messaging;
using KeroAmir.Application.Common.Paging;
using KeroAmir.Application.Features.Skills;

namespace KeroAmir.Api.Endpoints;

public static class SkillEndpoints
{
    public static void MapSkillEndpoints(this RouteGroupBuilder v1, RouteGroupBuilder admin)
    {
        v1.MapGet("/skills", (string? locale, IHandler<ListSkills, IReadOnlyList<SkillGroupDto>> h, CancellationToken ct) =>
                h.Ok(new ListSkills(locale ?? ""), ct))
            .WithTags("Skills").CachedAs(ContentCache.Skills)
            .Produces<IReadOnlyList<SkillGroupDto>>();

        // ---- Groups
        var groups = admin.MapGroup("/skill-groups").WithTags("Admin: Skills");

        groups.MapGet("/", (IHandler<ListSkillGroupsAdmin, IReadOnlyList<SkillGroupAdminDto>> h, CancellationToken ct) =>
                h.Ok(new ListSkillGroupsAdmin(), ct))
            .Produces<IReadOnlyList<SkillGroupAdminDto>>();

        groups.MapPost("/", (SkillGroupInput body, IHandler<CreateSkillGroup, SkillGroupAdminDto> h, CancellationToken ct) =>
                h.Created(new CreateSkillGroup(body), g => $"/api/v1/admin/skill-groups/{g.Id}", ct))
            .Validate<SkillGroupInput>().Evicts(ContentCache.Skills)
            .Produces<SkillGroupAdminDto>(StatusCodes.Status201Created);

        groups.MapPut("/{id:guid}", (Guid id, SkillGroupInput body, IHandler<UpdateSkillGroup, SkillGroupAdminDto> h, CancellationToken ct) =>
                h.Ok(new UpdateSkillGroup(id, body), ct))
            .Validate<SkillGroupInput>().Evicts(ContentCache.Skills)
            .Produces<SkillGroupAdminDto>().ProducesProblem(StatusCodes.Status404NotFound);

        groups.MapDelete("/{id:guid}", (Guid id, IHandler<DeleteSkillGroup, bool> h, CancellationToken ct) =>
                h.NoContent(new DeleteSkillGroup(id), ct))
            .Evicts(ContentCache.Skills)
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound).ProducesProblem(StatusCodes.Status409Conflict);

        groups.MapPut("/order", (ReorderRequest body, IHandler<ReorderSkillGroups, bool> h, CancellationToken ct) =>
                h.NoContent(new ReorderSkillGroups(body.Ids), ct))
            .Validate<ReorderRequest>().Evicts(ContentCache.Skills)
            .Produces(StatusCodes.Status204NoContent);

        // ---- Skills
        var skills = admin.MapGroup("/skills").WithTags("Admin: Skills");

        skills.MapGet("/", (Guid? skillGroupId, [AsParameters] PageRequest page,
                    IHandler<ListSkillsAdmin, PagedResult<SkillAdminDto>> h, CancellationToken ct) =>
                h.Ok(new ListSkillsAdmin(skillGroupId, page), ct))
            .Produces<PagedResult<SkillAdminDto>>();

        skills.MapPost("/", (SkillInput body, IHandler<CreateSkill, SkillAdminDto> h, CancellationToken ct) =>
                h.Created(new CreateSkill(body), s => $"/api/v1/admin/skills/{s.Id}", ct))
            .Validate<SkillInput>().Evicts(ContentCache.Skills)
            .Produces<SkillAdminDto>(StatusCodes.Status201Created);

        skills.MapPut("/{id:guid}", (Guid id, SkillInput body, IHandler<UpdateSkill, SkillAdminDto> h, CancellationToken ct) =>
                h.Ok(new UpdateSkill(id, body), ct))
            .Validate<SkillInput>().Evicts(ContentCache.Skills)
            .Produces<SkillAdminDto>().ProducesProblem(StatusCodes.Status404NotFound);

        skills.MapDelete("/{id:guid}", (Guid id, IHandler<DeleteSkill, bool> h, CancellationToken ct) =>
                h.NoContent(new DeleteSkill(id), ct))
            .Evicts(ContentCache.Skills)
            .Produces(StatusCodes.Status204NoContent).ProducesProblem(StatusCodes.Status404NotFound);

        skills.MapPut("/order", (ReorderRequest body, IHandler<ReorderSkills, bool> h, CancellationToken ct) =>
                h.NoContent(new ReorderSkills(body.Ids), ct))
            .Validate<ReorderRequest>().Evicts(ContentCache.Skills)
            .Produces(StatusCodes.Status204NoContent);
    }
}
