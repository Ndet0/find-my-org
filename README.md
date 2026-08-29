# OPSflow

Operations and project management platform — web + mobile.
Manage people, departments, clients, projects and tasks from one place,
with activity logging, notifications and role-based dashboards.

See [`docs/product_architecture.md`](docs/product_architecture.md) for what
it does, [`docs/technical_architecture.md`](docs/technical_architecture.md)
for how it is built, and [`docs/sprint.md`](docs/sprint.md) §24 for the
current, verified build status.

## Stack

| Layer | Technology |
| --- | --- |
| Language | TypeScript |
| Monorepo | pnpm workspaces + Turborepo |
| API | Hono on Bun |
| Database | PostgreSQL 16 + Prisma 7 |
| Auth | Better Auth *(not yet wired)* |
| Web | React + Vite + TanStack Router/Query/Form + Tailwind + shadcn/ui *(not yet scaffolded)* |
| Mobile | Expo + Expo Router + NativeWind *(not yet scaffolded)* |
| Validation | Zod, shared between API and clients |
| Tooling | Biome |

## Getting started

Requires Node 22+, pnpm 11+, Bun 1.3+ and Docker.

```bash
pnpm install
cp .env.example .env          # then set BETTER_AUTH_SECRET
openssl rand -base64 32       # ^ use this value

pnpm db:up                    # PostgreSQL on localhost:5434
pnpm db:migrate               # apply migrations
pnpm --filter @opsflow/db run seed   # roles + departments

pnpm dev                      # start everything Turborepo knows about
```

Verify the API:

```bash
curl http://localhost:3000/api/health
# {"success":true,"data":{"status":"ok",...,"database":{"connected":true,...}}}
```

## Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Run all apps in watch mode |
| `pnpm build` | Build all apps and packages |
| `pnpm typecheck` | Type-check the workspace |
| `pnpm lint` / `pnpm lint:fix` | Biome check / autofix |
| `pnpm db:up` / `pnpm db:down` | Start / stop local PostgreSQL |
| `pnpm db:migrate` | Create and apply a migration |
| `pnpm db:generate` | Regenerate the Prisma client |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:reset` | Drop, re-migrate and re-seed |

## Layout

```
apps/
  api/       Hono API (Bun)
  web/       React web app            — not yet scaffolded
  mobile/    Expo app                 — not yet scaffolded
packages/
  config/    Shared TypeScript configs
  db/        Prisma schema, migrations, client
  types/     Shared types and Zod schemas — not yet built
  ui/        Design tokens                 — not yet built
  auth/      Better Auth configuration     — not yet built
docs/        Product, technical and database documentation
```

## Conventions

- **Prisma is the single source of truth for the database.** The DBML and
  SVG in `docs/` are documentation artifacts and follow the schema.
- **The API is the security boundary.** The frontend hiding a control is
  not authorization; every check is enforced server-side.
- **Routes stay thin.** Business logic lives in `apps/api/src/services`.
- **One response envelope.** Every endpoint returns
  `{ success: true, data }` or `{ success: false, error: { code, message } }`.
- **Secrets never enter the client.** Anything behind a `VITE_` prefix is
  public.
