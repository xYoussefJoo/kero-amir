// Builds the Performance & Security Report as print-ready HTML (then printed to PDF with Edge).
// Every number in section 6 is computed here, never by hand.
import { writeFileSync } from "node:fs";

const OUT = "D:/New_Desktop/kero-amir/docs/reports/kero-amir-report.html";
const ACCENT = "#2546EB"; // Kero's brand blue
const DATE = "14 November 2026";

// ---------- Measurements taken for this report (see Scope)
const M = {
  mobile: { perf: 90, a11y: 100, bp: 100, seo: 100, fcp: 1234, lcp: 3215, tbt: 193, cls: 0, si: 1960, kb: 329, requests: 19, observedLcp: 328 },
  desktop: { perf: 72, a11y: 100, bp: 100, seo: 100, fcp: 370, lcp: 712, tbt: 834, cls: 0, si: 694, kb: 571, requests: 20 },
  initialJsGzipKb: 195,
  apiLocalP50: 2, apiLocalP95: 22, apiLiveWarmP50: 360, apiLiveColdMs: 14758,
};

// ---------- Status helpers
const S = { OK: ["OK", "#2e7d32"], CHECK: ["CHECK", "#b7791f"], FIX: ["FIX", "#c0392b"] };
const st = (k) => `<b style="color:${S[k][1]}">${S[k][0]}</b>`;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const table = (head, rows, cls = "") =>
  `<table class="${cls}"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
const code = (s) => `<pre>${esc(s)}</pre>`;

// ---------- Section 6: capacity model (calculation)
const typical = M.mobile.requests; // measured request count, first mobile visit
const scenarios = [
  { name: "Light", req: +(typical * 0.6).toFixed(1), read: 8, why: "Cached assets, visitor skims, no 3D (phone)" },
  { name: "Typical", req: typical, read: 5, why: `Measured first visit: ${typical} requests (HTML, JS/CSS chunks, fonts, logo)` },
  { name: "Heavy", req: +(typical * 1.6).toFixed(1), read: 3, why: "Cold cache, desktop 3D chunk, fast scrolling through all sections" },
];
const users = [25, 100, 250, 500, 1000, 2500];
const rps = (u, s) => (u / s.read) * s.req;
const firstVisitMb = M.desktop.kb / 1024; // worst measured first visit (desktop, with three.js)
const visitsPerSec = (u) => u / 5;
const mbps = (u) => visitsPerSec(u) * firstVisitMb * 8;
const gbPerHour = (u) => (visitsPerSec(u) * 3600 * firstVisitMb) / 1024;
const fmt = (n, d = 0) => n.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });

function chart() {
  const W = 640, H = 300, P = { l: 60, r: 20, t: 28, b: 40 };
  const maxU = 2500, maxR = Math.max(...scenarios.map((s) => rps(maxU, s)));
  const yTop = Math.ceil(maxR / 5000) * 5000;
  const x = (u) => P.l + (u / maxU) * (W - P.l - P.r);
  const y = (r) => H - P.b - (r / yTop) * (H - P.t - P.b);
  const colors = { Light: "#2e7d32", Typical: ACCENT, Heavy: "#c0392b" };
  let g = `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="Inter,Segoe UI,sans-serif" font-size="11">`;
  g += `<text x="${W / 2}" y="16" text-anchor="middle" font-weight="700" font-size="12">Requests per second vs concurrent users (calculation, not measured)</text>`;
  for (let i = 0; i <= 5; i++) {
    const r = (yTop / 5) * i;
    g += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(r)}" y2="${y(r)}" stroke="#e5e5e5"/><text x="${P.l - 8}" y="${y(r) + 4}" text-anchor="end" fill="#555">${fmt(r)}</text>`;
  }
  for (const u of [0, 500, 1000, 1500, 2000, 2500])
    g += `<text x="${x(u)}" y="${H - P.b + 16}" text-anchor="middle" fill="#555">${fmt(u)}</text>`;
  g += `<text x="${W / 2}" y="${H - 6}" text-anchor="middle" fill="#333">Concurrent users</text>`;
  g += `<text transform="translate(14 ${H / 2}) rotate(-90)" text-anchor="middle" fill="#333">Requests / second</text>`;
  scenarios.forEach((s, i) => {
    const pts = [0, ...users].map((u) => `${x(u).toFixed(1)},${y(rps(u, s)).toFixed(1)}`).join(" ");
    g += `<polyline points="${pts}" fill="none" stroke="${colors[s.name]}" stroke-width="2.5"/>`;
    g += `<rect x="${P.l + 10}" y="${P.t + 6 + i * 16}" width="12" height="3" fill="${colors[s.name]}"/><text x="${P.l + 28}" y="${P.t + 10 + i * 16}">${s.name} (${s.req} req / ${s.read} s)</text>`;
  });
  return g + "</svg>";
}

