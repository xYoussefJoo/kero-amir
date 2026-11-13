# Kero Amir: Portfolio + CMS

Portfolio and content management system for Kero Amir, senior graphic designer.
A Next.js public site and admin, backed by a .NET 10 Web API and SQL Server.

- Brief: [`docs/brief.md`](docs/brief.md)
- Decisions: [`docs/decisions.md`](docs/decisions.md)
- Design tokens: [`design/tokens.json`](design/tokens.json)

## Status

| Phase | State |
|---|---|
| 1. Foundation | ✅ done |
| 2. Auth + core API | next |
| 3–8 | planned |

## Requirements

- .NET SDK 10
- Node.js 24
- SQL Server: a local instance, or Docker (`docker compose up sqlserver`)

## Run locally

```bash
# API: http://localhost:5080 (OpenAPI at /openapi/v1.json)
cd apps/api
dotnet ef database update -p src/KeroAmir.Infrastructure -s src/KeroAmir.Api
dotnet run --project src/KeroAmir.Api --urls http://localhost:5080

# Web: http://localhost:3000
cd apps/web
npm install
npm run dev
```

The API reads `ConnectionStrings:Sql`. Development defaults to the local default instance (`Server=.`) with Windows auth;
override it with `dotnet user-secrets set ConnectionStrings:Sql "<conn>" --project src/KeroAmir.Api`.

## Checks

```bash
cd apps/api && dotnet build KeroAmir.slnx && dotnet test --solution KeroAmir.slnx
cd apps/web && npm run lint && npm run typecheck && npm run build
```

CI runs the same on every push (`.github/workflows/ci.yml`).

## Layout

```
apps/api   .NET 10: Domain → Application → Infrastructure → Api, plus Tests
apps/web   Next.js: public site (/en, /de) and /admin
design     tokens.json
docs       brief, decisions
```
