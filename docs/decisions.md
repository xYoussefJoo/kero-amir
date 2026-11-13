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
