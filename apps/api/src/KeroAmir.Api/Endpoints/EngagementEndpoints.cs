using KeroAmir.Api.Infrastructure;
using KeroAmir.Application.Common.Content;
using KeroAmir.Application.Common.Messaging;
using KeroAmir.Application.Common.Paging;
using KeroAmir.Application.Features.Engagement;
using KeroAmir.Domain.Engagement;

namespace KeroAmir.Api.Endpoints;

public static class EngagementEndpoints
{
    public static void MapEngagementEndpoints(this RouteGroupBuilder v1, RouteGroupBuilder admin)
    {
        // ---- Testimonials: public read (approved only) + submit to moderation
        v1.MapGet("/testimonials", (IHandler<ListTestimonials, IReadOnlyList<TestimonialDto>> h, CancellationToken ct) =>
                h.Ok(new ListTestimonials(), ct))
            .WithTags("Testimonials").CachedAs(ContentCache.Testimonials)
            .Produces<IReadOnlyList<TestimonialDto>>();

        v1.MapPost("/testimonials", (TestimonialInput body, HttpContext http,
                    IHandler<SubmitTestimonial, SubmissionAccepted> h, CancellationToken ct) =>
                h.Accepted(new SubmitTestimonial(body, ClientIp.Get(http)), ct))
            .WithTags("Testimonials").RequireRateLimiting(AuthSetup.FormsRateLimit)
            .Validate<TestimonialInput>()
            .Produces<SubmissionAccepted>(StatusCodes.Status202Accepted).Produces(StatusCodes.Status429TooManyRequests);

        // ---- Contact: public submit
        v1.MapPost("/contact", (ContactInput body, HttpContext http,
                    IHandler<SubmitContact, SubmissionAccepted> h, CancellationToken ct) =>
                h.Accepted(new SubmitContact(body, ClientIp.Get(http)), ct))
            .WithTags("Contact").RequireRateLimiting(AuthSetup.FormsRateLimit)
            .Validate<ContactInput>()
            .Produces<SubmissionAccepted>(StatusCodes.Status202Accepted).Produces(StatusCodes.Status429TooManyRequests);

        // ---- Admin: moderation queue and inbox
        var testimonials = admin.MapGroup("/testimonials").WithTags("Admin: Testimonials");

        testimonials.MapGet("/", (ModerationStatus? status, [AsParameters] PageRequest page,
                    IHandler<ListTestimonialsAdmin, PagedResult<TestimonialAdminDto>> h, CancellationToken ct) =>
                h.Ok(new ListTestimonialsAdmin(status, page), ct))
            .Produces<PagedResult<TestimonialAdminDto>>();

        testimonials.MapPut("/{id:guid}/moderation", (Guid id, ModerationBody body,
                    IHandler<ModerateTestimonial, TestimonialAdminDto> h, CancellationToken ct) =>
                h.Ok(new ModerateTestimonial(id, body.Status, body.IsFeatured), ct))
            .Evicts(ContentCache.Testimonials)
            .Produces<TestimonialAdminDto>().ProducesProblem(StatusCodes.Status404NotFound);

        testimonials.MapDelete("/{id:guid}", (Guid id, IHandler<DeleteTestimonial, bool> h, CancellationToken ct) =>
                h.NoContent(new DeleteTestimonial(id), ct))
            .Evicts(ContentCache.Testimonials)
            .Produces(StatusCodes.Status204NoContent).ProducesProblem(StatusCodes.Status404NotFound);

        var inbox = admin.MapGroup("/messages").WithTags("Admin: Inbox");

        inbox.MapGet("/", (InboxStatus? status, [AsParameters] PageRequest page,
                    IHandler<ListContactMessages, PagedResult<ContactMessageDto>> h, CancellationToken ct) =>
                h.Ok(new ListContactMessages(status, page), ct))
            .Produces<PagedResult<ContactMessageDto>>();

        inbox.MapPut("/{id:guid}/status", (Guid id, InboxStatusBody body,
                    IHandler<SetContactStatus, ContactMessageDto> h, CancellationToken ct) =>
                h.Ok(new SetContactStatus(id, body.Status), ct))
            .Produces<ContactMessageDto>().ProducesProblem(StatusCodes.Status404NotFound);
    }
}
