using KeroAmir.Api.Infrastructure;
using KeroAmir.Application.Common.Content;
using KeroAmir.Application.Common.Messaging;
using KeroAmir.Application.Common.Paging;
using KeroAmir.Application.Features.Projects;

namespace KeroAmir.Api.Endpoints;

public static class ProjectEndpoints
{
    public static void MapProjectEndpoints(this RouteGroupBuilder v1, RouteGroupBuilder admin)
    {
        var pub = v1.MapGroup("/projects").WithTags("Projects");

        pub.MapGet("/", (string? locale, string? category, string? tool, [AsParameters] PageRequest page,
                    IHandler<ListProjects, PagedResult<ProjectCardDto>> h, CancellationToken ct) =>
                h.Ok(new ListProjects(locale ?? "", category, tool, page), ct))
            .CachedAs(ContentCache.Projects)
            .Produces<PagedResult<ProjectCardDto>>();

        pub.MapGet("/{slug}", (string slug, string? locale, IHandler<GetProject, ProjectCardDto> h, CancellationToken ct) =>
                h.Ok(new GetProject(slug, locale ?? ""), ct))
            .CachedAs(ContentCache.Projects)
            .Produces<ProjectCardDto>().ProducesProblem(StatusCodes.Status404NotFound);

        var g = admin.MapGroup("/projects").WithTags("Admin: Projects");

        g.MapGet("/", ([AsParameters] PageRequest page, IHandler<ListProjectsAdmin, PagedResult<ProjectAdminDto>> h, CancellationToken ct) =>
                h.Ok(new ListProjectsAdmin(page), ct))
            .Produces<PagedResult<ProjectAdminDto>>();

        g.MapPost("/", (ProjectInput body, IHandler<CreateProject, ProjectAdminDto> h, CancellationToken ct) =>
                h.Created(new CreateProject(body), p => $"/api/v1/admin/projects/{p.Id}", ct))
            .Validate<ProjectInput>().Evicts(ContentCache.Projects)
            .Produces<ProjectAdminDto>(StatusCodes.Status201Created).ProducesProblem(StatusCodes.Status409Conflict);

        g.MapPut("/{id:guid}", (Guid id, ProjectInput body, IHandler<UpdateProject, ProjectAdminDto> h, CancellationToken ct) =>
                h.Ok(new UpdateProject(id, body), ct))
            .Validate<ProjectInput>().Evicts(ContentCache.Projects)
            .Produces<ProjectAdminDto>().ProducesProblem(StatusCodes.Status404NotFound).ProducesProblem(StatusCodes.Status409Conflict);

        g.MapPut("/{id:guid}/status", (Guid id, ProjectStatusBody body, IHandler<SetProjectStatus, ProjectAdminDto> h, CancellationToken ct) =>
                h.Ok(new SetProjectStatus(id, body.Status), ct))
            .Evicts(ContentCache.Projects)
            .Produces<ProjectAdminDto>().ProducesProblem(StatusCodes.Status404NotFound);

        g.MapDelete("/{id:guid}", (Guid id, IHandler<DeleteProject, bool> h, CancellationToken ct) =>
                h.NoContent(new DeleteProject(id), ct))
            .Evicts(ContentCache.Projects)
            .Produces(StatusCodes.Status204NoContent).ProducesProblem(StatusCodes.Status404NotFound);

        g.MapPut("/order", (ReorderRequest body, IHandler<ReorderProjects, bool> h, CancellationToken ct) =>
                h.NoContent(new ReorderProjects(body.Ids), ct))
            .Validate<ReorderRequest>().Evicts(ContentCache.Projects)
            .Produces(StatusCodes.Status204NoContent);
    }
}
