using KeroAmir.Api.Infrastructure;
using KeroAmir.Application.Common.Content;
using KeroAmir.Application.Common.Messaging;
using KeroAmir.Application.Common.Paging;
using KeroAmir.Application.Features.Tools;

namespace KeroAmir.Api.Endpoints;

public static class ToolEndpoints
{
    public static void MapToolEndpoints(this RouteGroupBuilder v1, RouteGroupBuilder admin)
    {
        v1.MapGet("/tools", (IHandler<ListTools, IReadOnlyList<ToolDto>> h, CancellationToken ct) =>
                h.Ok(new ListTools(), ct))
            .WithTags("Tools").CachedAs(ContentCache.Tools)
            .Produces<IReadOnlyList<ToolDto>>();

        var g = admin.MapGroup("/tools").WithTags("Admin: Tools");

        g.MapGet("/", ([AsParameters] PageRequest page, IHandler<ListToolsAdmin, PagedResult<ToolAdminDto>> h, CancellationToken ct) =>
                h.Ok(new ListToolsAdmin(page), ct))
            .Produces<PagedResult<ToolAdminDto>>();

        g.MapGet("/{id:guid}", (Guid id, IHandler<GetTool, ToolAdminDto> h, CancellationToken ct) =>
                h.Ok(new GetTool(id), ct))
            .Produces<ToolAdminDto>().ProducesProblem(StatusCodes.Status404NotFound);

        g.MapPost("/", (ToolInput body, IHandler<CreateTool, ToolAdminDto> h, CancellationToken ct) =>
                h.Created(new CreateTool(body), t => $"/api/v1/admin/tools/{t.Id}", ct))
            .Validate<ToolInput>().Evicts(ContentCache.Tools, ContentCache.Skills, ContentCache.Projects)
            .Produces<ToolAdminDto>(StatusCodes.Status201Created).ProducesProblem(StatusCodes.Status409Conflict);

        g.MapPut("/{id:guid}", (Guid id, ToolInput body, IHandler<UpdateTool, ToolAdminDto> h, CancellationToken ct) =>
                h.Ok(new UpdateTool(id, body), ct))
            .Validate<ToolInput>().Evicts(ContentCache.Tools, ContentCache.Skills, ContentCache.Projects)
            .Produces<ToolAdminDto>().ProducesProblem(StatusCodes.Status404NotFound).ProducesProblem(StatusCodes.Status409Conflict);

        g.MapDelete("/{id:guid}", (Guid id, IHandler<DeleteTool, bool> h, CancellationToken ct) =>
                h.NoContent(new DeleteTool(id), ct))
            .Evicts(ContentCache.Tools, ContentCache.Skills, ContentCache.Projects)
            .Produces(StatusCodes.Status204NoContent).ProducesProblem(StatusCodes.Status404NotFound);

        g.MapPut("/order", (ReorderRequest body, IHandler<ReorderTools, bool> h, CancellationToken ct) =>
                h.NoContent(new ReorderTools(body.Ids), ct))
            .Validate<ReorderRequest>().Evicts(ContentCache.Tools, ContentCache.Projects)
            .Produces(StatusCodes.Status204NoContent);
    }
}
