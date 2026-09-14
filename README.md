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
| Auth | Better Auth |
| Web | React + Vite + TanStack Router/Query + Tailwind + shadcn/ui |
| Mobile | Expo + Expo Router + NativeWind |
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
pnpm db:seed                  # roles, departments + bootstrap users

pnpm dev                      # start everything Turborepo knows about
```

Verify the API:

```bash
curl http://localhost:3000/api/health
# {"success":true,"data":{"status":"ok",...,"database":{"connected":true,...}}}
```

## Development accounts

`pnpm db:seed` creates three accounts, all with the password
`opsflow-dev-password` (override with `SEED_USER_PASSWORD`). The seed refuses
to run when `NODE_ENV=production`.

| Email | Role |
| --- | --- |
| `admin@opsflow.local` | admin |
| `manager@opsflow.local` | manager |
| `employee@opsflow.local` | employee |

Sign in and read the current user:

```bash
curl -c /tmp/opsflow.cookies -X POST http://localhost:3000/api/auth/sign-in/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@opsflow.local","password":"opsflow-dev-password"}'

curl -b /tmp/opsflow.cookies http://localhost:3000/api/me
```

Better Auth rejects state-changing requests without a matching `Origin`
header, so `sign-out` from the command line needs `-H 'Origin: $WEB_URL'`.

## Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Run all apps in watch mode |
| `pnpm build` | Build all apps and packages |
| `pnpm typecheck` | Type-check the workspace |
| `pnpm test` | Run every package's tests (the API's need the local database) |
| `pnpm lint` / `pnpm lint:fix` | Biome check / autofix |
| `pnpm db:up` / `pnpm db:down` | Start / stop local PostgreSQL |
| `pnpm db:migrate` | Create and apply a migration |
| `pnpm db:seed` | Seed roles, departments and development users |
| `pnpm db:generate` | Regenerate the Prisma client |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:reset` | Drop, re-migrate and re-seed |
| `pnpm bootstrap:admin` | Create the first administrator on a database that has none |
| `pnpm db:bench` / `pnpm db:bench --clean` | Insert / remove a bench volume for measuring query plans |
| `pnpm db:explain` | Run every list endpoint under `EXPLAIN ANALYZE` into `docs/perf/` |

CI (`.github/workflows/ci.yml`) runs lint, typecheck, the API tests and the
build on every push to `main` and every pull request.

## The first administrator

`pnpm db:seed`'s development users are refused under `NODE_ENV=production`, and
there is no public signup, so a production database is seeded in two steps:

```bash
pnpm --filter @opsflow/db run seed          # roles and departments
ADMIN_NAME="Ada Admin" \
ADMIN_EMAIL="admin@example.com" \
ADMIN_PASSWORD="…" pnpm bootstrap:admin
```

It does nothing once an administrator exists, so it is safe in a release
command. Change the password from the profile screen after signing in — there
is no password reset.

## Mobile app

```bash
pnpm --filter @opsflow/mobile dev     # Expo dev server; scan the QR code with Expo Go
pnpm --filter @opsflow/mobile web     # the same app in a browser on :8081
```

The app reads `EXPO_PUBLIC_API_URL` from the root `.env`. A physical device
cannot reach `localhost`, so set it to this machine's LAN address (and
`BETTER_AUTH_URL` to match) when testing on a phone. The API trusts
`opsflow://`, Expo Go's `exp://` and the web dev server on `:8081` outside
production.

The app icon, adaptive icon, splash image and favicon under `apps/mobile/assets`
are drawn by `pnpm --filter @opsflow/mobile assets` from the palette in
`packages/ui/src/palette.json`; re-run it after changing the palette.

## Layout

```
apps/
  api/       Hono API (Bun)
  web/       React + Vite SPA         — login and the protected app shell
  mobile/    Expo app                 — login, dashboard, tasks, projects, inbox, profile; managers and
                                         admins also manage tasks, projects, clients and departments
packages/
  config/    Shared TypeScript configs
  db/        Prisma schema, migrations, client
  auth/      Better Auth configuration
  types/     Shared types and Zod schemas
  ui/        Design tokens                 — palette, status tones, generated Tailwind CSS
docs/        Product, technical and database documentation
```

## Conventions

- **Prisma is the single source of truth for the database.** The DBML and
  the ERD in `docs/db_schema.md` are documentation artifacts and follow the
  schema.
- **Better Auth owns the `users`, `sessions`, `accounts` and `verifications`
  tables.** It has changed their shape between minor versions, so after
  upgrading it run
  `pnpm dlx auth@latest generate --config packages/auth/src/index.ts`
  and diff the result against `packages/db/prisma/schema.prisma`.
- **The API is the security boundary.** The frontend hiding a control is
  not authorization; every check is enforced server-side.
- **Routes stay thin.** Business logic lives in `apps/api/src/services`.
- **One response envelope.** Every endpoint returns
  `{ success: true, data }` or `{ success: false, error: { code, message } }`.
  It is defined in `@opsflow/types/api` and unwrapped by `apiFetch` on the client.
- **Clients never import `@opsflow/db`.** It instantiates the Prisma client on
  import. Contracts that web and mobile need live in `@opsflow/types`.
- **Secrets never enter the client.** Anything behind a `VITE_` prefix is
  public.
