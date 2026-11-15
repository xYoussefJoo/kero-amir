using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using KeroAmir.Application.Features.Account;
using KeroAmir.Application.Features.Auth;
using OtpNet;

namespace KeroAmir.Tests.Integration;

[Collection(ApiTestGroup.Name)]
public class AuthTests(ApiFixture api)
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;
    private readonly HttpClient _client = api.CreateClient();

    private async Task<HttpResponseMessage> Login(string email, string password) =>
        await _client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(email, password), Ct);

    private async Task<AuthTokens> LoginOwner()
    {
        var response = await Login(ApiFixture.OwnerEmail, ApiFixture.OwnerPassword);
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<LoginResponse>(Ct);
        return body!.Tokens!;
    }

    private Task<HttpResponseMessage> Refresh(string token) =>
        _client.PostAsJsonAsync("/api/v1/auth/refresh", new RefreshRequest(token), Ct);

    private async Task<HttpResponseMessage> GetMe(string accessToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/account/me");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return await _client.SendAsync(request, Ct);
    }

    [Fact]
    public async Task Owner_can_log_in_and_reach_admin()
    {
        var tokens = await LoginOwner();

        var me = await GetMe(tokens.AccessToken);
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
        var body = await me.Content.ReadFromJsonAsync<MeResponse>(Ct);
        Assert.Equal(ApiFixture.OwnerEmail, body!.Email);
        Assert.Contains("Owner", body.Roles);
    }

    [Fact]
    public async Task Admin_requires_a_token()
    {
        var response = await _client.GetAsync("/api/v1/admin/account/me", Ct);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Admin_requires_the_owner_role()
    {
        var (email, password) = await api.CreateUserAsync();
        var login = await (await Login(email, password)).Content.ReadFromJsonAsync<LoginResponse>(Ct);

        var me = await GetMe(login!.Tokens!.AccessToken);
        Assert.Equal(HttpStatusCode.Forbidden, me.StatusCode);
    }

    [Fact]
    public async Task Wrong_password_returns_problem_details()
    {
        var response = await Login(ApiFixture.OwnerEmail, "wrong-password-123");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Invalid_request_returns_validation_problem()
    {
        var response = await Login("not-an-email", "");
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Five_failures_lock_the_account_even_for_the_right_password()
    {
        var (email, password) = await api.CreateUserAsync();
        for (var i = 0; i < 5; i++)
            await Login(email, "wrong-password-123");

        var response = await Login(email, password);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Contains("Auth.LockedOut", await response.Content.ReadAsStringAsync(Ct));
    }

    [Fact]
    public async Task Refresh_rotates_and_replaying_an_old_token_ends_the_session()
    {
        var first = await LoginOwner();

        var rotated = await Refresh(first.RefreshToken);
        Assert.Equal(HttpStatusCode.OK, rotated.StatusCode);
        var second = (await rotated.Content.ReadFromJsonAsync<AuthTokens>(Ct))!;
        Assert.NotEqual(first.RefreshToken, second.RefreshToken);

        // The first token was already used: replaying it is treated as theft...
        Assert.Equal(HttpStatusCode.Unauthorized, (await Refresh(first.RefreshToken)).StatusCode);
        // ...and revokes the newer token in the same chain too.
        Assert.Equal(HttpStatusCode.Unauthorized, (await Refresh(second.RefreshToken)).StatusCode);
    }

    [Fact]
    public async Task Logout_revokes_the_refresh_token()
    {
        var tokens = await LoginOwner();

        var logout = await _client.PostAsJsonAsync("/api/v1/auth/logout", new LogoutRequest(tokens.RefreshToken), Ct);
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Refresh(tokens.RefreshToken)).StatusCode);
    }

    [Fact]
    public async Task Two_factor_login_needs_the_authenticator_code()
    {
        // The owner role is needed for /admin/account, so this test uses (and restores) the owner.
        var tokens = await LoginOwner();
        using var authed = api.CreateClient();
        authed.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokens.AccessToken);

        var setup = (await (await authed.PostAsync("/api/v1/admin/account/2fa/setup", null, Ct))
            .Content.ReadFromJsonAsync<TwoFactorSetupResponse>(Ct))!;
        var totp = new Totp(Base32Encoding.ToBytes(setup.SharedKey));

        var enable = await authed.PostAsJsonAsync("/api/v1/admin/account/2fa/enable", new TwoFactorCodeBody(totp.ComputeTotp()), Ct);
        Assert.Equal(HttpStatusCode.OK, enable.StatusCode);
        var codes = (await enable.Content.ReadFromJsonAsync<RecoveryCodesResponse>(Ct))!.Codes;
        Assert.Equal(8, codes.Count);

        try
        {
            var step1 = (await (await Login(ApiFixture.OwnerEmail, ApiFixture.OwnerPassword))
                .Content.ReadFromJsonAsync<LoginResponse>(Ct))!;
            Assert.True(step1.RequiresTwoFactor);
            Assert.Null(step1.Tokens);

            var wrong = await _client.PostAsJsonAsync("/api/v1/auth/2fa",
                new TwoFactorLoginRequest(step1.ChallengeToken!, "000000"), Ct);
            Assert.Equal(HttpStatusCode.Unauthorized, wrong.StatusCode);

            var step2 = await _client.PostAsJsonAsync("/api/v1/auth/2fa",
                new TwoFactorLoginRequest(step1.ChallengeToken!, totp.ComputeTotp()), Ct);
            Assert.Equal(HttpStatusCode.OK, step2.StatusCode);

            // A recovery code signs in once (typed in lower case), then it is used up.
            var recovery = await _client.PostAsJsonAsync("/api/v1/auth/2fa",
                new TwoFactorLoginRequest(step1.ChallengeToken!, codes[0].ToLowerInvariant()), Ct);
            Assert.Equal(HttpStatusCode.OK, recovery.StatusCode);
            var reused = await _client.PostAsJsonAsync("/api/v1/auth/2fa", new TwoFactorLoginRequest(step1.ChallengeToken!, codes[0]), Ct);
            Assert.Equal(HttpStatusCode.Unauthorized, reused.StatusCode);
            var me = (await (await GetMe(tokens.AccessToken)).Content.ReadFromJsonAsync<MeResponse>(Ct))!;
            Assert.Equal((true, 7), (me.TwoFactorEnabled, me.RecoveryCodesLeft));

            // A fresh set needs a current authenticator code and replaces the old codes.
            var fresh = await authed.PostAsJsonAsync("/api/v1/admin/account/2fa/recovery-codes", new TwoFactorCodeBody(totp.ComputeTotp()), Ct);
            Assert.Equal(8, (await fresh.Content.ReadFromJsonAsync<RecoveryCodesResponse>(Ct))!.Codes.Count);
            var oldCode = await _client.PostAsJsonAsync("/api/v1/auth/2fa", new TwoFactorLoginRequest(step1.ChallengeToken!, codes[1]), Ct);
            Assert.Equal(HttpStatusCode.Unauthorized, oldCode.StatusCode);
        }
        finally
        {
            await authed.PostAsJsonAsync("/api/v1/admin/account/2fa/disable", new TwoFactorCodeBody(totp.ComputeTotp()), Ct);
        }
    }

    [Fact]
    public async Task Challenge_token_is_not_an_access_token()
    {
        var tokens = await LoginOwner();
        // A forged "challenge" made from an access token must be rejected by the 2FA step.
        var response = await _client.PostAsJsonAsync("/api/v1/auth/2fa",
            new TwoFactorLoginRequest(tokens.AccessToken, "123456"), Ct);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Contains("Auth.InvalidChallenge", await response.Content.ReadAsStringAsync(Ct));
    }

    [Fact]
    public async Task Changing_the_password_ends_every_session()
    {
        var tokens = await LoginOwner();
        using var authed = api.CreateClient();
        authed.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokens.AccessToken);
        const string newPassword = "a-brand-new-owner-password";

        var wrong = await authed.PostAsJsonAsync("/api/v1/admin/account/password", new ChangePasswordBody("not-the-password", newPassword), Ct);
        Assert.Equal(HttpStatusCode.BadRequest, wrong.StatusCode);

        var changed = await authed.PostAsJsonAsync("/api/v1/admin/account/password", new ChangePasswordBody(ApiFixture.OwnerPassword, newPassword), Ct);
        Assert.Equal(HttpStatusCode.NoContent, changed.StatusCode);
        try
        {
            Assert.Equal(HttpStatusCode.Unauthorized, (await Refresh(tokens.RefreshToken)).StatusCode);
            Assert.Equal(HttpStatusCode.Unauthorized, (await Login(ApiFixture.OwnerEmail, ApiFixture.OwnerPassword)).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await Login(ApiFixture.OwnerEmail, newPassword)).StatusCode);
        }
        finally
        {
            var again = (await (await Login(ApiFixture.OwnerEmail, newPassword)).Content.ReadFromJsonAsync<LoginResponse>(Ct))!.Tokens!;
            using var restore = api.CreateClient();
            restore.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", again.AccessToken);
            await restore.PostAsJsonAsync("/api/v1/admin/account/password", new ChangePasswordBody(newPassword, ApiFixture.OwnerPassword), Ct);
        }
    }
}
