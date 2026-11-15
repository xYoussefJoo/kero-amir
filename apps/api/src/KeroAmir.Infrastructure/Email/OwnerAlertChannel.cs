using System.Threading.Channels;
using KeroAmir.Application.Common.Abstractions;

namespace KeroAmir.Infrastructure.Email;

/// <summary>
/// In-memory queue between the request (which only enqueues) and <see cref="OwnerAlertSender"/>. Bounded: if mail is
/// down for a long time, the oldest alerts are dropped instead of using up memory. Everything is still in the
/// dashboard, so a lost alert never means a lost message.
/// </summary>
public sealed class OwnerAlertChannel : IOwnerNotifier
{
    private readonly Channel<OwnerNotification> _channel = Channel.CreateBounded<OwnerNotification>(
        new BoundedChannelOptions(100) { FullMode = BoundedChannelFullMode.DropOldest, SingleReader = true });

    public ChannelReader<OwnerNotification> Reader => _channel.Reader;

    public void Notify(OwnerNotification notification) => _channel.Writer.TryWrite(notification);
}
