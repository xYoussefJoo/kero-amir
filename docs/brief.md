# Project brief v2: Kero Amir Portfolio + CMS

This is the fixed version of `claude-code-prompt.md` (v1). The changes from v1 are listed at the end.

Kero Amir is a senior graphic designer (brand identity, packaging, 3D, motion). His current site
(https://portfolio-taupe-beta-48.vercel.app/) is hardcoded. We are replacing it with a **Next.js public site + admin CMS**,
backed by a **.NET 10 Web API** and **SQL Server**, so Kero can manage all his content himself.

Build one phase at a time. Stop after each phase, report, and wait for "continue".
Small choices go in `docs/decisions.md`. Only ask about choices that can't be undone.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (latest stable, App Router, TypeScript strict, Server Components), **npm** |
| Styling | Tailwind CSS v4, design tokens as CSS variables; shadcn/ui for the admin |
| Animation | Motion for UI; GSAP ScrollTrigger for scroll stories; React Three Fiber + drei for the 3D logo, lazy-loaded, desktop only (see Performance) |
| i18n | next-intl; locales **`en` (default), `de`**. Use logical CSS properties only, so `ar` (RTL) can be added later without a redesign |
| Forms / data | react-hook-form + zod; TanStack Query in the admin |
| Editor | Tiptap for rich text; dnd-kit for drag-to-sort |
| Backend | ASP.NET Core Web API on .NET 10, minimal APIs grouped by feature, Clean Architecture |
| Data | EF Core 10 code-first migrations, SQL Server (local instance or Docker in dev, Azure SQL serverless free tier in prod) |
| Auth | ASP.NET Core Identity, JWT access + refresh tokens, TOTP 2FA, lockout. **Browser never calls the API directly for admin: see Auth** |
| Validation | FluentValidation (API), zod (web) |
| Media | Images in Cloudflare R2 behind `IFileStorage`; server-side resize to WebP/AVIF + BlurHash |
| Video reels | Cloudflare Stream (direct creator uploads + webhooks + HLS) |
| Email | Resend behind `IEmailSender` |
| Spam | Cloudflare Turnstile + honeypot + ASP.NET Core rate limiting |
| Tests | xUnit + Testcontainers (SQL Server) for the API; Vitest + Playwright for the web |
| API contract | OpenAPI from the API → generated TypeScript client in `apps/web/lib/api` |
| Analytics | Vercel Web Analytics (no custom page-view tables) |

## Auth (fixed from v1)

v1 put the JWT in `SameSite=Strict` cookies set by the API. That breaks when web and API are on different sites
(`*.vercel.app` vs `*.azurewebsites.net`). Instead we use a **BFF**:

- Admin browser → Next.js route handler `/api/bff/[...path]` → .NET API.
- The Next.js server sets the httpOnly, Secure, SameSite=Lax cookies on the **web** origin and forwards the access token as a `Bearer` header.
- The API only accepts Bearer tokens. CORS is closed to browsers.
- Public pages read the API from Server Components (server to server), never from the browser.
- This works on any domains, with or without a custom domain.

## Repository structure

```
kero-amir/
├─ apps/
│  ├─ web/                         # Next.js: public site + /admin
│  │  ├─ app/[locale]/             # home, work, work/[slug], reels, about, contact, brand
│  │  ├─ app/admin/                # login, dashboard, projects, reels, media, skills, journey,
│  │  │                            # testimonials, comments, banner, inbox, pages, settings
│  │  ├─ app/api/bff/[...path]/    # admin proxy to the .NET API
│  │  ├─ app/api/revalidate/
│  │  ├─ components/{ui,sections,blocks,admin}/
│  │  ├─ lib/api/                  # generated client, never hand-edit
│  │  └─ messages/{en,de}.json
│  └─ api/
│     ├─ src/KeroAmir.Api/             # endpoints, auth, rate limits, webhooks
│     ├─ src/KeroAmir.Application/     # use cases, DTOs, validators
│     ├─ src/KeroAmir.Domain/          # entities, enums, rules
│     ├─ src/KeroAmir.Infrastructure/  # EF Core, storage, email, Cloudflare clients
│     └─ tests/KeroAmir.Tests/
├─ design/tokens.json
├─ docs/{brief.md,decisions.md}
├─ docker-compose.yml              # sqlserver + api
└─ .github/workflows/ci.yml
```

## Visual identity: "Every piece fits"

The logo is a **K** made from a vector pen nib with Bézier handles, interlocking **puzzle pieces**, an **orbit swoosh**, and a **pencil**.

- **Bézier handles:** section dividers, hover states, a pen-tool cursor (desktop only, off with `prefers-reduced-motion`).
- **Puzzle notches:** card corners, image masks, the "lock-in" page transition.
- **Orbit swoosh:** the motion path for the skills orbit and section headers.
- **Pencil:** SVG line-drawing reveals for headings and the journey timeline.

**Logo variants (fixed from v1).** The logo's cream parts are the same color as the light background and disappear on it.
Ship two variants: `logo-dark-bg` (cream parts stay cream) and `logo-light-bg` (cream parts become `--ink`).
Ask Kero for an SVG; until then, use the PNG and trace an SVG for the 3D logo.

**Brand colors (from Kero):** cream `#F4F0E7`, blue `#2546EB`, orange `#FF6535`.

**Tokens (fixed from v1, all pairs checked against WCAG 2.2 AA):**

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | #F4F0E7 | #0E1120 | Page background |
| `--surface` | #FFFFFF | #171B2E | Cards, panels |
| `--text` | #0E1120 | #F4F0E7 | Body text (16.5:1) |
| `--muted` | #5B5F6E | #8A8E9C | Secondary text, borders (5.6 / 5.7) |
| `--primary` | #2546EB | #7B93F5 | Links, buttons, focus (5.9 / 6.6) |
| `--on-primary` | #F4F0E7 | #0E1120 | Text on primary |
| `--accent` | #FF6535 | #FF6535 | Badges, banner, "available" pill, shapes. ~5% of a screen. **Never as text on light bg** (2.6) |
| `--on-accent` | #0E1120 | #0E1120 | Text on accent (6.4). Never cream/white on orange |

**Type:** Display: Clash Display (fallback Cabinet Grotesk). Body: Inter. Labels: JetBrains Mono (e.g. `02 // TOOLKIT`).
Self-host and subset all fonts (Fontshare and OFL licences allow it).

## Public site features

1. **Announcement banner**: dismissible (remembered per banner id), info/promo/urgent, optional link, scheduled start/end, per-locale text.
2. **Availability pill** next to the logo ("Available for work" / "Booked until {date}").
3. **Hero**: 3D K logo that tilts with the cursor (desktop), puzzle pieces assemble on load; headline, sub-headline, two CTAs, stats; all from the CMS.
4. **About**: bio, philosophy, capabilities, downloadable CV.
5. **Skills orbit**: tools orbit the K along the swoosh; clicking a tool filters projects. Skill groups listed below for accessibility.
6. **Work**: filters (category, tool, year), grid / 3D stack toggle (keep the stack from the current site), hover video previews.
7. **Case study `/work/[slug]`**: block renderer (full-bleed image, gallery, video, reel embed, before/after slider, rich text, quote, palette strip), tools used, likes, comments.
8. **Reels `/reels` + home strip**: vertical 9:16 from Cloudflare Stream; full-screen swipe; autoplay muted in view, tap to unmute, pause off-screen; poster; like, view count, optional project link.
9. **Appreciations**: one like per visitor per project or reel (hashed visitor id, no sign-up).
10. **Comments** on case studies: one level of threading, shown after approval, Kero replies as "Author".
11. **Testimonial wall**: approved reviews in a hover-to-pause ticker + "Leave feedback" form into moderation.
12. **Journey timeline**: scroll-driven, pencil line draws itself.
13. **Contact brief builder**: multi-step (service → budget → deadline → references upload → details) + "Book a call" link.
14. **Theme toggle** (light/dark) and **language switcher** (en/de).
15. **/brand page**: Kero's brand guide, edited with the block editor.

Every public form uses Turnstile + honeypot + rate limits. No visitor HTML is ever rendered.

## Admin CMS (`/admin`)

One Owner account. Mobile-friendly, shadcn/ui.

- **Dashboard**: new messages, pending comments/reviews, banner status, top projects/reels by likes.
- **Projects**: CRUD, duplicate, drag-to-reorder, Draft/Scheduled/Published, featured, SEO fields, per-locale tabs, block editor, live preview (Next.js draft mode), autosave.
- **Reels**: drag-and-drop TUS upload direct to Cloudflare Stream with progress; Processing → Ready; thumbnail picker; per-locale title/caption; tags; linked project; featured; order; schedule. Deleting a reel deletes the Stream video.
- **Media library**: upload, auto WebP/AVIF, required alt text per locale, folders, search.
- **Categories & Tools**, **Skills** (groups, items, levels, order, show-in-orbit), **Journey** entries.
- **Testimonials** and **Comments** moderation: approve / reject / edit typos / feature / reply / block.
- **Banner** manager with preview.
- **Inbox**: contact briefs with attachments; new → replied → proposal sent → won / lost; notes; email alert on arrival.
- **Pages** (About, Brand) with the block editor.
- **Settings**: hero text, stats, availability, socials, CV file, default OG image, booking link, default theme.
- **Translations view**: en/de side by side with missing-translation warnings.
- **Account**: password, 2FA, sessions, audit log.

Publishing calls `/api/revalidate` with a shared secret and cache tags (`projects`, `project:{slug}`, `reels`, `settings`).

## Data model (EF Core, SQL Server)

All entities: `CreatedAt`, `UpdatedAt`, `DeletedAt` (soft delete + global query filter). Translatable entities have a
`*Translation` child keyed by `(ParentId, Locale)`.

Users (Identity) · Projects + ProjectTranslations + ProjectBlocks(Locale, Type, SortOrder, DataJson) · Categories(+T) ·
ProjectCategories · Tools · ProjectTools · SkillGroups(+T) · Skills(+T) · TimelineEntries(+T) ·
Reels(StreamUid, Status, DurationSec, ThumbnailTimeSec, AspectRatio, ProjectId?, IsFeatured, SortOrder, PublishAt, ViewsCount, LikesCount) + ReelTranslations + ReelTags ·
Reactions(TargetType, TargetId, VisitorHash, unique) · Testimonials · Comments(ParentId?, IsAuthorReply, Status, IpHash) ·
Banners(+T) · ContactMessages + ContactAttachments · MediaAssets(+T AltText; StorageKey, Width, Height, BlurHash) ·
SiteSettings(Key, Locale?, ValueJson) · Pages(+Blocks) · AuditLogs.

Indexes: unique slugs; `(Status, PublishAt)` on Projects and Reels; `(Status, CreatedAt)` on Comments and Testimonials.

## API (`/api/v1`, OpenAPI, `?locale=` on public reads)

**Public:** `GET settings`, `GET banner/active`, `GET projects`, `GET projects/{slug}`, `GET reels`, `GET reels/{id}`,
`GET skills`, `GET timeline`, `GET testimonials`, `POST testimonials`, `GET|POST projects/{slug}/comments`,
`POST projects/{slug}/like`, `POST reels/{id}/like`, `POST reels/{id}/view` (once per visitor per day), `POST contact`.

**Auth:** `POST auth/login`, `auth/2fa`, `auth/refresh`, `auth/logout`.

**Admin:** CRUD for every module under `/admin/*`, plus `publish` / `unpublish` / `duplicate` / `reorder`, `POST admin/media`,
`POST admin/reels/upload-url`, moderation PATCH endpoints, `admin/audit`.

**Webhooks:** `POST webhooks/cloudflare-stream`: verify `Webhook-Signature`, set reel Ready + duration + aspect ratio, revalidate.

Errors: RFC 7807 ProblemDetails. Pagination: page-based everywhere.

## Configuration (never commit secrets)

`ConnectionStrings__Sql`, `Jwt__*`, `Storage__*`, `Cloudflare__AccountId`, `Cloudflare__StreamApiToken`,
`Cloudflare__StreamWebhookSecret`, `Turnstile__SecretKey`, `Email__*`, `Revalidate__Secret`, `Web__BaseUrl`.
`.env.example` + `appsettings.Development.json` placeholders; user-secrets locally.

## Performance (fixed from v1)

- 3D logo, GSAP and the custom cursor load **only on desktop with ≥ 6 cores and no reduced-motion**. Phones and weak devices get the static logo and never download three.js. `?3d` forces it on.
- At most 3 font families, subset, `font-display: swap`, preload only the display font.
- Images: AVIF/WebP, BlurHash placeholders, explicit width/height.

## Definition of done (every phase)

- `dotnet build` + `dotnet test` pass; `npm run lint` + `npm run typecheck` pass with no warnings.
- `docker compose up` gives API + database (local SQL Server instance is also fine for dev).
- From Phase 4: Lighthouse mobile 90+ on public pages, LCP < 2.5 s, CLS < 0.05, INP < 200 ms; Playwright smoke tests pass.
- WCAG 2.2 AA: keyboard navigation, visible focus, alt text required, reduced motion respected.
- Update `docs/decisions.md` and the README.

## Phases

1. **Foundation**: monorepo, docker-compose, .NET solution skeleton, EF Core + first migration, Next.js with tokens, fonts, light/dark theme, next-intl (en/de), CI.
2. **Auth + core API**: Identity, JWT, 2FA, BFF route, rate limiting, OpenAPI → TS client; CRUD for Settings, Categories, Tools, Skills, Timeline; seed data from the current site.
3. **Projects + media**: storage abstraction, image pipeline, Projects with blocks, publish + revalidate.
4. **Public site**: every page and section except reels, with animations and the 3D logo.
5. **Reels (Cloudflare Stream)**: upload URL, webhook, admin upload UI, public strip + player, likes and views.
6. **Engagement**: testimonials, comments, likes, banner, contact brief builder, email alerts, Turnstile.
7. **Admin polish**: dashboard, moderation queues, inbox, translations view, live preview, audit log, mobile pass.
8. **Launch prep**: SEO (hreflang, sitemap, robots, JSON-LD, OG images), security headers (CSP, HSTS), backups, Vercel + Azure configs, deployment docs.

## Later (not in v1)

French and Arabic (RTL), Editor role, content version history, Cmd/Ctrl+K menu, newsletter, custom analytics tables.

## Changes from v1

1. **Colors:** Kero's exact hex values; dark-mode primary `#7B93F5` and muted `#8A8E9C` because v1's blue (2.8:1) and graphite (2.9:1) failed on ink; orange never used as text on light, and text on orange is always ink.
2. **Logo:** a light-background variant, because the cream parts vanish on cream.
3. **Auth:** BFF through Next.js instead of `SameSite=Strict` cookies across two domains.
4. **Scope:** en/de only; dropped Editor role, version history, Cmd+K, newsletter, PageViewsDaily (use Vercel Analytics).
5. **Performance:** 3D only on strong desktops; Lighthouse target applies from Phase 4.
6. **Tooling:** npm instead of pnpm; Azure SQL serverless free tier and R2 named to keep running costs low.
