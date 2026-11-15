namespace KeroAmir.Application.Common.Abstractions;

/// <summary>A short alert for Kero (new message, new review). Plain text: visitor input is never rendered as HTML.</summary>
public sealed record OwnerNotification(string Subject, string Text);

/// <summary>
/// Queues an alert and returns at once: the visitor's request never waits for email, and a mail outage never fails
/// a form. Delivery happens in the background (Infrastructure).
/// </summary>
public interface IOwnerNotifier
{
    void Notify(OwnerNotification notification);
}
