# Decisions

Newest at the bottom. Format: date, decision, why.

## Before Phase 1 (2026-11-13)

1. **Brief v2 replaces the v1 prompt.** See "Changes from v1" in `brief.md`: fixed colors, logo variant, BFF auth, smaller scope.
2. **Brand colors are Kero's exact values:** `#F4F0E7`, `#2546EB`, `#FF6535`. Dark mode adds `#7B93F5` (primary) and
   `#8A8E9C` (muted) because the brand blue is 2.8:1 on ink.
3. **Locales `en` + `de` only in v1.** French and Arabic later; logical CSS properties keep RTL cheap to add.
4. **BFF auth.** Tokens live in httpOnly cookies on the Next.js origin; the API only takes Bearer tokens.
   Works across `vercel.app` / `azurewebsites.net` and custom domains alike.
5. **npm, not pnpm**, to match the owner's other projects.
6. **Local DB is the machine's SQL Server instance** (Docker isn't installed on the dev machine). `docker-compose.yml`
   is still provided for anyone with Docker; Testcontainers integration tests run in CI.
7. **Solution file format is `.slnx`** (the .NET 10 default).

## Phase 1 (2026-11-13)

8. **Next.js 16.4 with `cacheComponents`.** `/en` and `/de` prerender as static pages; CMS data will use
   `"use cache"` + `cacheTag` so publishing revalidates by tag. Next 16 renamed `middleware.ts` to `proxy.ts`.
9. **No theme library.** A tiny inline script sets `data-theme` before paint (saved choice, else OS setting);
   icons switch with CSS, so there is no flash and no hydration mismatch.
10. **Logo variants are generated from Kero's PNG** (`public/brand/logo-light-bg.png` recolors cream to ink).
    Palette PNGs (~23 KB) beat WebP here. Replace with SVG when Kero sends one.
11. **Fonts:** Clash Display self-hosted from Fontshare (one 29 KB variable file); Inter and JetBrains Mono via
    `next/font/google`, which downloads them at build time and serves them from our own domain.
12. **API packages pinned to the 10.0.x line** with central package management (`Directory.Packages.props`);
    `TreatWarningsAsErrors` is on, generated EF migrations are excluded from analyzers.
13. **xUnit v3 on Microsoft.Testing.Platform** (`global.json` → `test.runner`), required by `dotnet test` on .NET 10.
14. **IDs are `Guid.CreateVersion7()`**: sortable by creation time, so SQL Server indexes don't fragment.

## Phase 2 (2026-11-14)

15. **Clean Architecture + performance-peak techniques are standing rules** (see CLAUDE.md sections). Every part
    states which techniques it applies.
16. **No MediatR.** Handlers implement `IHandler<TRequest, TResponse>`, are registered by assembly scan and injected
    into endpoints. Less magic, no licence, same separation.
17. **`Result<T>` instead of exceptions** for expected failures; the Api maps `ErrorType` to status codes + ProblemDetails.
    CA1716/CA1000 are off: they flag this pattern, not real problems.
18. **Application references EF Core's query API** (not the SQL Server provider) through `IAppDbContext`. Pragmatic
    Clean Architecture: handlers write LINQ projections directly instead of hiding EF behind generic repositories,
    which would block `Select` projections and split queries.
19. **Translations are owned collections** (`OwnsMany`), key `(ParentId, Locale)`, cascade-deleted with the parent.
    The key is also the lookup index, so no extra indexes needed.
20. **Indexes kept minimal:** unique slugs (filtered on live rows) and FK indexes. Catalog/skills/timeline tables hold
    tens of rows; sort-order indexes would be over-indexing.
21. **Skill level is guarded in the database** (`CHECK Level BETWEEN 0 AND 100`) as well as in validation.
22. **Identity lives in Infrastructure** (`AppUser : IdentityUser<Guid>`); Application sees only `IIdentityService` /
    `ITokenService`, Domain only `RefreshToken` and `Roles`.
23. **Tokens:** 15-min JWT access tokens (HS256) + 14-day opaque refresh tokens, stored as SHA-256 hashes, rotated on
    every use. Replaying a used token revokes its whole family (stolen-token detection). Logout revokes the family.
    Known trade-off: two truly simultaneous refreshes of the same token look like a replay; the BFF serialises refreshes.
24. **2FA** uses Identity's built-in authenticator (TOTP) provider; login is two steps with a 5-minute signed challenge
    token whose audience (`…:2fa`) can never pass as an access token.
