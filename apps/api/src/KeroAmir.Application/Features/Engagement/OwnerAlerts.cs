using KeroAmir.Application.Common.Abstractions;

namespace KeroAmir.Application.Features.Engagement;

/// <summary>The alert texts for new submissions. The dashboard link is added by the sender.</summary>
public static class OwnerAlerts
{
    private const int Preview = 600;

    public static OwnerNotification NewMessage(ContactInput m) => new(
        $"New project enquiry from {OneLine(m.Name)}",
        string.Join('\n', new[]
        {
            $"From: {OneLine(m.Name)} <{OneLine(m.Email)}>",
            m.Company is { Length: > 0 } c ? $"Company: {OneLine(c)}" : null,
            m.Service is { Length: > 0 } s ? $"Service: {s.Replace('-', ' ')}" : null,
            m.Budget is { Length: > 0 } b ? $"Budget: {b}" : null,
            "",
            Cut(m.Message),
            "",
            "Reply from the dashboard inbox.",
        }.Where(line => line is not null)));

    public static OwnerNotification NewReview(TestimonialInput r) => new(
        $"New {r.Rating}-star review from {OneLine(r.AuthorName)}: waiting for approval",
        string.Join('\n',
            $"{new string('★', Math.Clamp(r.Rating, 0, 5))} from {OneLine(r.AuthorName)}" +
                (r.Company is { Length: > 0 } c ? $", {OneLine(c)}" : ""),
            "",
            Cut(r.Text),
            "",
            "It shows on the site only after you approve it in the dashboard."));

    // Subjects and header-like lines must stay on one line (no header injection via names).
    private static string OneLine(string value) => value.Replace('\r', ' ').Replace('\n', ' ').Trim();

    private static string Cut(string text) => text.Length <= Preview ? text.Trim() : text[..Preview].TrimEnd() + "…";
}
