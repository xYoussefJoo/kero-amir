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
public static class ContactOptions
{
    public static readonly IReadOnlyList<string> Budgets = ["under-1k", "1k-3k", "3k-10k", "10k-plus", "not-sure"];
}

/// <summary><see cref="Website"/> is a honeypot: a hidden field humans never fill. Any value means a bot.</summary>
public sealed record ContactInput(
    string Name, string Email, string? Company, string? Service, string? Budget, string Message, string Locale,
    string? Website);

public sealed record ContactMessageDto(
    Guid Id, string Name, string Email, string? Company, string? Service, string? Budget, string Message, string Locale,
    InboxStatus Status, DateTimeOffset CreatedAt);

public sealed record InboxStatusBody(InboxStatus Status);

public sealed record SubmitContact(ContactInput Input, string? ClientIp);
public sealed record ListContactMessages(InboxStatus? Status, PageRequest Page);
public sealed record SetContactStatus(Guid Id, InboxStatus Status);

internal sealed class ContactInputValidator : AbstractValidator<ContactInput>
{
    public ContactInputValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(80);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(200);
        RuleFor(x => x.Company).MaximumLength(100);
        RuleFor(x => x.Service).MaximumLength(80).Matches("^[a-z0-9-]*$").When(x => x.Service is not null);
        RuleFor(x => x.Budget).Must(b => b is null || ContactOptions.Budgets.Contains(b))
            .WithMessage($"Budget must be one of: {string.Join(", ", ContactOptions.Budgets)}.");
        RuleFor(x => x.Message).NotEmpty().MinimumLength(20).MaximumLength(3000);
        RuleFor(x => x.Locale).Must(Locales.IsSupported);
        RuleFor(x => x.Website).MaximumLength(200);
    }
}

// ---- Handlers
internal sealed class ContactHandlers(IAppDbContext db) :
    IHandler<SubmitContact, SubmissionAccepted>,
    IHandler<ListContactMessages, PagedResult<ContactMessageDto>>,
    IHandler<SetContactStatus, ContactMessageDto>
{
    public async Task<Result<SubmissionAccepted>> HandleAsync(SubmitContact request, CancellationToken ct)
    {
        var input = request.Input;
        if (string.IsNullOrEmpty(input.Website))
        {
            db.ContactMessages.Add(new ContactMessage
            {
                Name = input.Name.Trim(),
                Email = input.Email.Trim(),
                Company = string.IsNullOrWhiteSpace(input.Company) ? null : input.Company.Trim(),
                Service = input.Service,
                Budget = input.Budget,
                Message = input.Message.Trim(),
                Locale = input.Locale,
                IpHash = Fingerprint.HashIp(request.ClientIp),
            });
            await db.SaveChangesAsync(ct);
            // Email alert to Kero arrives with the background email queue (IEmailSender, Resend).
        }
        return new SubmissionAccepted("received");
    }

    public async Task<Result<PagedResult<ContactMessageDto>>> HandleAsync(ListContactMessages request, CancellationToken ct)
    {
        var query = db.ContactMessages.AsNoTracking();
        if (request.Status is { } status)
            query = query.Where(m => m.Status == status);
        return await Dto(query.OrderByDescending(m => m.CreatedAt)).ToPagedAsync(request.Page, ct);
    }

    public async Task<Result<ContactMessageDto>> HandleAsync(SetContactStatus request, CancellationToken ct)
    {
        var message = await db.ContactMessages.SingleOrDefaultAsync(m => m.Id == request.Id, ct);
        if (message is null)
            return Error.NotFound("ContactMessage", request.Id);
        message.Status = request.Status;
        await db.SaveChangesAsync(ct);
        return await Dto(db.ContactMessages.AsNoTracking().Where(m => m.Id == request.Id)).SingleAsync(ct);
    }

    private static IQueryable<ContactMessageDto> Dto(IQueryable<ContactMessage> query) =>
        query.Select(m => new ContactMessageDto(m.Id, m.Name, m.Email, m.Company, m.Service, m.Budget, m.Message, m.Locale,
            m.Status, m.CreatedAt));
}
