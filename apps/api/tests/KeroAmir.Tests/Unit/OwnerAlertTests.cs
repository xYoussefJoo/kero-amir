using System.Net;
using System.Text.Json;
using KeroAmir.Application.Features.Engagement;
using KeroAmir.Infrastructure.Email;
using Microsoft.Extensions.Options;

namespace KeroAmir.Tests.Unit;

public class OwnerAlertTests
{
    [Fact]
    public void Message_alert_keeps_the_subject_on_one_line_and_lists_the_details()
    {
        var alert = OwnerAlerts.NewMessage(new ContactInput(
            "Jonas\r\nBcc: spam@example.com", "jonas@example.com", "Backhaus", "brand-identity", "3k-10k",
            "We need a full identity for our bakery chain.", "de", null));

        Assert.DoesNotContain('\n', alert.Subject);
        Assert.DoesNotContain('\r', alert.Subject);
        Assert.Contains("From: Jonas  Bcc: spam@example.com <jonas@example.com>", alert.Text);
        Assert.Contains("Service: brand identity", alert.Text);
        Assert.Contains("Budget: 3k-10k", alert.Text);
        Assert.Contains("We need a full identity for our bakery chain.", alert.Text);
    }

    [Fact]
    public void Review_alert_shows_the_rating_and_a_shortened_text()
    {
        var alert = OwnerAlerts.NewReview(new TestimonialInput("Mia", "CEO", "Studio M", "DE", 4, new string('x', 900), "en", null));

        Assert.Equal("New 4-star review from Mia: waiting for approval", alert.Subject);
        Assert.Contains("★★★★ from Mia, Studio M", alert.Text);
        Assert.Contains(new string('x', 600) + "…", alert.Text);
        Assert.DoesNotContain(new string('x', 601), alert.Text);
    }

    [Fact]
    public async Task Resend_gets_the_key_the_addresses_and_plain_text()
    {
        var handler = new CaptureHandler();
        var options = Options.Create(new EmailOptions { ResendApiKey = "re_test", To = "kero@example.com", From = "Site <alerts@example.com>" });
        var client = new ResendEmailClient(new HttpClient(handler) { BaseAddress = new Uri("https://api.resend.com/") }, options);

        await client.SendAsync("Subject", "Body text", TestContext.Current.CancellationToken);

        Assert.Equal("https://api.resend.com/emails", handler.Request!.RequestUri!.ToString());
        Assert.Equal(("Bearer", "re_test"), (handler.Request.Headers.Authorization!.Scheme, handler.Request.Headers.Authorization.Parameter));
        using var body = JsonDocument.Parse(handler.Body!);
        Assert.Equal("Site <alerts@example.com>", body.RootElement.GetProperty("from").GetString());
        Assert.Equal("kero@example.com", body.RootElement.GetProperty("to")[0].GetString());
        Assert.Equal("Body text", body.RootElement.GetProperty("text").GetString());
        Assert.False(body.RootElement.TryGetProperty("html", out _));
    }

    [Fact]
    public void Alerts_are_off_until_a_key_and_an_address_are_set()
    {
        Assert.False(new EmailOptions().IsConfigured);
        Assert.False(new EmailOptions { ResendApiKey = "re_x" }.IsConfigured);
        Assert.True(new EmailOptions { ResendApiKey = "re_x", To = "kero@example.com" }.IsConfigured);
    }

    private sealed class CaptureHandler : HttpMessageHandler
    {
        public HttpRequestMessage? Request { get; private set; }
        public string? Body { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Request = request;
            Body = await request.Content!.ReadAsStringAsync(ct);
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{\"id\":\"1\"}") };
        }
    }
}
