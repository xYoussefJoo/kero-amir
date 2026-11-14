using KeroAmir.Api.Infrastructure;
using KeroAmir.Application.Common.Content;
using KeroAmir.Application.Common.Messaging;
using KeroAmir.Application.Common.Paging;
using KeroAmir.Application.Features.Categories;

namespace KeroAmir.Api.Endpoints;

public static class CategoryEndpoints
{
    public static void MapCategoryEndpoints(this RouteGroupBuilder v1, RouteGroupBuilder admin)
    {
        v1.MapGet("/categories", (string? locale, IHandler<ListCategories, IReadOnlyList<CategoryDto>> h, CancellationToken ct) =>
                h.Ok(new ListCategories(locale ?? ""), ct))
            .WithTags("Categories").CachedAs(ContentCache.Categories)
            .Produces<IReadOnlyList<CategoryDto>>();

        var g = admin.MapGroup("/categories").WithTags("Admin: Categories");

        g.MapGet("/", ([AsParameters] PageRequest page, IHandler<ListCategoriesAdmin, PagedResult<CategoryAdminDto>> h, CancellationToken ct) =>
                h.Ok(new ListCategoriesAdmin(page), ct))
            .Produces<PagedResult<CategoryAdminDto>>();

        g.MapGet("/{id:guid}", (Guid id, IHandler<GetCategory, CategoryAdminDto> h, CancellationToken ct) =>
                h.Ok(new GetCategory(id), ct))
            .Produces<CategoryAdminDto>().ProducesProblem(StatusCodes.Status404NotFound);

        g.MapPost("/", (CategoryInput body, IHandler<CreateCategory, CategoryAdminDto> h, CancellationToken ct) =>
                h.Created(new CreateCategory(body), c => $"/api/v1/admin/categories/{c.Id}", ct))
            .Validate<CategoryInput>().Evicts(ContentCache.Categories)
            .Produces<CategoryAdminDto>(StatusCodes.Status201Created).ProducesProblem(StatusCodes.Status409Conflict);

        g.MapPut("/{id:guid}", (Guid id, CategoryInput body, IHandler<UpdateCategory, CategoryAdminDto> h, CancellationToken ct) =>
                h.Ok(new UpdateCategory(id, body), ct))
            .Validate<CategoryInput>().Evicts(ContentCache.Categories)
            .Produces<CategoryAdminDto>().ProducesProblem(StatusCodes.Status404NotFound).ProducesProblem(StatusCodes.Status409Conflict);

        g.MapDelete("/{id:guid}", (Guid id, IHandler<DeleteCategory, bool> h, CancellationToken ct) =>
                h.NoContent(new DeleteCategory(id), ct))
            .Evicts(ContentCache.Categories)
            .Produces(StatusCodes.Status204NoContent).ProducesProblem(StatusCodes.Status404NotFound);

        g.MapPut("/order", (ReorderRequest body, IHandler<ReorderCategories, bool> h, CancellationToken ct) =>
                h.NoContent(new ReorderCategories(body.Ids), ct))
            .Validate<ReorderRequest>().Evicts(ContentCache.Categories)
            .Produces(StatusCodes.Status204NoContent);
    }
}