25. **Passwords:** 12+ characters, no composition rules (NIST 800-63B). Lockout: 5 failures → 15 minutes, counting 2FA codes.
    One error message for unknown email and wrong password.
26. **Rate limit:** 10 sign-in requests per minute per IP (configurable `RateLimits:AuthPerMinute`).
27. **Owner account is seeded from config** (`Seed:OwnerEmail` / `Seed:OwnerPassword` via user-secrets or host env);
    idempotent, never committed.
28. **Integration tests hit real SQL Server**: `KEROAMIR_TEST_SQL_SERVER` (local instance) or Testcontainers in CI;
    one throwaway database per run.
29. **Hosting target: MonsterASP.NET (runasp.net) via WebDeploy** for the API. `*.publishSettings` is git-ignored.
30. **Public content reads use ASP.NET Core output caching** (in-memory, 1 h, varies by `?locale`, one tag per feature).
    Admin writes evict their tags in an endpoint filter after a 2xx, so edits show on the next read. Tool changes also
    evict `skills` (skills show tool slugs). No Redis: single API instance on MonsterASP.
31. **Public lists return the whole set, capped at 200** (categories, tools, skill groups, timeline are tens of rows and
    the site shows them all); admin lists are paged (max 100). Settings capped at 500 rows.
32. **Settings are JSON values under dotted keys** (`hero.headline`, `heroStats`); a row with no locale is shared and a
    locale row overrides it. Lets Kero edit structured data (stats, socials) without a schema change per field.
33. **Skill groups with skills can't be deleted** (409); deleted tools just disappear from their skills.
34. **Timeline is ordered by date** (newest first), not drag order; `SortOrder` only breaks same-date ties.
35. **Enums travel as strings** in JSON (`"Work"`, not `0`) so the API is readable and stable if enum order changes.
36. **Response compression (Brotli/Gzip) on HTTPS**: BREACH needs attacker-reflected input next to a secret in one
    body; token responses reflect none.
