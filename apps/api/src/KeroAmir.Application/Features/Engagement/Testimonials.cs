using FluentValidation;
using KeroAmir.Application.Common.Abstractions;
using KeroAmir.Application.Common.Content;
using KeroAmir.Application.Common.Messaging;
using KeroAmir.Application.Common.Paging;
using KeroAmir.Application.Common.Results;
using KeroAmir.Domain.Common;
using KeroAmir.Domain.Engagement;
using Microsoft.EntityFrameworkCore;

namespace KeroAmir.Application.Features.Engagement;

// ---- Contracts
/// <summary><see cref="Website"/> is a honeypot: a hidden field humans never fill. Any value means a bot.</summary>
public sealed record TestimonialInput(
    string AuthorName, string? Role, string? Company, string? CountryCode, int Rating, string Text, string Locale,
    string? Website);

public sealed record TestimonialDto(
    Guid Id, string AuthorName, string? Role, string? Company, string? CountryCode, int Rating, string Text,
    bool IsFeatured, DateTimeOffset CreatedAt);

public sealed record TestimonialAdminDto(
    Guid Id, string AuthorName, string? Role, string? Company, string? CountryCode, int Rating, string Text, string Locale,
    ModerationStatus Status, bool IsFeatured, DateTimeOffset CreatedAt);

public sealed record ModerationBody(ModerationStatus Status, bool IsFeatured);

public sealed record SubmitTestimonial(TestimonialInput Input, string? ClientIp);
public sealed record ListTestimonials;
public sealed record ListTestimonialsAdmin(ModerationStatus? Status, PageRequest Page);
public sealed record ModerateTestimonial(Guid Id, ModerationStatus Status, bool IsFeatured);
public sealed record DeleteTestimonial(Guid Id);

internal sealed class TestimonialInputValidator : AbstractValidator<TestimonialInput>
{
    public TestimonialInputValidator()
    {
        RuleFor(x => x.AuthorName).NotEmpty().MaximumLength(80);
        RuleFor(x => x.Role).MaximumLength(80);
        RuleFor(x => x.Company).MaximumLength(80);
        RuleFor(x => x.CountryCode).Matches("^[A-Z]{2}$").When(x => !string.IsNullOrEmpty(x.CountryCode));
        RuleFor(x => x.Rating).InclusiveBetween(Testimonial.MinRating, Testimonial.MaxRating);
        RuleFor(x => x.Text).NotEmpty().MinimumLength(20).MaximumLength(600);
        RuleFor(x => x.Locale).Must(Locales.IsSupported);
        RuleFor(x => x.Website).MaximumLength(200);
    }
}

// ---- Handlers
internal sealed class TestimonialHandlers(IAppDbContext db, IOwnerNotifier notifier) :
    IHandler<SubmitTestimonial, SubmissionAccepted>,
    IHandler<ListTestimonials, IReadOnlyList<TestimonialDto>>,
    IHandler<ListTestimonialsAdmin, PagedResult<TestimonialAdminDto>>,
    IHandler<ModerateTestimonial, TestimonialAdminDto>,
    IHandler<DeleteTestimonial, bool>
{
    private const int PublicMax = 50;

    public async Task<Result<SubmissionAccepted>> HandleAsync(SubmitTestimonial request, CancellationToken ct)
    {
        var input = request.Input;
        if (string.IsNullOrEmpty(input.Website))
        {
            db.Testimonials.Add(new Testimonial
            {
                AuthorName = input.AuthorName.Trim(),
                Role = Blank(input.Role),
                Company = Blank(input.Company),
                CountryCode = Blank(input.CountryCode),
                Rating = input.Rating,
                Text = input.Text.Trim(),
                Locale = input.Locale,
                IpHash = Fingerprint.HashIp(request.ClientIp),
            });
            await db.SaveChangesAsync(ct);
            notifier.Notify(OwnerAlerts.NewReview(input));
        }
        // Same answer for humans and honeypot-caught bots.
        return new SubmissionAccepted("pending");
    }

    public async Task<Result<IReadOnlyList<TestimonialDto>>> HandleAsync(ListTestimonials request, CancellationToken ct) =>
        await db.Testimonials.AsNoTracking()
            .Where(t => t.Status == ModerationStatus.Approved)
            .OrderByDescending(t => t.IsFeatured).ThenByDescending(t => t.CreatedAt)
            .Take(PublicMax)
            .Select(t => new TestimonialDto(t.Id, t.AuthorName, t.Role, t.Company, t.CountryCode, t.Rating, t.Text, t.IsFeatured, t.CreatedAt))
            .ToListAsync(ct);

    public async Task<Result<PagedResult<TestimonialAdminDto>>> HandleAsync(ListTestimonialsAdmin request, CancellationToken ct)
    {
        var query = db.Testimonials.AsNoTracking();
        if (request.Status is { } status)
            query = query.Where(t => t.Status == status);
        return await Admin(query.OrderByDescending(t => t.CreatedAt)).ToPagedAsync(request.Page, ct);
    }

    public async Task<Result<TestimonialAdminDto>> HandleAsync(ModerateTestimonial request, CancellationToken ct)
    {
        var testimonial = await db.Testimonials.SingleOrDefaultAsync(t => t.Id == request.Id, ct);
        if (testimonial is null)
            return Error.NotFound("Testimonial", request.Id);
        testimonial.Status = request.Status;
        testimonial.IsFeatured = request.Status == ModerationStatus.Approved && request.IsFeatured;
        await db.SaveChangesAsync(ct);
        return await Admin(db.Testimonials.AsNoTracking().Where(t => t.Id == request.Id)).SingleAsync(ct);
    }

    public async Task<Result<bool>> HandleAsync(DeleteTestimonial request, CancellationToken ct)
    {
        var testimonial = await db.Testimonials.SingleOrDefaultAsync(t => t.Id == request.Id, ct);
        if (testimonial is null)
            return Error.NotFound("Testimonial", request.Id);
        db.Testimonials.Remove(testimonial);
        await db.SaveChangesAsync(ct);
        return true;
    }

    private static IQueryable<TestimonialAdminDto> Admin(IQueryable<Testimonial> query) =>
        query.Select(t => new TestimonialAdminDto(t.Id, t.AuthorName, t.Role, t.Company, t.CountryCode, t.Rating, t.Text,
            t.Locale, t.Status, t.IsFeatured, t.CreatedAt));

    private static string? Blank(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
