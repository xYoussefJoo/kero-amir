// Smoke test for a running copy of the site (local `next start` or a Vercel deployment). Read-only: it never submits
// a real form or changes data.
//   node scripts/smoke.mjs https://your-site.vercel.app
//   SMOKE_EMAIL=... SMOKE_PASSWORD=... node scripts/smoke.mjs <url>   (also checks sign-in; skipped when 2FA is on)
const base = (process.argv[2] ?? "http://localhost:4400").replace(/\/+$/, "");
const origin = new URL(base).origin;
let failed = 0;

const check = (ok, name, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail && !ok ? `  (${detail})` : ""}`);
  if (!ok) failed++;
};
const get = (path, init) => fetch(base + path, { redirect: "manual", signal: AbortSignal.timeout(30_000), ...init });

// ---- Public pages, with real content from the API (empty sections mean API_URL is wrong or the API is down)
for (const locale of ["en", "de"]) {
  const res = await get(`/${locale}`);
  const html = await res.text();
  check(res.status === 200, `/${locale} answers 200`, String(res.status));
  check(html.includes('id="work"') && /project-card|data-project/.test(html), `/${locale} shows projects from the API`);
  check(html.includes('id="reviews"') && html.includes('id="contact"'), `/${locale} has the reviews and contact sections`);
  check(!/localhost:5080|runasp\.net/.test(html), `/${locale} doesn't leak the API address`);
}
const root = await get("/");
check([307, 308].includes(root.status) && /\/(en|de)$/.test(root.headers.get("location") ?? ""), "/ redirects to a language", `${root.status} ${root.headers.get("location")}`);

// ---- Security headers
const headers = (await get("/en")).headers;
for (const name of ["content-security-policy", "strict-transport-security", "x-content-type-options", "x-frame-options", "referrer-policy", "permissions-policy"])
  check(headers.has(name), `header ${name}`);
check(!headers.has("x-powered-by"), "no x-powered-by header");

// ---- SEO files
const robots = await get("/robots.txt");
check(robots.status === 200 && (await robots.text()).includes("Disallow: /admin"), "robots.txt hides /admin");
const sitemap = await get("/sitemap.xml");
check(sitemap.status === 200 && (await sitemap.text()).includes("hreflang"), "sitemap.xml lists both languages");
const ogTag = (await (await get("/en")).text()).match(/property="og:image" content="([^"]+)"/)?.[1];
const og = ogTag ? await fetch(ogTag.replace(/^https?:\/\/[^/]+/, base)) : null;
check(og?.status === 200 && og.headers.get("content-type") === "image/png", "Open Graph image renders", ogTag ?? "no og:image tag");

// ---- Admin and BFF guards (signed out)
const admin = await get("/admin");
check([307, 308].includes(admin.status) && (admin.headers.get("location") ?? "").includes("/admin/login"), "/admin sends signed-out visitors to sign-in");
check((await get("/admin/login")).status === 200, "/admin/login answers 200");
check((await get("/api/bff/admin/overview")).status === 401, "admin API needs a session");
check((await get("/api/bff/health/live")).status === 404, "BFF only forwards admin paths");
const crossSite = await get("/api/bff/admin/messages/x/status", { method: "PUT", headers: { origin: "https://evil.example" } });
check(crossSite.status === 403, "BFF blocks cross-site writes");
check((await get("/api/forms/nope", { method: "POST", headers: { origin } })).status === 404, "forms route allows only known forms");
check((await get("/api/forms/contact", { method: "POST", headers: { origin: "https://evil.example" } })).status === 403, "forms route blocks cross-site posts");

// ---- Optional: real sign-in
if (process.env.SMOKE_EMAIL && process.env.SMOKE_PASSWORD) {
  const login = await get("/api/auth/login", {
    method: "POST", headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ email: process.env.SMOKE_EMAIL, password: process.env.SMOKE_PASSWORD }),
  });
  const body = await login.json().catch(() => ({}));
  check(login.status === 200, "sign-in with SMOKE_EMAIL works", JSON.stringify(body));
  if (login.status === 200 && !body.requiresTwoFactor) {
    const cookie = login.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
    const overview = await get("/api/bff/admin/overview", { headers: { cookie } });
    check(overview.status === 200, "dashboard overview loads after sign-in", String(overview.status));
    await get("/api/auth/logout", { method: "POST", headers: { origin, cookie } });
  }
}

console.log(failed ? `\n${failed} check(s) failed.` : "\nAll checks passed.");
process.exit(failed ? 1 : 0);
