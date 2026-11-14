using KeroAmir.Application.Common.Abstractions;
using KeroAmir.Application.Common.Messaging;
using KeroAmir.Application.Common.Results;
using KeroAmir.Domain.Engagement;
using KeroAmir.Domain.Projects;
using Microsoft.EntityFrameworkCore;

namespace KeroAmir.Application.Features.Dashboard;

// ---- Contracts
public sealed record ProjectCounts(int Published, int Drafts);
public sealed record ReviewCounts(int Pending, int Approved, int Rejected);
public sealed record InboxCounts(int New, int Total);
public sealed record ContentCounts(int Categories, int Tools, int Skills, int TimelineEntries);

public sealed record MessagePreview(Guid Id, string Name, string? Service, string Excerpt, DateTimeOffset CreatedAt);
public sealed record ReviewPreview(Guid Id, string AuthorName, int Rating, string Excerpt, DateTimeOffset CreatedAt);

/// <summary>Everything the dashboard home shows, in one response (one round trip from the web server).</summary>
public sealed record DashboardOverview(
    ProjectCounts Projects, ReviewCounts Reviews, InboxCounts Inbox, ContentCounts Content,
    IReadOnlyList<MessagePreview> LatestMessages, IReadOnlyList<ReviewPreview> PendingReviews);

public sealed record GetDashboardOverview;

// ---- Handler
internal sealed class DashboardHandlers(IAppDbContext db) : IHandler<GetDashboardOverview, DashboardOverview>
{
    private const int ExcerptLength = 140;
    private const int PreviewCount = 5;

    public async Task<Result<DashboardOverview>> HandleAsync(GetDashboardOverview request, CancellationToken ct)
    {
        // Status counts: one GROUP BY per table instead of a COUNT per status.
        var projects = await db.Projects.AsNoTracking().GroupBy(p => p.Status)
            .Select(g => new { g.Key, Count = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.Count, ct);
        var reviews = await db.Testimonials.AsNoTracking().GroupBy(t => t.Status)
            .Select(g => new { g.Key, Count = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.Count, ct);
        var inbox = await db.ContactMessages.AsNoTracking().GroupBy(m => m.Status)
            .Select(g => new { g.Key, Count = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.Count, ct);

        var content = new ContentCounts(
            await db.Categories.CountAsync(ct),
            await db.Tools.CountAsync(ct),
            await db.Skills.CountAsync(ct),
            await db.TimelineEntries.CountAsync(ct));

        var latestMessages = await db.ContactMessages.AsNoTracking()
            .Where(m => m.Status != InboxStatus.Archived)
            .OrderByDescending(m => m.CreatedAt).Take(PreviewCount)
            .Select(m => new { m.Id, m.Name, m.Service, Text = m.Message.Substring(0, ExcerptLength), Long = m.Message.Length > ExcerptLength, m.CreatedAt })
            .ToListAsync(ct);

        var pendingReviews = await db.Testimonials.AsNoTracking()
            .Where(t => t.Status == ModerationStatus.Pending)
            .OrderByDescending(t => t.CreatedAt).Take(PreviewCount)
            .Select(t => new { t.Id, t.AuthorName, t.Rating, Text = t.Text.Substring(0, ExcerptLength), Long = t.Text.Length > ExcerptLength, t.CreatedAt })
            .ToListAsync(ct);

        return new DashboardOverview(
            new ProjectCounts(projects.GetValueOrDefault(PublishStatus.Published), projects.GetValueOrDefault(PublishStatus.Draft)),
            new ReviewCounts(reviews.GetValueOrDefault(ModerationStatus.Pending), reviews.GetValueOrDefault(ModerationStatus.Approved),
                reviews.GetValueOrDefault(ModerationStatus.Rejected)),
            new InboxCounts(inbox.GetValueOrDefault(InboxStatus.New), inbox.Values.Sum()),
            content,
            [.. latestMessages.Select(m => new MessagePreview(m.Id, m.Name, m.Service, Excerpt(m.Text, m.Long), m.CreatedAt))],
            [.. pendingReviews.Select(t => new ReviewPreview(t.Id, t.AuthorName, t.Rating, Excerpt(t.Text, t.Long), t.CreatedAt))]);
    }

    // Only the first ExcerptLength characters leave the database; long texts get an ellipsis.
    private static string Excerpt(string text, bool truncated) => truncated ? text + "…" : text;
}
