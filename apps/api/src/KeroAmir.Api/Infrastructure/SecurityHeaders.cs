namespace KeroAmir.Api.Infrastructure;

public static class SecurityHeaders
{
    /// <summary>
    /// Headers for a JSON-only API: nothing may be framed, sniffed or loaded from it as a page.
    /// HSTS is added separately (UseHsts) and only outside Development.
    /// </summary>
    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app) =>
        app.Use((http, next) =>
        {
            var headers = http.Response.Headers;
            headers.XContentTypeOptions = "nosniff";
            headers.XFrameOptions = "DENY";
            headers["Referrer-Policy"] = "no-referrer";
            headers.ContentSecurityPolicy = "default-src 'none'; frame-ancestors 'none'";
            headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
            return next(http);
        });
}
