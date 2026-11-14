# CLAUDE.md: Kero Amir Portfolio + CMS

Full brief: `docs/brief.md`. Decisions log: `docs/decisions.md`. Read both before starting a phase.

## What this is
A portfolio + admin CMS for Kero Amir (senior graphic designer). Public site and `/admin` in Next.js,
backed by a .NET 10 Web API and SQL Server. Kero manages all content himself.

## Working rules
- Build one phase at a time (phases are in `docs/brief.md`). Stop after each phase, report, wait for "continue".
- Small choices: decide, log in `docs/decisions.md`, keep going. Ask only about choices that can't be undone.
- Never commit secrets. Use user-secrets / `.env.local`. Only placeholders in committed config.
- No AI attribution or `Co-Authored-By` lines in commits or PRs.
- Done beats perfect: ship the phase's acceptance criteria, don't gold-plate.

## Stack (do not substitute)
- **Web:** Next.js App Router, TypeScript strict, Server Components, Tailwind v4, shadcn/ui (admin), next-intl (`en`, `de`),
  Motion, GSAP ScrollTrigger, React Three Fiber + drei (desktop only), react-hook-form + zod, TanStack Query (admin),
  Tiptap, dnd-kit. Package manager: **npm**.
- **API:** ASP.NET Core .NET 10, minimal APIs grouped by feature, Clean Architecture, EF Core 10 code-first,
  SQL Server, Identity + JWT + TOTP 2FA, FluentValidation, ProblemDetails (RFC 7807), OpenAPI.
- **Services:** Cloudflare R2 (images, behind `IFileStorage`), Cloudflare Stream (reels), Resend (behind `IEmailSender`),
  Turnstile, Vercel Web Analytics.
- **Tests:** xUnit + Testcontainers (API), Vitest + Playwright (web).

## Layout
```
apps/web/                      Next.js (public site + /admin)
  app/[locale]/                public pages
  app/admin/                   CMS
  app/api/bff/[...path]/       admin proxy to the API (holds auth cookies)
  app/api/revalidate/          tag revalidation webhook
  components/{ui,sections,blocks,admin}/
  lib/api/                     generated OpenAPI client: never hand-edit
  messages/{en,de}.json
apps/api/
  src/KeroAmir.Domain/         entities, enums, rules (no dependencies)
  src/KeroAmir.Application/    use cases, DTOs, validators (depends on Domain)
  src/KeroAmir.Infrastructure/ EF Core, storage, email, Cloudflare (depends on Application)
  src/KeroAmir.Api/            endpoints, auth, rate limits, webhooks (composition root)
  tests/KeroAmir.Tests/
design/tokens.json             source of truth for colors/type
docs/
```

## Auth model
- Admin browser → `/api/bff/*` (Next.js) → API with `Authorization: Bearer`.
- Next.js stores access/refresh tokens in httpOnly, Secure, SameSite=Lax cookies on the web origin.
- The API never sets cookies and does not allow browser CORS. Public pages fetch from Server Components.

## Design tokens
Brand: cream `#F4F0E7`, blue `#2546EB`, orange `#FF6535`. Themes via `data-theme` on `<html>`.

| Token | Light | Dark |
|---|---|---|
| `--bg` | #F4F0E7 | #0E1120 |
| `--surface` | #FFFFFF | #171B2E |
| `--text` | #0E1120 | #F4F0E7 |
| `--muted` | #5B5F6E | #8A8E9C |
| `--primary` | #2546EB | #7B93F5 |
| `--on-primary` | #F4F0E7 | #0E1120 |
| `--accent` | #FF6535 | #FF6535 |
| `--on-accent` | #0E1120 | #0E1120 |

- Orange is an accent (~5% of a screen): badges, banner, pill, shapes. Never text on a light background.
- Text on orange is always ink. Text on blue is cream.
- Logo: `logo-dark-bg` (cream parts) on dark, `logo-light-bg` (cream parts → ink) on light.
- Type: Clash Display (display), Inter (body), JetBrains Mono (labels like `02 // TOOLKIT`). Self-hosted.
- Use logical CSS properties (`ms-`, `pe-`, `inset-inline`) everywhere so RTL can be added later.

