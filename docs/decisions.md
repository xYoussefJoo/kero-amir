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
