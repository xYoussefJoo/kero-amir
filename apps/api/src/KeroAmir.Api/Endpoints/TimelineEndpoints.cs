using KeroAmir.Api.Infrastructure;
using KeroAmir.Application.Common.Messaging;
using KeroAmir.Application.Common.Paging;
using KeroAmir.Application.Features.Timeline;

namespace KeroAmir.Api.Endpoints;

public static class TimelineEndpoints
{
    public static void MapTimelineEndpoints(this RouteGroupBuilder v1, RouteGroupBuilder admin)
    {
        v1.MapGet("/timeline", (string? locale, IHandler<ListTimeline, IReadOnlyList<TimelineEntryDto>> h, CancellationToken ct) =>
                h.Ok(new ListTimeline(locale ?? ""), ct))
            .WithTags("Timeline").CachedAs(ContentCache.Timeline)
            .Produces<IReadOnlyList<TimelineEntryDto>>();

        var g = admin.MapGroup("/timeline").WithTags("Admin: Timeline");

        g.MapGet("/", ([AsParameters] PageRequest page, IHandler<ListTimelineAdmin, PagedResult<TimelineEntryAdminDto>> h, CancellationToken ct) =>
                h.Ok(new ListTimelineAdmin(page), ct))
            .Produces<PagedResult<TimelineEntryAdminDto>>();

        g.MapGet("/{id:guid}", (Guid id, IHandler<GetTimelineEntry, TimelineEntryAdminDto> h, CancellationToken ct) =>
                h.Ok(new GetTimelineEntry(id), ct))
            .Produces<TimelineEntryAdminDto>().ProducesProblem(StatusCodes.Status404NotFound);

        g.MapPost("/", (TimelineInput body, IHandler<CreateTimelineEntry, TimelineEntryAdminDto> h, CancellationToken ct) =>
                h.Created(new CreateTimelineEntry(body), e => $"/api/v1/admin/timeline/{e.Id}", ct))
            .Validate<TimelineInput>().Evicts(ContentCache.Timeline)
            .Produces<TimelineEntryAdminDto>(StatusCodes.Status201Created);

        g.MapPut("/{id:guid}", (Guid id, TimelineInput body, IHandler<UpdateTimelineEntry, TimelineEntryAdminDto> h, CancellationToken ct) =>
                h.Ok(new UpdateTimelineEntry(id, body), ct))
            .Validate<TimelineInput>().Evicts(ContentCache.Timeline)
            .Produces<TimelineEntryAdminDto>().ProducesProblem(StatusCodes.Status404NotFound);

        g.MapDelete("/{id:guid}", (Guid id, IHandler<DeleteTimelineEntry, bool> h, CancellationToken ct) =>
                h.NoContent(new DeleteTimelineEntry(id), ct))
            .Evicts(ContentCache.Timeline)
            .Produces(StatusCodes.Status204NoContent).ProducesProblem(StatusCodes.Status404NotFound);
    }
}