## Conventions
- C#: file-scoped namespaces, nullable enabled, `TreatWarningsAsErrors`, records for DTOs, async all the way,
  `CancellationToken` on every endpoint. One folder per feature in Api/Application.
- Entities inherit `BaseEntity` (`Id`, `CreatedAt`, `UpdatedAt`, `DeletedAt`); soft delete via global query filter.
- Translatable entities have a `*Translation` child keyed by `(ParentId, Locale)`.
- TS: no `any`, server components by default, `"use client"` only where needed. zod schemas next to forms.
- Every public form: Turnstile + honeypot + rate limit. Never render visitor HTML.
- 3D, GSAP and the custom cursor load only on desktop with ≥ 6 cores and no reduced motion; `?3d` forces on.

## Clean Architecture rules
- Dependencies point inward only: Api → Infrastructure → Application → Domain. Domain references nothing.
- **Domain:** entities, value rules, enums. No EF attributes, no DTOs.
- **Application:** one folder per feature (`Features/Categories/...`) with commands/queries, handlers, DTOs and
  FluentValidation validators. Talks to data through `IAppDbContext`; to the outside world through interfaces
  (`IFileStorage`, `IEmailSender`, `ITokenService`, ...). Returns `Result<T>`, never throws for expected failures.
- **Infrastructure:** implements those interfaces (EF Core, Identity, R2, Resend, Cloudflare).
- **Api:** thin endpoints: bind → call handler → map `Result` to HTTP (ProblemDetails on failure). No business logic.
- No MediatR (commercial licence now): handlers are plain classes registered in DI and injected into endpoints.

## Performance standards (from the performance-peak checklist; apply only what fits)
- **API reads:** `AsNoTracking`, project to DTOs with `Select` (required columns only), page-based pagination on every list
  (max page size 100), no N+1 (projection or explicit `Include`), indexes for every WHERE / ORDER BY used.
- **Caching:** public reads use ASP.NET Core output caching with tags, evicted on write; the web uses `"use cache"` +
  `cacheTag` and `/api/revalidate`. No Redis unless measurements demand it.
- **Outbound calls:** `HttpClient` via `IHttpClientFactory` with timeouts and retry/backoff (standard resilience handler).
- **Slow work off the request path:** emails, image processing and webhooks go through a background queue (`Channel<T>` + hosted service).
- **Responses:** Brotli/Gzip response compression; long immutable cache headers for hashed assets.
- **Web:** Server Components + static generation by default; code-split heavy client code (`next/dynamic`); `next/image`
  with AVIF/WebP + explicit sizes; skeletons that match final layout; TanStack Query for dedupe + optimistic updates in the
  admin; debounce search and autosave; no unbounded lists (virtualize if hundreds of rows).
- **Observability:** OpenTelemetry traces (HTTP → handler → SQL) in the API; Vercel Analytics for real-user vitals;
  Lighthouse budgets in CI from Phase 4.
- Measure before claiming a gain. If a change shows no measurable benefit, don't keep it.

## Commands
```
# API
dotnet build apps/api/KeroAmir.slnx
dotnet test --solution apps/api/KeroAmir.slnx        # Microsoft.Testing.Platform (set in global.json)
dotnet ef migrations add <Name> -p apps/api/src/KeroAmir.Infrastructure -s apps/api/src/KeroAmir.Api -o Persistence/Migrations
dotnet ef database update -p apps/api/src/KeroAmir.Infrastructure -s apps/api/src/KeroAmir.Api
dotnet run --project apps/api/src/KeroAmir.Api

# Web
cd apps/web && npm run dev | npm run lint | npm run typecheck | npm test | npm run build
npm run api:generate     # regenerate lib/api/schema.d.ts from the running API (OPENAPI_URL to override)
```
Local dev DB: the machine's SQL Server instance (`Server=.;Database=KeroAmir;Trusted_Connection=True;TrustServerCertificate=True`)
or `docker compose up sqlserver`.

## Definition of done (each phase)
- API build + tests pass; web lint + typecheck + build pass, no warnings.
- From Phase 4: Lighthouse mobile 90+, LCP < 2.5 s, CLS < 0.05, INP < 200 ms; Playwright smoke tests pass.
- WCAG 2.2 AA: keyboard, visible focus, alt text required, reduced motion respected.
- `docs/decisions.md` and README updated.