37. **Initial content is an embedded `content-seed.json`** (from Kero's previous site, 2026-11-14), applied at startup
    when `Seed:Content=true`, table by table, only while a table is empty, so it never overwrites admin edits.
    Skill levels and German texts are drafts (the old site had neither); Kero reviews them in the admin.
    Placeholder social links and "Example" testimonials from the old site were deliberately not imported.
38. **Deploy = `deploy/deploy.ps1` from the dev machine** (Web Deploy to MonsterASP): migrations and seeding run from
    the dev machine against the production database, so the owner password never lives on the server; only the
    connection string and JWT key go into the server's `web.config` (environment variables). Secrets sit in the
    git-ignored `deploy/production.secrets.json`. Publish targets `win-x64` only (21 MB instead of 82 MB).
39. **MonsterASP specifics (found while deploying, 2026-11-14):** the database hostname is internal-only (resolves to
    10.0.0.x) and remote access isn't available, so `-ServerSideDatabase` mode is used: the API migrates on startup
    (`Database:MigrateOnStartup`, kept on) and seeds during a first upload that carries the owner credentials; a second
    upload removes them within minutes. App pools are **32-bit**: publish `win-x86` (win-x64 fails with HTTP 500.32).
    Framework-dependent works (the host has .NET 10). Secrets are entered with `deploy/set-secrets.ps1`.
40. **BFF implementation:** `/api/auth/{login,2fa,logout}` route handlers set httpOnly `ka_at` / `ka_rt` cookies
    (SameSite=Lax, Secure in prod); the 2FA challenge also lives in an httpOnly cookie. `/api/bff/admin/...` forwards
    only `admin/` paths with the Bearer token, refreshes once on 401, and checks `Origin` on writes (CSRF second layer).
    `proxy.ts` guards `/admin` and refreshes an expired access token before render, since Server Components can't set
    cookies. Concurrent refreshes of one token share a single call (in-memory; enough for one web instance).
41. **Typed API client:** `openapi-typescript` generates `lib/api/schema.d.ts` from the API's OpenAPI document and
    `openapi-fetch` (~6 KB) consumes it, so request/response types can't drift from the .NET contracts.
42. **Sign-in rate limit is effectively shared** through the BFF (the API sees the web server's IP). Fine for a
    single-owner admin; per-account lockout still applies.

## Hero puzzle logo (2026-11-14, pulled forward from Phase 4)

43. **The K is built from its own puzzle pieces:** Kero's PNG is traced (potrace, per color) and split into 14 pieces
    (`logo-pieces.ts`). Pieces fly in staggered, snap with a back-out ease, then the whole K pops out with a damped
    spring and an orange glow; afterwards it floats and tilts toward the pointer.
44. **Two renderers, one data source:** `PuzzleLogo2D` (SVG + CSS, zero JS) for phones, weak devices and reduced motion;
    `PuzzleLogo3D` (React Three Fiber, extruded + bevelled pieces) only on desktops with ≥ 6 cores, ≥ 4 GB and WebGL2,
    loaded with `next/dynamic` so three.js is never downloaded elsewhere. `?3d` / `?2d` force a mode.
    The 2D logo is the still placeholder until WebGL is ready, then cross-fades; the canvas stops rendering off-screen.
45. **`flat` (no tone mapping)** in the canvas so brand colors render exactly; cream pieces turn ink in the light theme.
46. `@react-three/drei` was removed again: nothing used it (performance-peak #11, unused dependencies).
47. **Hero v2 (premium + cinematic + scroll + interactive):** the 3D K now renders on a full-screen, fixed,
    click-through canvas aligned every frame to its hero box, so pieces can fly anywhere without clipping.
    - Look: MeshPhysicalMaterial with clearcoat + procedural RoomEnvironment reflections (no HDR download,
      `environmentIntensity` 0.45 so brand colors stay true) + orange rim light; no post-processing (cost).
    - Motion: pieces swirl in from depth, each flashes orange as it snaps; the K pops with a small camera shake.
    - Scroll: the K breaks apart as the hero scrolls away and reassembles on the way back (scrubbed, reversible).
      Done with one scroll-derived value per frame, not GSAP, since nothing else needs a timeline yet.
    - Interactive: pieces are pushed by the pointer (magnet) and spring back; a click bursts the K and it re-snaps.
    - All effects drive per-piece damped springs; flashes are dated to landing times (frame-rate independent).
48. **One puzzle language for every section** (pulled forward from Phase 4): `PuzzleAssemble` scatters a section's
    `.pz-piece`s while it is off-screen and snaps them in (staggered back-out ease) when it arrives, reversibly;
    `MagneticTilt` leans cards toward the pointer; `.pz-card` adds the logo's knob and socket. Pure CSS transitions
    driven by one IntersectionObserver per section: no extra libraries, no WebGL outside the hero.
    About (stats count up), Toolkit (tools orbit the K on a CSS 3D ring), Work (discipline tiles), Journey
    (scroll-scrubbed pencil line, nodes fill when reached), Contact (the missing piece snaps into its slot).
    Without JS, or with reduced motion, everything renders assembled.
49. **The hero K docks into the header on scroll:** it breaks apart mid-flight, arcs to the sticky header's logo slot
    and re-snaps there; the header logo then takes over and the 3D canvas pauses. Scrolling up reverses it.
50. **Section data comes from the API through `"use cache"` loaders** tagged like the API's output cache (`settings`,
    `skills`, `tools`, `timeline`, `categories`), `cacheLife("hours")`; an unreachable API renders empty sections
    instead of failing the page. The contact CTA appears once `contact.email` (or socials) is set in the CMS.

## Performance pass (2026-11-14, performance-peak)

51. **Kept (measured, 3 Lighthouse mobile runs, median):** absolute hreflang/canonical via `SITE_URL` (SEO 91 → 100);
    no `NextIntlClientProvider`: header buttons get server-rendered strings as props and the language switch is a
    plain `next/link` (initial JS 210 → 195 KB gzip, TBT 271 → 193 ms, Speed Index 3.1 → 2.0 s); the toolkit orbit
    pauses while its section is off-screen.
52. **Reverted:** one page-wide pointer listener instead of per-card `MagneticTilt` hydration: TBT got worse
    (193 → 343 ms), so per-card stays.
53. **Remaining LCP gap is simulated, not observed:** Lighthouse's simulated LCP is ~3.2 s (4x CPU), but the
    observed LCP is 328 ms (= FCP; the headline text). Closing the simulated gap needs visual trade-offs
    (font-display: optional, or delaying hero animations) and is left for the owner to decide.

## Projects, comments, contact (2026-11-14, pulled forward from Phases 3 and 6)

54. **Projects** are translatable, linked many-to-many to categories and tools, Draft/Published (only Published is
    public), featured first. Public list is paged, filterable by category/tool slug, and returns everything a card
    shows in one projected query. Cover images are URLs until the media library exists; no cover → branded cover.
55. **Testimonials go through moderation** (Pending → Approved/Rejected); only Approved are public (max 50). Reviews
    are shown in the language they were written in.
56. **Public forms (testimonials, contact):** FluentValidation length caps, a honeypot field (`website`) whose
    submissions are answered 202 like any other but silently dropped, and a "forms" rate limit of 5 per 10 minutes
    per visitor. Submitter IPs are stored only as SHA-256 hashes. Turnstile and email alerts come with the
    Resend/Turnstile keys.
57. **Real visitor IP behind the web server:** the API trusts `X-Client-IP` only when `X-Forwarded-Secret` matches
    `Forwarding:Secret` (constant-time compare); otherwise it uses the connection IP. Rate limits partition on it.
58. **Sample data is development-only** (`Seed:SampleContent`, set in appsettings.Development.json): the old site's
    demo projects and "Example" reviews, labelled as samples. Production never seeds them.
59. Editing a category or tool also evicts the `projects` output cache (cards show their names); public cache keys
    vary by every query parameter (locale, filters, paging).
60. **Smart navbar:** server-rendered links + one `SmartNav` client component that writes attributes/CSS variables
    in a rAF-throttled scroll handler (hide on scroll down, show on scroll up, never while the hero K is flying to
    the dock; glass state; reading-progress bar; active section via IntersectionObserver; mobile menu).
61. **Projects grid:** bento layout (featured project spans 2×2), category chips filter client-side over server-
    rendered cards (cards snap in on change), branded covers (accent color, puzzle shapes, initials) until real images.
62. **Reviews ticker:** two CSS marquee bands in opposite directions (list rendered twice, copy aria-hidden), paused on
    hover/focus and while off-screen; "Leave a review" opens a native `<dialog>` form.
63. **Public forms go through `/api/forms/[form]`** (allow-list: testimonial, contact; same-origin check), which
    forwards the visitor IP + `FORWARDING_SECRET` so the API rate-limits per visitor. Client zod schemas mirror the
    API validators; the API stays the source of truth.
64. **Navbar is always visible** (owner's request); the hide-on-scroll from #60 is gone. Opaque header background
    instead of backdrop blur (blur re-renders on every scroll frame).
65. **Type scale:** `.type-hero/.type-h2/.type-h3/.type-lead/.type-label/.type-quote` in globals.css; Clash Display
    for headings and nav, body 17 px.
66. **Motion diet:** sections assemble once (first time they're seen), smaller scatter, tilt only on project cards,
    3D logo renders on demand (no idle frames) and falls back to 2D for the visit if intro frames exceed 25 ms.
67. **Reviews are a puzzle wall** (replaces the ticker in #62): approved reviews as jigsaw pieces in the brand
    colours, the last piece is an empty slot that opens the review form. No looping animation.
68. **Theme:** pen-tool Bézier dividers between sections, a faint puzzle cut-line texture on the page, ink footer with
    the "Every piece fits." wordmark.
69. **Security headers:** web sets CSP (self-only; `'unsafe-inline'` for the theme script and Next bootstrap), HSTS,
    nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, no `X-Powered-By`. API sets nosniff, DENY,
    `default-src 'none'` CSP, no-referrer; HSTS + 308 HTTPS redirect outside Development; IIS/Kestrel `Server` and
    `X-Powered-By` removed (web.config). Zod runs jitless so the CSP needs no `unsafe-eval`.
70. **OpenAPI is served only in Development** (it feeds the generated web types; production doesn't advertise it).
71. **SEO:** `robots.txt` (admin and api disallowed), `sitemap.xml` with hreflang, Open Graph/Twitter cards with a
    build-time 1200×630 image, theme-color per scheme.
72. **API reads from the site:** 8 s timeout, one retry for GETs (the first call often wakes a cold host). A failed
    read throws inside the cached function, so failures are never cached; sections fall back to empty data.
73. **Keep the API warm:** MonsterASP stops the app pool when idle (cold start ≈ 15 s). Ping
    `/api/v1/health/live` every 5 minutes with a free uptime monitor (e.g. UptimeRobot); this also gives downtime
    alerts.
74. Accepted: 7 "moderate" `npm audit` findings are one minimatch advisory nested in ESLint's TypeScript parser
    (dev-only, matches only our own globs, never shipped). Revisit when typescript-eslint updates it.