// ---------- Content
const summaryRows = [
  ["Performance (mobile)", `Lighthouse 90, CLS 0, TBT 193 ms; real LCP 0.33 s, simulated slow-phone LCP 3.2 s`, st("CHECK")],
  ["Performance (desktop)", `Lighthouse 72: the 3D logo blocks the main thread for 834 ms while it builds`, st("FIX")],
  ["JavaScript weight", `${M.initialJsGzipKb} KB gzip initial; three.js only on strong desktops`, st("OK")],
  ["Live API latency", `Warm reads ~${M.apiLiveWarmP50} ms from Egypt; cold start ${fmt(M.apiLiveColdMs / 1000, 1)} s after idle`, st("FIX")],
  ["Security headers", "None on the live API or the web app (no HSTS, nosniff, framing, referrer, CSP)", st("FIX")],
  ["HTTPS", "TLS works; HTTP→HTTPS is a temporary 307 and there is no HSTS", st("FIX")],
  ["Auth hardening", "Sign-in rate limit returns 429 after 10/min (measured); lockout + 2FA covered by tests", st("OK")],
  ["Exposure", ".env/.git/web.config/appsettings not served; errors are short ProblemDetails; OpenAPI map is public", st("FIX")],
  ["Secrets", "No keys or connection strings in client JS or HTML; server secrets in env / web.config", st("OK")],
  ["Dependencies", "API: 0 vulnerable packages. Web: 7 moderate, all dev tooling (ESLint), not shipped", st("FIX")],
  ["SEO & sharing", "Title, description, absolute canonical/hreflang OK; no robots.txt, sitemap, Open Graph image", st("FIX")],
  ["Accessibility", "Lighthouse 100 (mobile + desktop); skip link, alt text, heading order", st("OK")],
];

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Kero Amir - Performance & Security Report</title>
<style>
@page { size: A4; margin: 18mm 16mm 18mm 16mm; }
* { box-sizing: border-box; }
body { font-family: "Inter", "Segoe UI", Arial, sans-serif; color: #1b1d26; font-size: 10.2pt; line-height: 1.45; margin: 0; }
h1 { font-size: 23pt; margin: 6px 0 2px; letter-spacing: -0.02em; }
h2 { font-size: 15pt; margin: 18px 0 6px; padding-top: 6px; border-top: 2px solid ${ACCENT}; }
h3 { font-size: 11.5pt; margin: 14px 0 4px; }
.url { color: ${ACCENT}; font-weight: 700; font-size: 12pt; }
.muted { color: #666; }
.small { font-size: 8.5pt; color: #777; }
table { width: 100%; border-collapse: collapse; margin: 6px 0 10px; font-size: 9.2pt; page-break-inside: auto; }
tr { page-break-inside: avoid; }
th { background: #16181f; color: #fff; text-align: left; padding: 5px 7px; font-weight: 600; }
td { padding: 4.5px 7px; vertical-align: top; border-bottom: 1px solid #ececec; }
tbody tr:nth-child(even) td { background: #f6f7fa; }
pre { background: #f3f4f6; border: 1px solid #e3e5e8; border-radius: 4px; padding: 8px 10px; font-family: Consolas, "Courier New", monospace; font-size: 7.9pt; line-height: 1.35; white-space: pre-wrap; page-break-inside: avoid; }
ul { margin: 4px 0 8px 18px; padding: 0; } li { margin: 2px 0; }
ol { margin: 4px 0 8px 18px; padding: 0; } ol li { margin: 4px 0; }
.page-break { page-break-before: always; }
.key { font-size: 9.2pt; margin: 6px 0; }
.box { border-left: 4px solid ${ACCENT}; background: #f5f7ff; padding: 8px 12px; margin: 8px 0; }
</style></head><body>

<h1>Performance &amp; Security Report</h1>
<div class="url">Kero Amir portfolio + CMS (kero-amir.runasp.net API · Next.js web, pre-launch)</div>
<div class="muted">Prepared ${DATE}</div>

<h3>Scope and method</h3>
<p><b>Reviewed:</b> the source code (apps/web: Next.js 16; apps/api: ASP.NET Core .NET 10, EF Core, SQL Server); the production
build of the web app served locally (<code>next start</code>, the web app is not deployed yet); and the <b>live API</b> at
https://kero-amir.runasp.net (MonsterASP.NET, IIS).</p>
<p><b>Measured live:</b> Lighthouse 12 (3 runs each, median) on mobile (simulated slow 4G, 4x CPU) and desktop; response headers
and redirects with <code>curl</code>; TLS/ALPN negotiation; API latency (30 requests per endpoint, local and live); passive exposure
checks (GET on exact paths only); the sign-in rate limit (12 requests with a non-existent test address); <code>npm audit</code> and
<code>dotnet list package --vulnerable --include-transitive</code>.</p>
<p><b>Not measurable here:</b> the web app's production host, CDN and headers (not deployed); real-user Core Web Vitals (no field data
yet); HTTP/2 on the API (this client only offered HTTP/1.1). These are marked CHECK, and Section 4 lists the tool that confirms each one.
<b>Section 6 is a modelled calculation, not a load test.</b> No intrusive or active security testing was performed.</p>
<p class="key">Status key: ${st("OK")} observed and sound &nbsp;·&nbsp; ${st("CHECK")} needs a measurement or access not available here &nbsp;·&nbsp; ${st("FIX")} issue visible in the page or code</p>

<h3>Summary</h3>
<p>The build is in good shape for a pre-launch site: accessibility, SEO and best-practice scores are 100, layout shift is zero, the
initial JavaScript is lean (${M.initialJsGzipKb} KB gzip) because three.js only loads on strong desktops, and the API's auth is
properly hardened (rate limit, lockout, 2FA, closed CORS, no leaked secrets). The <b>main performance risk</b> is the desktop 3D logo,
which blocks the main thread for about 0.8 s while it builds, plus a ${fmt(M.apiLiveColdMs / 1000, 1)} s cold start on the live API after idle. The <b>main
security gap</b> is that neither the API nor the web app sends any security headers (no HSTS, nosniff, framing or referrer policy),
the HTTPS redirect is temporary, and the API's OpenAPI map is public in production.</p>
${table(["Area", "Finding", "Status"], summaryRows)}

<h2 class="page-break">1. Performance</h2>
<h3>What the page shows</h3>
${table(["Observation", "Impact", "Status"], [
  ["Web app served by Next.js (static prerender + partial prerender). Production host/CDN not chosen yet (Vercel planned).", "Edge caching and HTTP/2/3 depend on the host.", st("CHECK")],
  ["Live API on IIS (MonsterASP): Brotli on (Content-Encoding: br measured); skills payload 2,847 → 1,105 bytes.", "Small, compressed JSON.", st("OK")],
  ["API negotiated HTTP/1.1 (client offered only 1.1).", "HTTP/2 multiplexing unknown on this host.", st("CHECK")],
  [`Initial JS + CSS ${M.initialJsGzipKb} KB gzip, 10 files; three.js (~180 KB gzip) is a separate chunk loaded only on desktops with ≥ 6 cores, WebGL2, no reduced motion.`, "Phones never download the 3D engine.", st("OK")],
  [`Desktop: Lighthouse 72, TBT ${M.desktop.tbt} ms. The 3D logo extrudes 14 bevelled pieces (curveSegments 10, bevelSegments 4) in one task on the main thread.`, "Page feels briefly frozen on desktop; INP risk during load.", st("FIX")],
  [`LCP element: the hero headline (text). Observed LCP ${M.mobile.observedLcp} ms (= FCP); simulated slow-phone LCP ${fmt(M.mobile.lcp / 1000, 1)} s.`, "Fast on real loads; the simulated number reflects main-thread work before first paint.", st("CHECK")],
  ["Fonts: Clash Display (one 29 KB variable woff2), Inter, JetBrains Mono, all self-hosted via next/font, preloaded (Link header), font-display: swap.", "No third-party font requests, no invisible text.", st("OK")],
  ["Images: logo is inline SVG; header logo via next/image with 1x/2x srcset, explicit size. Both theme variants are preloaded, so one is always unused.", "One wasted early request (~2 KB).", st("FIX")],
  ["No video, no third-party scripts, no analytics yet.", "Nothing blocking from other origins.", st("OK")],
  ["Hashed assets: Cache-Control public, max-age=31536000, immutable. HTML: s-maxage=3600, stale-while-revalidate.", "Repeat visits load from cache; HTML refreshes hourly.", st("OK")],
  [`Live API cold start ${fmt(M.apiLiveColdMs / 1000, 1)} s after idle (first request); warm reads p50 ${M.apiLiveWarmP50} ms from Egypt; local cached reads p50 ${M.apiLocalP50} ms.`, "First visitor after a quiet period waits; content pages are cached by the web app, so mainly admin is affected.", st("FIX")],
])}
<h3>Recommendations</h3>
<ul>
<li><b>Build the 3D pieces without freezing the page.</b> In <code>PuzzleLogo3D.tsx</code>, lower <code>curveSegments</code> to 6 and <code>bevelSegments</code> to 2, and build the geometries a few per frame (or in <code>requestIdleCallback</code>) while the 2D logo is still showing.</li>
<li><b>Preload only one header logo.</b> In <code>Logo.tsx</code>, drop <code>priority</code> from the dark-theme variant (or both: the header logo is not the LCP).</li>
<li><b>Keep the API warm.</b> Point a free uptime monitor (e.g. UptimeRobot, every 5 min) at <code>/api/v1/health/live</code>, or enable an "always on" option if the MonsterASP plan has one.</li>
<li><b>Deploy the web app behind a CDN</b> (Vercel as planned) so static pages are served from the edge with Brotli and HTTP/2/3.</li>
</ul>
<h3>Targets to measure against</h3>
${table(["Metric", "Good", "Measured (lab, this review)", "Where to measure"], [
  ["LCP", "2.5 s or less", `mobile ${fmt(M.mobile.lcp / 1000, 2)} s simulated (${M.mobile.observedLcp} ms observed) · desktop ${fmt(M.desktop.lcp / 1000, 2)} s`, "PageSpeed Insights, mobile"],
  ["INP", "200 ms or less", `not measurable in lab; TBT proxy: mobile ${M.mobile.tbt} ms, desktop ${M.desktop.tbt} ms`, "PageSpeed Insights / Chrome DevTools"],
  ["CLS", "0.1 or less", "0 (mobile and desktop)", "PageSpeed Insights / Lighthouse"],
  ["Total page weight (first load)", "under 1.5 MB", `mobile ${M.mobile.kb} KB · desktop ${M.desktop.kb} KB (with 3D)`, "DevTools Network tab"],
])}

<h2 class="page-break">2. Security</h2>
<h3>What the site shows</h3>
${table(["Observation", "Risk", "Status"], [
  ["Live API serves HTTPS; HTTP requests get <b>307</b> (temporary) to HTTPS.", "Browsers and crawlers don't remember the upgrade; first request can travel in clear text.", st("FIX")],
  ["No <code>Strict-Transport-Security</code> on the API (and none configured for the web app).", "No protection against protocol downgrade on later visits.", st("FIX")],
  ["No <code>X-Content-Type-Options</code>, <code>X-Frame-Options</code>/<code>frame-ancestors</code>, <code>Referrer-Policy</code>, <code>Permissions-Policy</code> or CSP on either app (Next.js adds none by default).", "Clickjacking of /admin, MIME sniffing, referrer leaks, no XSS safety net.", st("FIX")],
  ["<code>X-Powered-By: ASP.NET</code> (API) and <code>X-Powered-By: Next.js</code> (web).", "Free stack fingerprinting for attackers.", st("FIX")],
  ["Sign-in rate limit: 10 requests/min per IP, then <b>429</b> (measured live). Account lockout after 5 failures and TOTP 2FA (integration tests).", "Brute force is throttled and locked out.", st("OK")],
  ["CORS: no <code>Access-Control-Allow-Origin</code> for a foreign Origin (measured).", "Other sites can't call the API from a browser.", st("OK")],
  ["Admin auth via BFF: tokens in httpOnly, SameSite=Lax, Secure (production) cookies; Origin check on writes; refresh-token rotation with replay detection.", "Tokens never reach page JavaScript.", st("OK")],
  ["<code>/openapi/v1.json</code> returns 200 (66 KB) on the live API.", "Full map of admin endpoints and payloads is public.", st("FIX")],
  [".env, .git/HEAD, web.config, appsettings*.json, logs/ and the API DLL return 404 (GET on exact paths).", "No configuration or source exposure.", st("OK")],
  ["Errors are RFC 7807 ProblemDetails with a trace id, no stack traces.", "No internals leaked.", st("OK")],
  ["No secrets in client JS or HTML (searched all initial chunks); no source maps referenced.", "Nothing to harvest from the bundle.", st("OK")],
  ["External links use <code>rel=\"noopener noreferrer\"</code>; the # links point to real sections.", "No tab-nabbing.", st("OK")],
  ["Contact form not built yet (planned with Turnstile, honeypot and rate limit).", "Nothing exposed today; must be hardened when added.", st("CHECK")],
  ["Dependencies: API 0 vulnerable packages (incl. transitive). Web: 7 moderate in ESLint/TypeScript-ESLint/minimatch (dev only, not shipped).", "No runtime exposure; CI tooling should still be patched.", st("FIX")],
])}
<h3>Recommended security headers</h3>
<p>Start the CSP as <b>Report-Only</b>: a strict policy can break things the page relies on (inline theme script, WebGL, fonts), so watch the
reports, then switch to enforcing. Sources below match what the page actually loads today (all same-origin).</p>
<p><b>Web, <code>apps/web/next.config.ts</code></b> (also set <code>poweredByHeader: false</code>):</p>
${code(`poweredByHeader: false,
async headers() {
  return [{
    source: "/(.*)",
    headers: [
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Content-Security-Policy-Report-Only",
        value: "default-src 'self'; img-src 'self' data: blob:; font-src 'self'; " +
               "script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
               "connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
    ],
  }];
},`)}
<p><b>API, <code>apps/api/src/KeroAmir.Api/Program.cs</code></b> (JSON only, so the CSP can be strict):</p>
${code(`app.UseHsts();                       // with builder.Services.AddHsts(o => { o.MaxAge = TimeSpan.FromDays(730); o.IncludeSubDomains = true; });
app.UseHttpsRedirection();           // permanent: builder.Services.AddHttpsRedirection(o => o.RedirectStatusCode = 308);
app.Use(async (ctx, next) =>
{
    var h = ctx.Response.Headers;
    h.XContentTypeOptions = "nosniff";
    h.XFrameOptions = "DENY";
    h["Referrer-Policy"] = "no-referrer";
    h.ContentSecurityPolicy = "default-src 'none'; frame-ancestors 'none'";
    await next();
});
if (app.Environment.IsDevelopment())
    app.MapOpenApi("/openapi/{documentName}.json");   // keep the API map out of production`)}
<p><b>Remove <code>X-Powered-By</code> on IIS</b>: in the published <code>web.config</code> (the deploy script already edits it):</p>
${code(`<system.webServer>
  <httpProtocol><customHeaders><remove name="X-Powered-By" /></customHeaders></httpProtocol>
</system.webServer>`)}
<h3>Contact form hardening (when it is built, Phase 6)</h3>
<ul>
<li>Validate and length-cap every field server-side (FluentValidation is already in place); never render submitted HTML.</li>
<li>Cloudflare Turnstile plus a hidden honeypot field; verify the Turnstile token on the API, not in the browser.</li>
<li>Its own rate limit (e.g. 5 per 10 min per IP) separate from sign-in; email alerts through a background queue.</li>
<li>Keep the Resend/Turnstile keys in server environment variables only.</li>
</ul>
<h3>Preview and launch hygiene</h3>
<ul>
<li>Set <code>SITE_URL</code> to the production domain before the first public deploy so canonical and hreflang point at it.</li>
<li>Protect Vercel preview deployments (Deployment Protection) and send <code>X-Robots-Tag: noindex</code> on previews; /admin already sends noindex.</li>
<li>Enable GitHub Dependabot <b>security updates only</b> (no routine version PRs).</li>
</ul>

<h2 class="page-break">3. SEO and sharing</h2>
${table(["Item", "Observation", "Status"], [
  ["Title and description", "Per language: “Kero Amir | Senior Graphic Designer” + description (en/de).", st("OK")],
  ["Canonical and hreflang", "Absolute canonical, en/de alternates and x-default (fixed in this review); depends on SITE_URL at deploy.", st("OK")],
  ["Open Graph / Twitter cards", "None: no og:title/description/image, no twitter:card. Shared links show no preview.", st("FIX")],
  ["Viewport", "width=device-width, initial-scale=1.", st("OK")],
  ["theme-color", "Missing (browser UI won't match the cream/ink theme).", st("FIX")],
  ["robots.txt and sitemap.xml", "Both 404.", st("FIX")],
  ["Skip link", "“Skip to content” link to #main, visible on focus.", st("OK")],
  ["Alt text", "Logo images alt “Kero Amir”; decorative elements aria-hidden. Project images (Phase 3) will require alt per locale.", st("OK")],
  ["Heading order", "One h1 (hero), h2 per section, h3 in cards.", st("OK")],
  ["Form labels", "Admin sign-in fields have visible labels; Lighthouse accessibility 100.", st("OK")],
])}
<p><b>Fix:</b> add <code>app/robots.ts</code> and <code>app/sitemap.ts</code> (both locales, /admin disallowed), a 1200×630 Open Graph image
(<code>app/[locale]/opengraph-image.tsx</code> can render the puzzle K on cream), <code>openGraph</code>/<code>twitter</code> fields in
<code>generateMetadata</code>, and <code>export const viewport = { themeColor: [...] }</code> with light #F4F0E7 and dark #0E1120.</p>

<h2>4. How to verify the CHECK items</h2>
${table(["Goal", "Tool / command"], [
  ["Real performance and Core Web Vitals (LCP, INP, CLS)", "pagespeed.web.dev on the production URL (mobile and desktop); WebPageTest.org for filmstrip and waterfall"],
  ["HTTP security headers", "securityheaders.com; or <code>curl -s -D - -o /dev/null https://kero-amir.runasp.net/api/v1/skills</code>"],
  ["TLS, HTTP/2 and overall hardening", "MDN HTTP Observatory (developer.mozilla.org/observatory); SSL Labs; <code>curl -sI --http2 https://kero-amir.runasp.net/api/v1/health/live</code>"],
  ["Web host, CDN and edge caching (after deploy)", "<code>curl -sI https://&lt;web-domain&gt;/en</code> (look for x-vercel-cache / age); Vercel dashboard"],
  ["Page weight and lazy-loading", "Chrome DevTools &gt; Network, throttle to Slow 4G, tick 'Disable cache'"],
  ["Accessibility", "Lighthouse accessibility audit; axe DevTools extension"],
  ["Contact form hardening (when built)", "Submit with the honeypot filled (must be rejected); 6 quick submissions (6th must get 429)"],
  ["Dependency vulnerabilities", "<code>npm audit</code> in apps/web; <code>dotnet list apps/api/KeroAmir.slnx package --vulnerable --include-transitive</code>; GitHub Dependabot"],
])}

<h2>5. Priority action list</h2>
<ol>
<li><b>Add the security headers</b> (Section 2) to the API and the web app; confirm with securityheaders.com (target: A).</li>
<li><b>Make HTTPS permanent on the API</b> (308 redirect + HSTS) and remove <code>X-Powered-By</code>; confirm with <code>curl -sI http://kero-amir.runasp.net/</code>.</li>
<li><b>Serve the OpenAPI document only in Development</b>; confirm <code>/openapi/v1.json</code> returns 404 live.</li>
<li><b>Add robots.txt, sitemap.xml, Open Graph/Twitter tags and theme-color</b>; confirm with a link preview (opengraph.xyz) and Google Search Console.</li>
<li><b>Stop the desktop 3D logo from blocking the main thread</b> (lighter bevels, build pieces across frames); confirm Lighthouse desktop TBT under 200 ms.</li>
<li><b>Keep the API warm</b> with a 5-minute uptime ping; confirm the first request after 30 idle minutes is under 1 s.</li>
<li><b>Set SITE_URL and deploy the web app behind a CDN</b>; confirm canonical tags and run PageSpeed Insights on the real URL.</li>
<li><b>Patch the dev tooling</b> (<code>npm audit fix</code>) and enable Dependabot security updates; confirm <code>npm audit</code> reports 0.</li>
</ol>

<h2 class="page-break">6. Capacity estimate (modelled)</h2>
<div class="box"><b>This section is a calculation, not a measurement.</b> No load was generated against the site. The model uses the
measured first-visit request count (${typical} requests, mobile) and the heaviest measured first-visit size (${fmt(M.desktop.kb)} KB,
desktop with the 3D chunk).</div>
${code(`requests/sec = (concurrent users / read time in seconds) x requests per visit
visits/sec   = concurrent users / read time (typical scenario: 5 s)
bandwidth    = visits/sec x first-visit MB x 8   (Mbps)
transfer/hr  = visits/sec x 3600 x first-visit MB   (GB = /1024)`)}
${table(["Scenario", "Requests per visit", "Read time", "Reasoning"], scenarios.map((s) => [s.name, String(s.req), `${s.read} s`, s.why]))}
${chart()}
${table(["Concurrent users", ...scenarios.map((s) => `${s.name} req/s`)], users.map((u) => [fmt(u), ...scenarios.map((s) => fmt(rps(u, s)))]))}
<h3>Bandwidth check (first visit ${fmt(firstVisitMb, 2)} MB, typical read time)</h3>
${table(["Concurrent users", "Visits / s", "Bandwidth (Mbps)", "Transfer per hour (GB)"], [100, 500, 1000].map((u) => [fmt(u), fmt(visitsPerSec(u)), fmt(mbps(u), 1), fmt(gbPerHour(u), 2)]))}
<h3>How to read this</h3>
<p>On a CDN, request rate is rarely the limit; bandwidth and plan quotas bind first. Here the pages are prerendered and cached, so
browsing does not touch the API at all: the API is only called when the cache revalidates (hourly, or when Kero publishes) and by the
admin. The real bottlenecks are the dynamic endpoints (sign-in today, the contact form later), which are rate-limited and should be
tested separately and gently. Check the MonsterASP plan's CPU/bandwidth limits and the web host's data-transfer quota before a
launch or campaign. A load-test script is delivered alongside this report: <code>docs/reports/kero-amir-loadtest.js</code> (k6; static
pages ramp to 100 users, public API reads at a fixed 5 req/s; it never calls sign-in, admin or write endpoints). Run it only against a
deployment you own, ideally staging, outside peak hours.</p>
<p class="small"><b>Assumptions:</b> ${typical} requests and ${fmt(M.desktop.kb)} KB per first visit (measured in the lab); read times of 8/5/3 s; light/heavy scenarios at 0.6x/1.6x the measured request count; repeat visits are lighter because hashed assets are cached for a year.
<b>Limitations:</b> findings come from the publicly served content and the source code at the time of review (web app measured on a local production build, API measured live); no intrusive or active security testing was performed. Sharing a PageSpeed Insights run on the deployed site, the <code>curl -sI</code> header output after the fixes, and a k6 summary would let this report be updated with field data.</p>
</body></html>`;

writeFileSync(OUT, html);
console.log("wrote", OUT);
console.log("check:", users.map((u) => `${u}u typical ${fmt(rps(u, scenarios[1]))} rps`).join(", "));
console.log("bandwidth:", [100, 500, 1000].map((u) => `${u}u ${fmt(mbps(u), 1)} Mbps ${fmt(gbPerHour(u), 2)} GB/h`).join(", "));
