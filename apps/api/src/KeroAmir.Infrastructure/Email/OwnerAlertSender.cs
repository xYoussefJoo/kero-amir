using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace KeroAmir.Infrastructure.Email;

/// <summary>
/// Background worker: takes alerts off the queue and emails them, one at a time, with a few retries. Failures are
/// logged and never reach the visitor (the form already answered).
/// </summary>
public sealed partial class OwnerAlertSender(
    OwnerAlertChannel queue, IServiceScopeFactory scopes, IOptions<EmailOptions> options, ILogger<OwnerAlertSender> logger)
    : BackgroundService
{
    private static readonly TimeSpan[] RetryDelays = [TimeSpan.FromSeconds(5), TimeSpan.FromSeconds(30), TimeSpan.FromMinutes(2)];

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var alert in queue.Reader.ReadAllAsync(stoppingToken))
        {
            if (!options.Value.IsConfigured)
            {
                LogNotConfigured(logger, alert.Subject);
                continue;
            }

            var text = options.Value.DashboardUrl is { Length: > 0 } url ? $"{alert.Text}\n\n{url}" : alert.Text;
            for (var attempt = 0; ; attempt++)
            {
                try
                {
                    using var scope = scopes.CreateScope();
                    await scope.ServiceProvider.GetRequiredService<ResendEmailClient>().SendAsync(alert.Subject, text, stoppingToken);
                    break;
                }
                catch (Exception ex) when (ex is not OperationCanceledException && attempt < RetryDelays.Length)
                {
                    LogRetry(logger, ex, alert.Subject, attempt + 1);
                    await Task.Delay(RetryDelays[attempt], stoppingToken);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    LogGaveUp(logger, ex, alert.Subject);
                    break;
                }
            }
        }
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Email alerts are not configured (Email:ResendApiKey, Email:To); not sent: {Subject}")]
    private static partial void LogNotConfigured(ILogger logger, string subject);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Sending alert '{Subject}' failed (attempt {Attempt}); retrying")]
    private static partial void LogRetry(ILogger logger, Exception ex, string subject, int attempt);

    [LoggerMessage(Level = LogLevel.Error, Message = "Gave up sending alert '{Subject}'")]
    private static partial void LogGaveUp(ILogger logger, Exception ex, string subject);
}
