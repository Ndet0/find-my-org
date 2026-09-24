# OPSflow — Technical Architecture

**Version:** 3.5  
**Status:** Active  
**Architecture:** TypeScript Monorepo / Full-Stack Web + Mobile  
**Primary Runtime:** Bun  
**Package Manager:** pnpm  
**Monorepo:** Turborepo

---

# 1. Overview

OPSflow is a full-stack operations and project management platform designed to demonstrate modern enterprise application development.

The system provides:

- User and role management
- Authentication and authorization
- Department management
- Client management
- Project management
- Task management
- Team/project assignment
- Activity and audit logging
- Notifications
- Operational dashboards
- Responsive web application
- Mobile application

The architecture is designed around a **TypeScript-first monorepo**, allowing the web application, mobile application, API, authentication, database layer, shared types, and UI components to share common code and contracts.

---

# 2. Architecture Goals

The architecture is designed around the following goals:

### 2.1 Maintainability

Applications and shared functionality should be separated into independent packages with clear responsibilities.

### 2.2 Type Safety

TypeScript should be used across the application stack to reduce runtime errors and maintain consistent contracts between the frontend, backend, and database.

### 2.3 Reusability

Common types, authentication logic, database access, configuration, and UI components should be reusable across applications.

### 2.4 Scalability

The system should be capable of handling increasing numbers of:

- Users
- Projects
- Tasks
- Clients
- Activity records
- Notifications

### 2.5 Developer Experience

The project should provide:

- Fast development
- Consistent formatting
- Automated type checking
- Shared packages
- Reproducible builds
- Clear separation of responsibilities

### 2.6 Web and Mobile Support

The architecture should support both:

- Web users
- Mobile users

without duplicating backend business logic.

---

# 3. High-Level Architecture

```text
                         OPSFLOW
                            │
             ┌──────────────┴──────────────┐
             │                             │
             ▼                             ▼
        WEB APPLICATION              MOBILE APPLICATION
             │                             │
       React + Vite                  React Native (Expo)
             │                             │
       TanStack Router               Expo Router
             │                             │
       TanStack Query                TanStack Query
             │                             │
       Tailwind + shadcn             NativeWind
             │                             │
             └──────────────┬──────────────┘
                            │
                            ▼
                       HTTP / API
                            │
                            ▼
                      Hono API Server
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
         Better Auth    Application    Validation
                         Services
                            │
                            ▼
                          Prisma
                            │
                            ▼
                       PostgreSQL

```

---

# 4. Monorepo Architecture

OPSflow uses **Turborepo** to manage multiple applications and shared packages within a single repository.

Current structure:

```text
OPSflow/
│
├── apps/
│   ├── api/
│   ├── mobile/
│   └── web/
│
├── packages/
│   ├── auth/
│   ├── config/
│   ├── crypto/
│   ├── db/
│   ├── types/
│   └── ui/
│
├── docs/
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── biome.json

```

---

# 5. Applications

## 5.1 Web Application

Location:

```text
apps/web/

```

The web application provides the primary desktop/tablet interface for OPSflow.

### Responsibilities

- Dashboard
- Project management
- Task management
- Client management
- User management
- Department management
- Notifications
- Activity logs
- Comment threads on every project and task detail page (web only so far)
- Profile and password self-service, light and dark theme
- Authentication screens
- Administrative interfaces

### Technology

- React
- TypeScript
- Vite
- TanStack Router
- TanStack Query
- TanStack Form
- Zod
- Tailwind CSS
- shadcn/ui

TanStack Router handles navigation and route guards; TanStack Query owns
server state, so cached data is invalidated centrally rather than refetched by
hand after every mutation. Routes load their data in a `loader` that reads
through the Query cache (§19), so the two libraries share one source of truth.

---

# 6. Mobile Application

Location:

```text
apps/mobile/

```

The mobile application provides access to essential OPSflow functionality from mobile devices.

### Technology

- React Native, through Expo
- TypeScript
- Expo Router
- NativeWind
- TanStack Query
- Shared authentication
- Shared API
- Shared types

Expo keeps the native build toolchain off the critical path, and Expo Router
gives mobile the same file-based routing convention the web application uses.

### Primary Mobile Features

The initial mobile application should focus on high-value operational workflows:

- Authentication
- Dashboard summary
- View projects
- View assigned tasks
- Update task status
- View notifications
- View project details
- Basic activity information

The mobile application should not initially attempt to reproduce every feature of the web application.

### Management on Mobile (Phase 13b)

For the roles that hold the write permissions, the same app also manages the
work: create, edit and delete tasks; create, edit, staff and progress
projects; maintain the client directory; and, for administrators, maintain
departments. Every control is hidden with the shared `can()` check and
enforced again by the API, so the mobile client adds no authorization logic
of its own.

### People and Activity on Mobile (Phase 13c)

Phase 13b left users web-only. That was reversed: an administrator now
creates, edits and activates or suspends people from the phone, and the
activity trail has the mobile screen the product document always asked for.
Nothing moved to the client — role and status rules stay where they were.
A caller still cannot change their own role or status, and the organisation
still keeps one active administrator, because the API refuses each of those
and the phone only reports the refusal.

Two rules differ between the clients by design. The web redirects a role
away from a module it may not read; mobile hides the entry point instead,
since a pushed screen has no loader to redirect from. And mobile lists load
a page at a time as the reader scrolls rather than jumping to a page (§21.1),
filtered with chips rather than searched — the searchable, jump-to-page
tables stay on the web.

The comment threads added on 2026-09-22 are not on the phone yet. The API is
client-agnostic and `canDeleteComment` is shared, so the remaining work is a
card per detail screen; it is recorded as open in the sprint plan.

---

# 7. API Application

Location:

```text
apps/api/

```

The API is responsible for exposing backend functionality to both web and mobile clients.

### Technology

- Hono
- TypeScript
- Bun
- Prisma
- Better Auth

### Responsibilities

- HTTP API
- Request validation
- Authentication
- Authorization
- Business logic orchestration
- Database access
- Error handling
- API responses
- Activity logging

Example API structure:

```text
/api
│
├── /health          liveness, with a two-second database probe
├── /auth            Better Auth's handler
├── /me              the caller's profile
├── /dashboard
├── /users
├── /departments
├── /clients
├── /projects        …/:id/members, …/:id/comments
├── /tasks           …/:id/comments
├── /comments        DELETE /:id only
├── /dm              /key, /contacts, /conversations, …/:id/messages, …/:id/read
├── /notifications
└── /activity

```

---

# 8. Backend Architecture

The backend follows a layered architecture.

```text
HTTP Request
     │
     ▼
Hono Route
     │
     ▼
Middleware
     │
     ├── Authentication
     ├── Authorization
     └── Validation
     │
     ▼
Service Layer
     │
     ▼
Prisma
     │
     ▼
PostgreSQL

```

## 8.1 Routes

Routes define the HTTP interface.

Example:

```text
GET    /api/projects
GET    /api/projects/:id
POST   /api/projects
PATCH  /api/projects/:id
PATCH  /api/projects/:id/status
POST   /api/projects/:id/members
DELETE /api/projects/:id/members/:userId
GET    /api/projects/:id/comments
POST   /api/projects/:id/comments

```

Not every entity has a `DELETE`. Tasks, departments, project memberships and
comments are deleted; users and clients change status; a project is closed
by cancelling it. A comment thread is read and written through its parent,
so the nested routes inherit the parent's `projects:read` / `tasks:read`
gate and its row scoping. `DELETE /api/comments/:id` is addressed directly,
because a list item carries only its own id; it needs a session and the
service applies `canDeleteComment` (author, or any admin or manager).

Routes should remain relatively thin.

They should delegate business operations to services.

---

# 9. Service Layer

Business logic should be isolated from HTTP routes.

Example:

```text
apps/api/src/
├── routes/projects.ts          HTTP surface
├── services/project.service.ts business rules and Prisma
├── validators/project.validator.ts
├── middleware/                 auth, permission, error
└── lib/                        env, envelope, actor, dates, errors

```

The code is organised by layer rather than by feature folder: every entity
has one file in each of `routes/`, `services/` and `validators/`
(`comment.*` is the newest set).

The service layer handles operations such as:

- Creating projects
- Updating project status
- Assigning project managers
- Adding project members
- Calculating project progress
- Validating business rules

This makes the business logic reusable and easier to test.

---

# 10. Authentication

OPSflow uses **Better Auth** for authentication.

Authentication is responsible for establishing the identity of the user.

Example flow:

```text
User
 │
 ▼
Login
 │
 ▼
Better Auth
 │
 ▼
Session
 │
 ▼
Authenticated Request
 │
 ▼
Hono API

```

Authentication should support:

- User registration
- Login
- Logout
- Sessions
- Password management
- Authentication state
- Protected routes

Authentication and authorization should remain separate concerns.

Account status is enforced at two points. `requireAuth` in the API refuses a
session whose user is no longer `active` on every OPSflow route, reading the
session from the database rather than a cookie cache so suspension takes
effect on the next request. Better Auth's own endpoints sit in front of that
middleware, so `packages/auth` also refuses to *create* a session for a
non-active user (`databaseHooks.session.create.before`), which turns sign-in
into a 403, and the user service deletes the person's sessions when their
status leaves `active`. Better Auth's `update-user` endpoint is closed like
its signup endpoint: profiles are edited through `PATCH /api/me`, where the
schema and the activity log apply.

---

# 11. Authorization / RBAC

OPSflow uses role-based access control.

Initial roles:

```text
ADMIN
MANAGER
EMPLOYEE

```

Example permissions:

The matrix in `packages/types/src/permissions.ts` is thirteen strings, `read`
and `write` per module plus three read-only ones:

### Admin

```text
Users         → read, write
Departments   → read, write
Clients       → read, write
Projects      → read, write
Tasks         → read, write
Activity      → read
Notifications → read
Dashboard     → read

```

### Manager

```text
Clients       → read, write
Projects      → read, write
Tasks         → read, write
Users         → read
Departments   → read
Activity      → read
Notifications → read
Dashboard     → read

```

### Employee

```text
Projects      → read   (scoped to projects they are on)
Tasks         → read   (scoped to tasks assigned to them)
Activity      → read   (scoped to their own actions)
Notifications → read
Dashboard     → read   (own scope)

```

There is no `delete` permission and no reports or settings module: `write`
covers the deletes that exist (§8.1), and everything row-level — an employee's
scope, the last-admin rule, who may delete a comment (its author, or any
admin or manager, `canDeleteComment` in `@opsflow/types/comment`), who may
direct-message whom (`canDirectMessage` in `@opsflow/types/dm`: an
administrator and an employee may not reach each other, so the only way to
an administrator's inbox is through a manager) — is decided in the service
layer, not by a permission string.

Authorization should be enforced at the API level.

The frontend should not be considered a security boundary.

---

# 12. Database Architecture

OPSflow uses:

```text
PostgreSQL
     │
   Prisma

```

Prisma is the primary database access layer.

The database source of truth is:

```text
packages/db/prisma/schema.prisma

```

An earlier revision kept a hand-written `database/schema.sql` alongside the
Prisma schema. It was removed: two definitions of the same database drift apart,
and Prisma already produces the SQL through its migrations.

---

# 13. Prisma Architecture

Database package:

```text
packages/db/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── prisma.config.ts
│
└── src/
    └── index.ts

```

Prisma is responsible for:

- Database schema
- Type-safe queries
- Database migrations
- Database client
- Development database inspection

## 13.1 Prisma 7

Prisma 7 removed `url` from the `datasource` block, which changes how the
connection string reaches the database in two places:

- **Migrations and introspection** read it from `prisma.config.ts`.
- **The runtime client** receives it through a driver adapter,
  `@prisma/adapter-pg`, constructed in `src/index.ts`.

The adapter wraps node-postgres, which runs under both Bun and Node. A single
client instance is reused across hot reloads, because a fresh connection pool on
every file save exhausts PostgreSQL's connection limit within minutes.

Application flow:

```text
Hono Service
     │
     ▼
Prisma Client
     │
     ▼
PostgreSQL

```

---

# 14. Core Database Entities

The initial database contains:

```text
Role
Department
User
Client
Project
ProjectMember
Task
ActivityLog
Notification
Comment
DmKey
DmConversation
DmMessage

```

plus the four Better Auth models beside `User`: `Session`, `Account`,
`Verification` and `RateLimit`.

Relationships:

```text
Role
 │
 └── Users
       │
       ├── Projects
       │
       ├── Tasks
       │
       ├── Comments
       │
       ├── Activity Logs
       │
       ├── Notifications
       │
       ├── DM Key (one)
       │
       └── DM Conversations (as either party)
             │
             └── DM Messages

Department
 │
 └── Users

Client
 │
 └── Projects

Project
 │
 ├── Project Members
 │
 ├── Tasks
 │     │
 │     └── Comments
 │
 └── Comments

```

A comment belongs to exactly one task or one project (a CHECK constraint in
the migration enforces it) and cascades with that parent; its author is set
to null when the user is deleted so the thread keeps its shape.

---

# 15. Database Documentation

Database documentation is separated from the executable schema.

```text
packages/db/prisma/schema.prisma
        │
        └── Actual database definition

docs/db_schema.md
        │
        ├── Human-readable documentation
        └── Mermaid ERD

docs/db_schema.dbml
        │
        └── Full ERD source for dbdiagram.io

```

The Prisma schema is authoritative.

The DBML and the Mermaid ERD are documentation artifacts.

The diagram lives in Markdown rather than as a checked-in SVG export so it can
be edited alongside the schema instead of being regenerated through an external
tool.

---

# 16. Shared Types

Location:

```text
packages/types/

```

Shared TypeScript types should be used where appropriate by:

```text
Web
Mobile
API

```

The package is fourteen subpath exports, one per contract:

```text
@opsflow/types/api            the response envelope, Paginated<T>
@opsflow/types/auth           PASSWORD_MIN_LENGTH, the auth schemas
@opsflow/types/permissions    ROLE_NAMES, PERMISSIONS, can()
@opsflow/types/user           CurrentUser and the user shapes; likewise
                              /department, /client, /project, /task
@opsflow/types/activity       ACTIVITY_ACTIONS, ACTIVITY_ENTITY_TYPES
@opsflow/types/notification
@opsflow/types/dashboard
@opsflow/types/changes        changedFields() for PATCH bodies (§20)
@opsflow/types/comment        COMMENT_BODY_MAX (5000), canDeleteComment()
@opsflow/types/dm             the direct-message wire shapes, canDirectMessage(),
                              mergeMessages()

```

A second shared package sits beside it: `packages/crypto` (`@opsflow/crypto`)
holds the end-to-end encryption behind direct messages — key generation,
the password-wrapped backup, conversation keys and message sealing — and
`@opsflow/crypto/identity` the device-side lifecycle around them, with the
storage and the API calls injected. Both clients and the API tests run the
same code; see §26.2.

Each module carries the TypeScript shape, the status and transition tables
where the entity has them (`PROJECT_TRANSITIONS`, `TASK_TRANSITIONS`), and
the Zod schemas the API validates with and the forms validate against before
sending.

The goal is to reduce inconsistencies such as:

```text
Web expects:
status = "in-progress"

API expects:
status = "in_progress"

```

Shared contracts should establish a consistent vocabulary across applications.

---

# 17. Authentication Package

Location:

```text
packages/auth/

```

This package contains reusable authentication functionality.

Potential responsibilities:

```text
Session handling
Authentication utilities
User identity
Authorization helpers
Role checking
Protected route utilities

```

The package should be consumed by the API and, where appropriate, the web/mobile applications.

---

# 18. UI Package

Location:

```text
packages/ui/

```

The UI package holds **design tokens, not components**.

An earlier revision planned to put shared `Button`, `Modal`, `Table` and similar
components here. That is not possible: React DOM components cannot render in
React Native, so a component in `packages/ui` could only ever serve one of the
two clients. Rather than maintain two implementations behind one import path,
the package carries the values both platforms agree on and each renders them
natively.

What ships:

```text
src/palette.json   the single source of truth: the neutral scale (50–950) and six
                   semantic tones — muted, neutral, info, success, warning,
                   danger — each a background (DEFAULT) and a text colour
                   (foreground), plus the pair the same tone renders in on a
                   dark surface (dark.DEFAULT, dark.foreground). danger alone
                   carries strong, the solid fill for a destructive button.
                   Plain JSON so that Node scripts and Tailwind 3 configs can
                   require() it
src/colors.ts      the typed view of the palette, plus hexToRgb(); a tone
                   missing its dark pair fails typecheck here
src/tones.ts       which tone each task, project, client and user status, and
                   each priority, renders in. The one table both badges read
src/tokens.css     generated from palette.json by
                   `pnpm --filter @opsflow/ui generate`: a Tailwind 4 @theme
                   block of the light values and a .dark block that overrides
                   every tone variable with its dark pair; committed, and CI
                   fails if it drifts from the JSON

```

How each side consumes it:

- **Web** imports `@opsflow/ui/tokens.css` in `app.css`, which gives Tailwind the
  `bg-tone-info` / `text-tone-info-foreground` utilities alongside the shadcn
  surface variables. The block is plain `@theme`, not `@theme inline`, so the
  utilities reference `var(--color-tone-info)` and the generated `.dark { … }`
  block recolours them under the `.dark` class with no second set of class
  names.
- **Mobile** extends `theme.colors` in `tailwind.config.js` from `palette.json`,
  which produces the same utility names under NativeWind. Tailwind 3 flattens
  the nested `dark` pair to `bg-tone-info-dark` / `text-tone-info-dark-foreground`,
  which the mobile badge uses behind a `dark:` variant: NativeWind has no
  cascade to override a variable with, so the dark pair is a class there.
  Components that need a colour outside a class name (`SafeAreaView`, icon
  tints, placeholder text) read `@opsflow/ui/colors` against NativeWind's
  `useColorScheme()`. Every light surface and ink class carries its `dark:`
  pairing in place — `bg-white dark:bg-neutral-900`, `text-neutral-500
  dark:text-neutral-400` and so on — because NativeWind has no cascade to
  override a variable with; the pairing table is fixed and small (canvas 100 ↔
  950, surface white ↔ 900, borders 200 ↔ 800 and 300 ↔ 700, ink 900 ↔ 50 and
  the muted steps one shade lighter). The navigators' own chrome — stack
  headers, the tab bar, the scene behind a transition — is themed through
  Expo Router's `ThemeProvider` from `src/lib/navigation-theme.ts`, which puts
  the same palette steps behind it. `app.config.js` overrides the two colours in
  `app.json` that the launcher and splash screen paint, and
  `scripts/make-assets.mjs` draws the icon set in the same ink.
- **Tone → class names** live in each app's own badge component, spelled out.
  Tailwind only scans an app's own sources, so a class assembled from a string
  in the package would never be generated. The package shares the decision, not
  the class.

The web's grey surfaces are shadcn's zinc-toned `oklch` variables, not this
neutral scale; the two are visually close and unifying them is a Phase 14 task,
not a prerequisite for the tones.

Spacing, typography and radii are Tailwind's defaults on both platforms and are
not overridden, so they need no token yet.

Components live with their platform:

```text
apps/web/src/components/ui     shadcn/ui, Tailwind CSS
apps/mobile/src/components     React Native, NativeWind

```

---

# 19. Frontend Routing

The web application uses **TanStack Router**.

Example route structure:

```text
/
├── login
├── /                     the dashboard (index of the _authed layout)
├── projects
│   ├── /
│   ├── /new
│   ├── /$projectId       detail, with the comment thread
│   └── /$projectId/edit
├── tasks                 same four routes
├── clients               same four routes
├── users                 same four routes
├── departments           one page; create, edit and delete are dialogs
├── activity
├── notifications
├── profile
│   ├── /edit
│   └── /password
└── (no settings route)

```

Everything but `/login` sits under the `_authed` layout route, whose guard
reads `/api/me`.

Protected routes should verify authentication before displaying protected application content.

### Data loading

Every list, detail and edit route declares a `loader` that awaits its primary
query through `queryClient.ensureQueryData`, and `loaderDeps` carries the
validated search so a filter or page change re-runs it. The router therefore
holds the current page until the next one has data, and the page component
reads the same cache with `useSuspenseQuery`, so pages have no loading or
error branches of their own. Links preload on intent, and
`defaultPreloadStaleTime` is 0 so Query, not the router, decides whether a
hover costs a request. Data with its own loading state (filter options,
dashboard feeds) is prefetched from the loader without being awaited.

Three router-level components cover what that leaves: a pending component once
a loader runs past the router's threshold, an error component that renders in
the failed route's outlet and reads the API envelope (404, 403, anything else
with a retry, and 401 hands over to the login page), and a not-found component
for unmatched URLs. They live in `apps/web/src/components/route-feedback.tsx`.

Queries default to a 30-second `staleTime`, which is the drift the dashboard
and unread badge already accept. Every mutation invalidates the module it
changed, and a `MutationCache` hook invalidates activity, notifications and
dashboard stats after any mutation, since the API feeds those from every write.

---

# 20. Forms

OPSflow uses **TanStack Form** for complex forms. The shadcn `form` primitive is
not used: it is built around react-hook-form, which is not in this stack. Fields
compose `Label` and `Input` (or `Select`, `Textarea`) directly, validated by the
same Zod schemas the API accepts, which live in `@opsflow/types`.

Primary forms include:

```text
Create User
Edit User

Create Client
Edit Client

Create Project
Edit Project

Create Task
Edit Task

```

Forms should include:

- Client-side validation
- Server-side validation
- Error states
- Loading states
- Success feedback
- Field-level validation

Client-side validation improves UX but does not replace server-side validation.

An edit form sends only the fields that changed. Every update endpoint treats
an absent key as "leave it alone" and runs its eligibility guards per key that
arrives — a `projectId` is checked for an open project, a `clientId` for an
active client, a `role` for a self-edit — so a form that resent the whole
record tripped those guards on records whose related rows had since closed,
and logged changes that had not happened. `changedFields` in
`@opsflow/types/changes` diffs the submission against the loaded record's
wire shape; an untouched form makes no request. A saved value that is no
longer offered (an archived client, a deactivated assignee) is still shown by
the control, labelled as such, rather than rendered blank while the id is
still held.

---

# 21. Large Data Sets

Large tables are handled by pagination at the API, not by virtualisation in
the browser. Every list endpoint is offset-paginated with a default of 25 and
a hard ceiling of 100 rows per page (`DEFAULT_PAGE_SIZE` and `MAX_PAGE_SIZE`
in `@opsflow/types/api`), so no screen ever receives more rows than it can
render directly.

```text
10,000 records
       │
       ▼
GET /api/tasks?page=3        (≤ 100 rows)
       │
       ▼
Rows on screen, with a page control

```

TanStack Virtual was evaluated during Phase 12 and dropped: with the page cap
in place there is nothing for it to hide, and it would have been a dependency
added for the stack rather than for a problem. The decision is recorded in
§43. It can be revisited if a screen ever needs an unpaginated list.

## 21.1 One contract, two ways to page

The API contract is the same for both clients. What differs is how each one
walks it:

- **Web** jumps to a page. The table shows one page at a time with a total and
  a page control, and the page number lives in the URL.
- **Mobile** concatenates pages. A phone has no room for a page control, so the
  six directory lists — tasks, projects, notifications, activity, people and
  clients — ask for one page at the server's default size and append the next
  as the reader reaches the end (`useInfiniteQuery`, `onEndReached`). The
  header says how much of the total is on screen: `25 of 67 tasks` until
  everything has loaded, then `67 tasks`. Pickers and dashboard feeds still
  take one capped page, because they want a bounded list rather than a
  scrolling one.

Before this, each mobile list fetched one page at the 100-row ceiling and
nothing more, while its header read the server's total — so an organisation
with 247 tasks saw "247 tasks" above 100 rows, and nothing said the rest
existed.

Concatenating offset pages is only correct when two things hold, and each
is enforced in a different place:

- **A total order, on the server.** `skip`/`take` over a sort key that can tie
  lets the tied rows swap between one request and the next, so a row lands on
  two pages or on none. Every paged list query therefore ends in `id` —
  `name, id` for people, clients and projects, `dueDate, title, id` for tasks,
  and `createdAt desc, id desc` for activity and notifications, where `id` is
  uuid(7) and so continues the time order.
- **Dedupe, on the client.** A total order does not stop a row inserted *above*
  the loaded window from shifting everything below it down by one, which
  repeats the last row of one page as the first row of the next. That is the
  normal case for the activity trail and the inbox, which are newest-first.
  `flattenPages` in `apps/mobile/src/lib/paged.ts` keeps the first occurrence
  of each id, so a repeat never becomes a duplicate `FlatList` key. The new row
  itself appears on the next refresh.

A removal above the window has the opposite effect — the next page starts one
row later and skips one — and dedupe cannot recover a row it never received.
That is offset paging's trade against a cursor, accepted here because every
list is a total-and-page table on the web; a refresh restores it.

A failed *next* page does not replace the list. `useInfiniteQuery` sets the
query-wide `isError` when a next page fails, with the loaded rows intact, so
the screens show their full-screen error only when nothing has loaded and put
a one-line error in the list footer otherwise.

The inbox is refreshed differently from the other five; see §26.

## 21.2 Measured on a bench volume

The indexes in §14 were chosen by reading the queries. Phase 15 measured them,
and the measurement is repeatable:

```text
pnpm db:bench          200 users, 150 clients, 400 projects, 8 000 tasks,
                       60 000 activity rows, 15 000 notifications; then ANALYZE
pnpm db:explain        every list endpoint per role, deep pages, the unread
                       count and the dashboard, each SQL statement under
                       EXPLAIN (ANALYZE, BUFFERS)  →  docs/perf/<date>-query-plans.md
pnpm db:bench --clean  every bench row removed, each table back to its count
```

`bench.ts` (`packages/db/prisma`) is deterministic and separate from
`db:seed`: it reads the seeded accounts rather than creating them, marks every
row it inserts, and gives the seeded employee and manager a realistic share of
the work so the scoped queries have selectivity to measure. `explain.ts`
(`apps/api/scripts`) drives the assembled Hono app in-process and captures the
SQL from Prisma's query log (`PRISMA_LOG_QUERIES=1`, an opt-in in
`packages/db/src/index.ts`), so the statements explained are exactly the ones
the services build — nothing is transcribed.

What the first run found (2026-09-13) is in `docs/perf/` and summarised in the
sprint plan §24. In short: every page-1 statement and every dashboard count
uses an index and completes in low single-digit milliseconds for both roles;
the `id` tiebreaker in each `orderBy` is absorbed by an Incremental Sort that
stops after one page; Prisma loads each nested relation as one `IN (…)`
statement per page, so a list is one statement per relation plus the count,
not one per row. The two costs that remain are structural rather than missing
indexes — a deep offset page sorts everything before it, and an `ILIKE '%q%'`
count is a sequential scan — and both are recorded with numbers and a trigger
in the sprint plan's known gaps. No index was changed, and a `pg_trgm` trial
was measured and declined.

Regenerate the plans after any change to a list query, an index or the
visibility rules; the file is output, not a document to edit.

---

# 22. Styling Architecture

## Web

```text
React
  │
  ├── Tailwind CSS
  │
  └── shadcn/ui

```

Tailwind handles utility-based styling while shadcn/ui provides reusable interface components.

The design system should prioritize:

- Consistent spacing
- Typography
- Color tokens
- Responsive layouts
- Accessible components
- Clear data hierarchy

---

# 23. Mobile Styling

The mobile application uses:

```text
React Native
     │
  NativeWind

```

NativeWind is the established Tailwind-for-React-Native implementation, so the
spacing, colour and typography tokens shared with the web application are
expressed in the same utility-class vocabulary on both platforms.

The goal is not to make mobile visually identical to desktop.

Instead, the same design language should be adapted to mobile interaction patterns.

Example:

```text
Desktop
Sidebar → Dashboard → Data Table

Mobile
Bottom/stacked navigation → Dashboard → Cards/List

```

---

# 24. Dashboard Architecture

The dashboard is a key part of the OPSflow product.

The dashboard should aggregate operational data such as:

```text
Total Projects
Active Projects
Completed Projects
Overdue Projects

Total Tasks
Pending Tasks
Completed Tasks
Overdue Tasks

Total Employees
Active Employees

Active Clients

```

Example:

```text
                OPSFLOW DASHBOARD

┌────────────┐ ┌────────────┐ ┌────────────┐
│  PROJECTS  │ │   TASKS    │ │  EMPLOYEES │
│     24     │ │    148     │ │     32     │
└────────────┘ └────────────┘ └────────────┘

┌────────────────────────────────────────────┐
│             PROJECT PROGRESS               │
│                                            │
│ Project A  ████████████████░░  80%        │
│ Project B  ███████████░░░░░░░  55%        │
│ Project C  ██████████████████  92%        │
└────────────────────────────────────────────┘

┌──────────────────┐ ┌──────────────────────┐
│ UPCOMING TASKS   │ │ RECENT ACTIVITY     │
│                  │ │                      │
│ Design dashboard │ │ Project updated     │
│ API integration  │ │ New task created    │
│ Client meeting   │ │ User added          │
└──────────────────┘ └──────────────────────┘

```

Dashboard metrics should preferably be calculated server-side or through optimized queries rather than loading entire datasets into the frontend.

---

# 25. Activity Logging

Important system actions should generate activity records.

Example:

```text
User created project
User updated project
Manager assigned task
Employee completed task
Admin created user
Client updated
Member commented on task        (action `commented`)
Manager deleted a comment       (action `comment_deleted`)

```

The action vocabulary is `ACTIVITY_ACTIONS` in `@opsflow/types/activity`. A
comment is logged against its parent task or project, with the comment's id
in `metadata`, so the parent's feed tells the whole story; there is no
`comment` entity type.

Activity records contain:

```text
user
action
entity_type
entity_id
description
metadata
timestamp

```

This provides an audit trail and can power the dashboard's recent activity feed.

---

# 26. Notifications

Notifications are associated with users.

Examples:

```text
Task assigned              to the assignee
Task completed             to the project's manager
Project created            to its manager
Project status changed     to the manager and the members
Added to project           to the new member
Removed from project       to the removed member
New comment                to the task's assignee and creator, or the
                           project's manager, with a 120-character preview
New message                to the recipient of a direct message, once per
                           run of unread messages; never the text, which
                           the server cannot read

```

Those eight are the whole list. Every one is raised by a direct action and
never to the actor; there is no scheduler, so nothing is sent for an
approaching deadline. Both clients show an unread count and offer
mark-one and mark-all-read.

Notification lifecycle:

```text
Created
  │
  ▼
Unread
  │
  ▼
User views notification
  │
  ▼
Read

```

## 26.1 Keeping the mobile inbox fresh

Every write can raise a notification, so both clients' query caches refresh
the notification queries after any successful mutation (§43). On mobile the
inbox is an infinite list (§21.1), and refetching one re-requests every page it
has loaded, one after another. Left alone, an inbox scrolled to page six would
cost six requests for every tap anywhere in the app. So the inbox alone is
handled differently:

- **After any write, it is marked stale, not refetched.** The mobile
  `MutationCache` invalidates the inbox with `refetchType: 'none'`. The unread
  count and the dashboard feed are single cheap requests and still refresh
  straight away.
- **Marking one read patches the cache.** The server's copy of the row replaces
  the cached one under the All chip, and the row is removed under Unread. The
  inbox is then marked stale again: `setQueryData` clears the stale mark, which
  may have been standing for an earlier write that raised a notification the
  list has not seen.
- **It refetches when the tab comes into focus, if stale.** Staleness is read at
  focus time rather than subscribed to, so the refetch happens at most once per
  visit, however many writes came before it. Returning while the list is fresh
  costs nothing.
- **Mark all read refetches.** It changes every row and is rare.

`maxPages` was considered and rejected: it bounds how many pages are kept by
dropping the oldest, so rows the reader had already scrolled past would vanish
from the top of the list.

## 26.2 Direct messages

Direct messages are one-to-one and end-to-end encrypted. The API is a relay
and a store — it decides who may talk to whom, keeps public keys, ciphertext
and unread counts — and it never holds a key that opens a message. Nothing
about a conversation reaches the activity log: there is no content to
describe, and who talks to whom in private is not an organisational event.

**Who may reach whom.** Everyone may message a manager and a manager may
message everyone; an administrator and an employee may not reach each other
in either direction. The rule is `canDirectMessage` in `@opsflow/types/dm`,
applied by the service when a pair is formed and by both clients to filter
the picker. There is no `dm:*` permission: the rule is about the pair, which
is row-level.

**The scheme** (`packages/crypto`, version 1):

- Every person has one X25519 identity key pair, generated on their own
  device the first time they sign in after the feature arrived. The public
  half goes to the server (`PUT /api/dm/key`); the secret half never leaves
  the device in the clear.
- The secret key is *wrapped* for backup: scrypt (2^15, 8, 1) turns the
  login password and a random salt into a key that seals the secret with
  XChaCha20-Poly1305, with the user id as associated data. The server keeps
  the sealed blob so a second device can unlock it with the password. It
  holds only Better Auth's hash of that password for sign-in, so it cannot
  unwrap the blob itself. The public key may not change once set — every
  message ever sent to the person was sealed to it — so a `PUT` with a
  different one is refused (`DM_KEY_EXISTS`). The first registration is a
  plain insert, so two devices signing in at once cannot each register a
  different key: the loser is refused and unwraps the winner's backup.
  Replacing the wrapped half — what a password change does — needs the
  account password in the request (`currentPassword`), verified against
  Better Auth's hash and never stored: the backup is the one copy that lets
  a new device in, and a stolen session cookie may not overwrite it with
  something that will never open.
- A conversation's key is HKDF-SHA256 over the X25519 shared secret of the
  two identity keys, bound to both public keys, so both sides derive the
  same key and nobody else can.
- Each message is sealed with that key under a fresh 24-byte nonce, with the
  conversation id and the sender id as associated data. The server can store
  and forward a message; it cannot read it, alter it, replay it as the other
  party, or move it into another thread.

**On the clients.** The secret is kept per user id — `localStorage` on the
web, SecureStore on the phone — and forgotten when the session ends, whether
by sign-out or by a 401 surfacing from any request: the next person to sign
in on the device must not find the previous one's key. Sign-in restores it
from the backup, or generates it, with the password that is in hand at that
moment; the work is not awaited, so sign-in is not slowed by the key
derivation, and the result is written into the query cache the Messages page
reads, so a page opened before the derivation finished picks the key up. A
session that predates the feature, or a failed unlock, lands on the
`MessagingGate`, which asks for the password and does the same thing. The
password goes nowhere: it only unwraps the backup, or wraps a new key, on
the device. Two unlocks for the same person at once share one run. A device
that already holds a secret checks it against the backup when it unlocks —
a key that lost a first-upload race, or a damaged entry, is replaced by the
backup — and a secret the server has no backup of is backed up; offline, the
local key is trusted.

A password change re-wraps the backup under the new password in the same
form submission. If that re-wrap fails after the password has changed, the
device remembers it (a per-user mark beside the secret, kept across
sign-out) and the Messages page asks for the current password and uploads a
fresh seal of the key it holds; until then no other device can unlock, and
the unlock form says which password to try. Hermes has no WebCrypto, so the
mobile root layout installs `expo-crypto`'s `getRandomValues` on
`globalThis.crypto`, which is where `@opsflow/crypto` draws its randomness;
it also tells Query when the app leaves the foreground, so the polled
queries pause as they do in a hidden browser tab.

**Reading and writing.** A thread is paged newest first on the UUIDv7 id
(`?before=`), not on an offset, because a thread being written to shifts
under an offset page. The clients poll the newest page every four seconds
while it is open, the conversation list every ten, and the open
conversation's peer — status and key — every thirty; older pages are pulled
in on demand and merged by id (`mergeMessages`). Every message is opened on
the device and the result cached per conversation key and message id, since
ciphertext never changes; the conversation key itself is cached per pair of
identities, never per peer alone, so nothing derived for one person is
handed to the next one to sign in. The role rule is checked when a pair is
formed and again on every message sent, since a role can change under an
open thread. Opening a thread clears the reader's unread counter, and once
nothing is unread anywhere the `New message` notifications are marked read
with it; sending increments the peer's counter and clears the sender's,
inside one transaction, and raises one notification per run of unread
messages rather than one per line. The composer hands its text to the send
as it starts, so what is typed meanwhile is kept and a refused send puts
the text back.

**Limitations, on purpose for the first version.** One static key per
conversation rather than a ratchet, so there is no forward secrecy. One key
per person rather than per device, which is what makes the backup necessary
and ties the backup to the login password: a person who forgets their
password has no way back to their messages, and an administrator cannot
help, which is the point. The peer's public key is taken from the server
without a fingerprint to compare, so a compromised server could substitute
one; and the associated data covers the thread and the sender, not a
message counter, so the server could drop or re-insert a message within a
thread unnoticed. No editing, no deletion, no attachments, no group
threads, and polling rather than push. A person who has not signed in since
the feature arrived has no key yet and cannot be written to until they do;
the picker says so.

---

# 27. API Response Architecture

API responses should follow a consistent structure.

Successful response:

```json
{
  "success": true,
  "data": {}
}

```

Error response:

```json
{
  "success": false,
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Project could not be found"
  }
}

```

This makes API consumption predictable across both web and mobile applications.

---

# 28. Validation

Validation should happen at multiple levels.

```text
Frontend
   │
   └── UX validation

API
   │
   └── Request validation

Service
   │
   └── Business rules

Database
   │
   └── Data integrity

```

The API must never trust frontend validation.

## 28.1 Zod

**Zod** is the validation library, and its schemas are defined once in
`packages/types` and imported by both the API and the clients. A form and the
endpoint it posts to therefore enforce the same rules, and the error messages a
user sees on the client are the ones the server would produce.

The API validates requests with `@hono/zod-validator`. Environment variables are
parsed through Zod at boot, so a misconfigured deployment fails immediately
rather than on the first request that happens to need the missing value.

Sharing a schema is a convenience, not a security control: the server revalidates
every request regardless of what the client claims to have checked.

---

# 29. Error Handling

The API should provide centralized error handling.

Expected error categories:

```text
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Validation Error
500 Internal Server Error

```

Errors should be logged appropriately while avoiding exposure of sensitive implementation details to clients.

---

# 30. Development Tooling

The project uses:

```text
Bun
pnpm
Turborepo
TypeScript
Biome

```

### Bun

Used as the primary JavaScript/TypeScript runtime where appropriate.

### pnpm

Used for dependency management and workspace management.

### Turborepo

Used to coordinate:

```text
Web
Mobile
API
Shared packages

```

### Biome

Used for:

```text
Formatting
Linting
Code consistency

```

### Testing

`bun test` in the five packages that have tests, one root `pnpm test`
(Turborepo runs each package's `test` script), one assertion API across the
repo. No second runner. 465 tests on 2026-09-23.

```text
apps/api          54 — in-process against the seeded database (app.request()):
                  api.test.ts for the session, origin and one decision per
                  role, rules.test.ts for the cross-record rules and the
                  comment threads, dm.test.ts for the messaging role rule,
                  key registration (including two uploads at once and the
                  password a re-wrap needs), one thread sealed and opened
                  with the real @opsflow/crypto, and what an outsider gets;
                  fails early, with a fix, if a seeded account cannot sign in
packages/types    240 — the permission matrix, both state machines, every
                  list-query and form schema, changedFields, the comment
                  schema and delete predicate, the messaging wire contract
                  — tables restated as literals
packages/crypto   35 — base64 both ways, keys, wrap/unwrap, wrong password,
                  account binding, a swapped public key, replay and
                  tampering; the identity lifecycle against an in-memory
                  store, including the first-upload race, a local key that
                  disagrees with the backup, and the re-wrap retry
apps/web          87 — the API client, the theme store, the current-user and
                  nav-item helpers as units; the forms, the session guard and
                  login flow, the status dialog, the route feedback, the
                  search field and the comments card rendered with Testing
                  Library on happy-dom (test/render.tsx, test/api-mock.ts);
                  the messaging key wiring and the caches around opening
                  messages
apps/mobile       49 — the paging helpers, the query-string builder, the
                  error shapes, the dev-server host swap, the date rules and
                  clearSession — every module that react-native never reaches
```

`pnpm test` is the entrypoint: Turborepo runs each package's script in its
own directory, where its `bunfig.toml` applies. A bare `bun test` at the root
also works — it reads no per-package bunfig, which is why the DOM setup is an
explicit import rather than only a preload.

The web's component tests follow five rules, written into `test/render.tsx`:
the network is mocked at `fetch` (`mockApi`), keyed by method and pathname,
so the real envelope path runs and an unmocked request fails loudly; no test
mounts the Toaster, `AppShell` or `ThemeToggle`, so `lib/theme.ts` — a
module with import-time side effects — has one importer, and a toast is
asserted by spying on sonner's `toast`; no test uses `mock.module`, which
Bun keeps for the rest of the process; every file that renders registers its
own `cleanup`; and every assertion after an event goes through `findBy*` or
`waitFor`. The harness loads Testing Library, Router and Query with a
top-level `await import` after `setup.ts` has run, because Bun evaluates a
CommonJS dependency while linking — before any ES module body — and the
`use-sync-external-store` shim behind Router and Form picks its server
variant when no `window` exists at that moment. Tests import their component
the same way. That is what makes a bare `bun test` at the repository root,
which preloads nothing, agree with `pnpm test`.

Two more rules keep the client tests cheap. On the web, a test that mocks
`fetch` builds its responses with the registered `Response`, because the
registrator replaces Bun's for the process. On mobile, a module under test must not
import `react-native` — Bun cannot load it outside Metro — which is why the
pure paging helpers live in `paging.ts` and the TanStack wiring that imports
the API client lives in `paged.ts`.

---

# 31. Build Pipeline

The monorepo should support commands such as:

```text
pnpm dev
pnpm build
pnpm lint
pnpm typecheck

```

Turborepo coordinates these tasks across applications and packages.

Example:

```text
pnpm build
      │
      ▼
   Turborepo
      │
   ┌──┴──┐
   ▼     ▼
  Web   API

```

Only the web (`vite build`) and the API (`bun build`) have a `build` script;
the packages are consumed as TypeScript source and only type-checked, and the
mobile app is built natively (§36), outside Turborepo.

---

# 32. Environment Configuration

Environment variables should never be committed to source control.

Example:

```text
.env            one file at the repository root, read by every app
.env.example

```

Vite's `envDir` is the root and the API and mobile scripts pass
`--env-file=../../.env`, so there is exactly one place to set a value; no
per-app `.env` is read.

The variables the system actually reads:


| Variable             | Consumer     | Purpose                                          |
| -------------------- | ------------ | ------------------------------------------------ |
| `DATABASE_URL`       | API, Prisma  | PostgreSQL connection string                     |
| `BETTER_AUTH_SECRET` | Auth         | Session signing key, at least 32 bytes           |
| `BETTER_AUTH_URL`    | Auth         | Origin Better Auth issues and validates URLs for |
| `API_PORT`           | API          | Port the Hono server binds to locally            |
| `PORT`               | API          | Port assigned by the platform; wins over the above |
| `WEB_URL`            | API, Auth    | CORS allow-list and Better Auth trusted origin   |
| `VITE_API_URL`       | Web (public) | Origin the browser calls for `/api`; on Render, the static site's own URL (§36) |
| `EXPO_PUBLIC_API_URL` | Mobile (public) | The API origin the phone calls; inlined at build time. In development the host is replaced by the Expo dev server's address (`src/lib/api-url.ts`), so a phone on the LAN needs no edit |
| `NODE_ENV`           | API, Auth    | `production` turns on `Secure` cookies, the rate limiter and the production CORS list; the image sets it |
| `SEED_USER_PASSWORD` | Seeds, tests | Password of the development accounts; also read by the API tests and `db:explain` |
| `PRISMA_LOG_QUERIES` | Prisma       | Echo every query, for reading plans locally (§21.2) |
| `BENCH_SCALE`        | `db:bench`   | Multiplier for the bench volume |
| `MIGRATE_DATABASE_URL` | Release step | The schema owner's connection string; only for the pre-deploy migration, and currently not set (§36) |


`WEB_URL` has no default. It is both the CORS allow-list and Better Auth's
trusted origin, so guessing it wrong fails in confusing, security-shaped ways.

`PORT` is the deployment convention — Railway, Render and most other platforms
assign a port and inject it under that name — and `API_PORT` is the local one.
The server binds `PORT ?? API_PORT` (`lib/env.ts`); a deployment that bound
anything else would never answer its health check.

`ADMIN_NAME`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` are read only by
`pnpm bootstrap:admin` (§36) and only on a database with no administrator.

Anything behind a `VITE_` prefix is inlined into the browser bundle at build
time and is therefore public. Secrets must never use that prefix.

An `.env.example` file documents every required variable without exposing
secrets.

---

# 33. Security Architecture

Reviewed in Phase 17 (sprint §24). What holds, and where.

### Authentication

Better Auth, with a session read from the database on every request rather
than from a cookie cache, so suspension takes effect on the next request.
Sessions are refused at creation for a non-active account and deleted when
an account leaves `active`; Better Auth's signup and `update-user` endpoints
are closed (§10). Better Auth's rate limiter covers its own endpoints in
production, counting in the `rate_limits` table so the count is shared
across instances. Passwords are at least eight characters
(`PASSWORD_MIN_LENGTH`), one constant read by Better Auth and both create
forms.

### Session cookie

`SameSite=Lax`, `HttpOnly`, and `Secure` in production. The web app and the
API present one origin to the browser (§36); a cross-site deployment would need
`SameSite=None`, which Safari blocks by default. On a device there is no
cookie jar: the Expo plugin keeps the cookie in SecureStore and the API
client attaches it by hand (§6).

On the web, a 401 from any query or mutation ends the session — the cached
profile is dropped and the login page takes over — and the page that was
asked for is carried as `?redirect=`, honoured only as a path within the app
(`safeRedirect`). On the phone, every path that ends a session clears the
cache so nothing survives into the next person's sign-in.

### Authorization

Server-side, twice: a role gate in middleware (`requirePermission`, §11) and
row scoping in the service (`projectVisibilityWhere`, `taskVisibilityWhere`),
with a hidden row answered as 404. The clients hide controls as a courtesy
only.

### API

Every body is validated by the shared Zod schema before a handler runs;
bodies are bounded to 64 KiB before they are read; ids are UUIDs; list pages
are capped at 100 rows. Errors reach the client as a code and a message —
in production a fixed message for anything unexpected — while the full error
is logged server-side. The request log prints method, path, status and time,
never a body or a header. The health probe is open, needs no session, and
answers 503 after two seconds rather than hanging with the database.

### Database

Prisma, so every query is parameterised; the one raw statement is the
probe's `SELECT 1`. The development role is the database owner. Production
needs a role with only DML on the application schema, with `migrate deploy`
run as the owner (Phase 18).

### Secrets

Environment variables only, validated at boot (`env.ts`); the API refuses
to start with the placeholder `BETTER_AUTH_SECRET`. The clients see only
`VITE_*` and `EXPO_PUBLIC_*` values, which are public by construction.

### Dependencies

`pnpm audit --prod` runs in CI as an advisory step. The findings at the time
of writing are all in tooling-only paths (the Prisma CLI's MySQL driver and
config parser, Expo's prebuild plugins and dev server); none is loaded by the
running app. See sprint §24, Phase 17.

---

# 34. Data Flow

Example: Creating a project.

```text
User
 │
 ▼
Web / Mobile
 │
 ▼
Project Form
 │
 ▼
TanStack Form
 │
 ▼
POST /api/projects
 │
 ▼
Hono
 │
 ├── Authentication
 │
 ├── Authorization
 │
 └── Validation
 │
 ▼
Project Service
 │
 ▼
Prisma
 │
 ▼
PostgreSQL
 │
 ▼
Activity Log
 │
 ▼
API Response
 │
 ▼
Web / Mobile

```

---

# 35. Project Creation Example

```text
POST /api/projects

{
  "name": "Website Redesign",
  "clientId": "...",
  "managerId": "...",
  "priority": "high",
  "startDate": "2026-08-10",
  "deadline": "2026-09-10"
}

```

The API:

```text
1. Authenticate user
2. Verify permissions
3. Validate request
4. Verify client
5. Verify manager
6. Create project
7. Create activity log
8. Return project

```

---

# 36. Deployment Architecture

A production deployment may follow:

```text
                    INTERNET
                        │
              ┌─────────┴─────────┐
              │                   │
              ▼                   ▼
          WEB CLIENT          MOBILE CLIENT
              │                   │
              └─────────┬─────────┘
                        │
                        ▼
                     API
                        │
                        ▼
                    Hono App
                        │
                        ▼
                     Prisma
                        │
                        ▼
                  PostgreSQL

```

The web, API, and database are independently deployable. The decisions taken
in Phase 18 (sprint §24), and what each one constrains:

### One origin, and how Render provides it

The web app and the API are two Render services — a static site and a Docker
web service — declared in [`render.yaml`](../render.yaml), with managed
Postgres alongside, created in the dashboard rather than the blueprint (a
Blueprint that names an existing instance tries to create a second one). The
session cookie is `SameSite=Lax` (§33),
which only works if the browser sees the two as one site.

Render's own subdomains do not satisfy that on their own. `onrender.com` is on
the Public Suffix List, so `opsflow-web-18mx.onrender.com` and
`opsflow-api-hxy9.onrender.com` are cross-site to each other, exactly as
`example.co.uk` and `other.co.uk` are. A browser will not attach a `Lax`
cookie to a cross-site request, so sign-in would return 200, store the
cookie, and leave every request after it anonymous — a failure that looks
like a session bug rather than a DNS decision.

There are three ways to a single origin. The one deployed is a rewrite: a
Render static site can rewrite a path to a full URL, so `/api/*` on the web
origin is served by the API service, invisibly to the browser, which then
only ever talks to one host. `VITE_API_URL` is therefore the static site's
own URL, not the API's, and the session cookie is first-party. Render
documents the rewrite but not whether non-GET methods, request cookies and
`Set-Cookie` responses survive the proxy, and sign-in needs all three, so it
was verified on the live site on 2026-09-15 rather than assumed: `POST`
reaches the API with the browser's `Origin` intact and its JSON comes back,
and a browser sign-in holds its session across requests. The README keeps
the curl probes as the check to repeat if that ever regresses. Two
consequences of the proxy: the API still sees the browser's `Origin`, so
`WEB_URL` names the static site; and `BETTER_AUTH_URL` names the API service
itself, where the request actually lands.

The second way is a custom domain on both services — `app.<domain>` and
`api.<domain>` on one registrable domain — which needs no proxying and
would remove the rewrite rule. The third is serving the built SPA from the
Hono app, which needs no web code change — `apiFetch` and the auth client
both build their URLs from `VITE_API_URL` — at the cost of a static
middleware, a web build stage in the API image, and the independent
deployability this section rests on. Either is a drop-in if the rewrite's
behaviour changes.

`SameSite=None` was rejected outright: Safari's tracking protection blocks it
by default (§33).

### Web

A static Vite build: `dist/` served by any static host — on Render a
`runtime: static` service, no container. Two consequences. `VITE_API_URL` is
inlined at build time (§32), so pointing the app at a different API is a
rebuild rather than a restart. And TanStack Router owns every path below `/`,
so the host has to serve `index.html` for unknown paths; without that rewrite
a deep link or a refresh on `/projects/:id` is the host's own 404. The
blueprint spells it as a `rewrite` route from `/*`.

### API

Bun serving the Hono app, bound to the port the platform assigns (§32).
`GET /api/health` is the platform's probe: it races its `SELECT 1` against two
seconds and answers 503, so a database that accepts the connection and hangs
fails the check instead of hanging it (§33).

[`apps/api/Dockerfile`](../apps/api/Dockerfile) carries both runtimes: Bun
runs the server, Node runs the Prisma CLI. Prisma 7's `prisma-client`
generator emits plain TypeScript, so the server needs no build step and runs
from source — but `prisma migrate deploy` still shells out to the
schema-engine binary, which wants glibc and OpenSSL. That rules out Alpine and
rules in Debian slim. Render runs the pre-deploy command and the start command
in the same image, so the migration tooling cannot be confined to a build
stage, which is also why the image keeps its development dependencies.

The image is about 2 GB, most of it dependencies the API never loads.
`packages/auth` depends on `@better-auth/expo` for the mobile session plugin,
and pnpm installs that plugin's peers, so react-native, Hermes and Metro are
part of the API's dependency closure — roughly 730 packages. `turbo prune`
was tried and produces the identical set, because the cause is a real edge in
the dependency graph rather than a workspace filtering problem. Splitting the
Expo plugin behind its own entry point in `packages/auth` would fix it and is
the obvious next move if image size starts to matter.

### Database

Two roles, not one. Migrations run as the schema owner in a release step
(`prisma migrate deploy`, never `migrate dev`, which can reset); the API
connects as a role with DML only — `SELECT`, `INSERT`, `UPDATE`, `DELETE` on
the application schema and no DDL. The local compose database is a single
owner account, which is fine for development and is not the production shape.

In the blueprint that split is two variables. Render only exposes the owner's
connection string, so it would arrive as `MIGRATE_DATABASE_URL` and the API's
own `DATABASE_URL` is entered by hand after the DML-only role is created.
Because `prisma.config.ts` reads `DATABASE_URL`, the pre-deploy command
passes the owner's URL under that name for the length of the migration and
nowhere else:

```text
DATABASE_URL="$MIGRATE_DATABASE_URL" pnpm --filter @opsflow/db migrate:deploy
```

Render's pre-deploy command requires a paid instance type, and the deployed
services are free, so the command is commented out in the blueprint — and
`MIGRATE_DATABASE_URL` with it, because an owner credential sitting in the
running container's environment with nothing to use it is what the split
exists to prevent. The same `migrate deploy` is run from a local shell
against the database's External URL before any deploy that carries a
migration; the seed and `bootstrap:admin` were run the same way. The order is
the operator's to keep: nothing stops a deploy from starting against a schema
its migration has not reached yet. The comments migration of 2026-09-22 is
the first to need this step since the site went live.

Backups are the managed provider's scheduled snapshots; the only application
requirement is that a restore be tried once, because an untested backup is a
hypothesis. The free database instance also expires after 30 days
(2026-10-14) unless upgraded.

### First administrator

A fresh database has no way in: signup is blocked at the HTTP layer (§10), and
`POST /api/users` needs an admin session. So a deployment is seeded in two
steps — the `@opsflow/db` seed writes the roles and departments that
`users.role_id` requires, then `pnpm bootstrap:admin` reads `ADMIN_NAME`,
`ADMIN_EMAIL` and `ADMIN_PASSWORD` and provisions one administrator through
Better Auth, so the password hash and credential row are written the same way
every other account's are. It does nothing when an administrator already
exists, which makes it safe to leave in a release command. The development
user seed is not an alternative: its credentials are public and it refuses to
run under `NODE_ENV=production`.

### Mobile

The Android app is built locally, not on EAS: `expo prebuild` generates the
native project and Gradle builds it. `apps/mobile/android/` is gitignored
(Continuous Native Generation) — `app.json` and `app.config.js` are the
source, and `pnpm --filter @opsflow/mobile prebuild:android` regenerates the
tree with `--clean`. Anything that has to survive regeneration is a config
plugin, not a hand edit. iOS is declared (`ios.bundleIdentifier`) and not
built; there is no macOS in the loop.

`EXPO_PUBLIC_API_URL` is inlined at bundle time, so a release build is tied to
the API origin it was built against. The inlining happens inside Gradle's
`createBundleReleaseJsAndAssets` (Expo's `export:embed`), not at prebuild, and
`@expo/cli` reads `.env` from `apps/mobile`, not the repository root — so the
variable has to be in Gradle's environment. `build:android` refuses to start
without it; the root `.env` holds the development URL and is deliberately not
loaded by that script. A release is built against the API's own origin
(`https://opsflow-api-hxy9.onrender.com`): a native app has no cookie jar and
presents `opsflow://` as its origin, so the static site's rewrite (above) is
irrelevant to it.

Signing is `apps/mobile/plugins/withReleaseSigning.js`. It patches the
generated `app/build.gradle` with a `release` signing config read from four
global Gradle properties — `OPSFLOW_UPLOAD_STORE_FILE`,
`OPSFLOW_UPLOAD_STORE_PASSWORD`, `OPSFLOW_UPLOAD_KEY_ALIAS`,
`OPSFLOW_UPLOAD_KEY_PASSWORD` in `~/.gradle/gradle.properties` — and falls
back to the template's debug keystore when they are absent, so a fresh clone
still builds. The plugin throws if the template text it patches has changed,
because a silent no-op would ship a debug-signed release. The keystore lives
outside the repository; an installed build can only be updated by an APK
signed with the same key, so it is backed up, not regenerated.

Two dependencies exist only because of pnpm's isolated layout. `@babel/core`
and `@babel/plugin-transform-react-jsx` are direct dev dependencies of
`apps/mobile` because `babel-preset-expo` names the JSX transform as a
string, Babel resolves that name from the directory of `babel.config.js`,
and nothing else links it into `apps/mobile/node_modules`; the release
bundle failed on `expo-router/entry.js` before they were added, while Expo
Go's development transform never asked for it. The same shape as
`react-native-css-interop` (§43).

Versioning is `version` and `android.versionCode` in `app.json`; the
workspace `package.json` versions stay `0.0.0`. `expo-font` and
`expo-system-ui` are direct dependencies because a native build autolinks
only what the app declares — Expo Go bundled both, which is why the
`userInterfaceStyle` dark-mode switch and the vector icons worked there
without them.

---

# 37. Future SaaS Architecture

OPSflow can later support multi-tenant SaaS functionality.

Potential future architecture:

```text
Organization
     │
     ├── Users
     ├── Departments
     ├── Clients
     ├── Projects
     └── Tasks

```

This would allow multiple companies to use the same OPSflow platform while keeping their data logically isolated.

---

# 38. Billing

If OPSflow becomes a commercial SaaS product, **Polar** can be introduced as the billing and subscription layer.

Potential plans:

```text
Free
Pro
Business
Enterprise

```

Billing should remain isolated from core project-management logic.

Example:

```text
OPSflow
   │
   ├── Core Application
   │
   ├── Authentication
   │
   └── Billing
          │
          ▼
        Polar

```

Billing should be considered a future capability rather than an MVP requirement.

---

# 39. Recommended Repository Structure

The target architecture is:

```text
OPSflow/
│
├── apps/
│   │
│   ├── api/
│   │   ├── src/
│   │   │   ├── routes/          one file per entity, plus health and me
│   │   │   ├── middleware/      auth, permission, error
│   │   │   ├── services/
│   │   │   ├── validators/
│   │   │   ├── lib/             env, envelope, actor, dates, errors, roles
│   │   │   ├── app.ts           the Hono app, exported for the tests
│   │   │   └── index.ts         serves it
│   │   ├── test/                api.test.ts, rules.test.ts, helpers
│   │   ├── scripts/explain.ts   pnpm db:explain
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/      shadcn/ui under ui/, app components beside
│   │   │   ├── routes/          TanStack Router file routes
│   │   │   ├── lib/             api client, query helpers per entity, theme
│   │   │   ├── styles/
│   │   │   ├── main.tsx
│   │   │   └── routeTree.gen.ts
│   │   ├── test/                render.tsx, api-mock.ts, setup.ts
│   │   ├── public/
│   │   └── package.json
│   │
│   └── mobile/
│       ├── app/                 Expo Router screens
│       ├── src/
│       │   ├── components/
│       │   ├── forms/
│       │   └── lib/
│       ├── plugins/             withReleaseSigning.js
│       ├── scripts/             make-assets.mjs
│       ├── assets/              generated icons and splash
│       ├── app.json             the native config; android/ and ios/ are generated
│       ├── app.config.js
│       ├── tailwind.config.js
│       └── package.json
│
├── packages/
│   │
│   ├── auth/
│   │   ├── src/
│   │   └── scripts/             seed-users.ts, create-admin.ts
│   │
│   ├── config/                  tsconfig.base / bun / react / expo
│   │
│   ├── crypto/
│   │   ├── src/                 index.ts (the scheme), identity.ts (the key lifecycle), base64.ts
│   │   └── test/
│   │
│   ├── db/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   ├── seed.ts          roles and departments
│   │   │   └── bench.ts         pnpm db:bench
│   │   ├── prisma.config.ts
│   │   └── src/
│   │
│   ├── types/
│   │   ├── src/
│   │   └── test/
│   │
│   └── ui/
│       ├── src/                 palette.json, tones.ts, tokens.css
│       └── scripts/             generate-css.ts
│
├── docs/
│   ├── db_schema.dbml
│   ├── db_schema.md
│   ├── perf/                    measured query plans
│   ├── product_architecture.md
│   ├── sprint.md
│   └── technical_architecture.md
│
├── .github/workflows/ci.yml
├── docker-compose.yml           local PostgreSQL
├── docker-compose.prod.yml      the API image beside a database, for rehearsal
├── render.yaml
├── .dockerignore
├── .env.example
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── biome.json

```

There is deliberately no root `tsconfig.json`. The shared TypeScript
configurations live in `packages/config` (`tsconfig.base.json`,
`tsconfig.bun.json`, `tsconfig.react.json`, `tsconfig.expo.json`) and each
application extends the one that matches its runtime, so the root stays free
of a config that no single target could satisfy.

---

# 40. Architecture Principles

The following principles should guide development:

### Principle 1 — Single Source of Truth

Prisma owns the application database schema.

### Principle 2 — API Security

The backend is the security boundary.

### Principle 3 — Shared Contracts

Web, mobile, and API should share common types where appropriate.

### Principle 4 — Thin Routes

Hono routes should delegate business logic to services.

### Principle 5 — Reusable Components

Common UI and functionality should be extracted into packages.

### Principle 6 — Mobile Is a First-Class Client

Mobile should consume the same backend API rather than having separate business logic.

### Principle 7 — Progressive Complexity

Advanced technologies such as Polar, multi-tenancy, and extensive virtualization should be introduced when they solve actual problems rather than simply being added for the sake of the stack.

This principle is what removed TanStack Start from the stack: a Vite SPA talking
to a standalone Hono API already covers what it would provide, and adopting it
would have meant a second server for no capability OPSflow needs.

---

# 41. Technology Stack Summary


| Layer              | Technology            |
| ------------------ | --------------------- |
| Language           | TypeScript            |
| Runtime            | Bun                   |
| Package Manager    | pnpm                  |
| Monorepo           | Turborepo             |
| Web                | React                 |
| Web Build          | Vite                  |
| Routing            | TanStack Router       |
| Server State       | TanStack Query        |
| Forms              | TanStack Form         |
| Virtualization     | None; pages cap at 100 rows (§21) |
| Styling            | Tailwind CSS          |
| Web UI             | shadcn/ui             |
| Mobile             | React Native via Expo |
| Mobile Routing     | Expo Router           |
| Mobile Styling     | NativeWind            |
| Backend            | Hono                  |
| Validation         | Zod                   |
| ORM                | Prisma 7              |
| Database           | PostgreSQL 16         |
| Authentication     | Better Auth           |
| Formatting/Linting | Biome                 |
| Testing            | bun test; happy-dom + Testing Library on the web |
| CI                 | GitHub Actions        |
| Deployment         | Docker image and static site on Render; Android APK built locally |
| Type System        | TypeScript            |
| Billing            | Polar (post-MVP)      |
| API Clients        | Web + Mobile          |
| Architecture       | Monorepo              |


---

# 42. Architecture Decision Summary

OPSflow deliberately uses a modern TypeScript-first architecture because the system is primarily a CRUD and operational-management application.

The architecture prioritizes:

```text
Type Safety
     +
Developer Experience
     +
Reusable Components
     +
Strong UI/UX
     +
Web + Mobile
     +
Scalable CRUD

```

The core production path is:

```text
React / React Native
          ↓
   TanStack ecosystem
          ↓
        Hono
          ↓
    Better Auth
          ↓
       Services
          ↓
        Prisma
          ↓
      PostgreSQL

```

The monorepo provides the foundation for sharing:

```text
Types
Authentication
Database access
Configuration
Design tokens

```

This architecture allows OPSflow to demonstrate not only CRUD implementation, but also **authentication, authorization, responsive UI/UX, mobile development, database design, API architecture, reusable packages, performance considerations, and modern TypeScript engineering practices.**

---

# 43. Changes Since v2.0

Version 2.0 of this document was written before implementation began. The
following decisions were taken while building, from Phase 0 through the
deployment and the comment threads, and are reflected in the sections above. They are recorded here so the reasoning survives, rather
than only the outcome.


| Change | Reason |
| --- | --- |
| Added TanStack Query | Server-state caching was missing from the stack and is unavoidable for a REST CRUD client |
| Added Zod | Validation was specified but no library was named. Zod schemas are shared between the API and the clients from `packages/types` |
| Mobile is Expo + Expo Router + NativeWind, not bare React Native + Uniwind | Expo removes the native build toolchain from the critical path, and NativeWind is the established Tailwind-for-React-Native. `apps/mobile/app/` already followed Expo Router's convention |
| `packages/ui` holds design tokens, not components | React DOM components cannot render in React Native. shadcn/ui components live in `apps/web/src/components/ui` |
| Dropped TanStack Start | Redundant alongside a Vite SPA plus a standalone Hono API. See Principle 7 |
| No root `tsconfig.json` | The shared configurations live in `packages/config` and differ by runtime, so no single root config could serve every target |
| No `users.auth_id` column | Better Auth writes into our own database, so the external-provider indirection originally assumed by `db_schema.md` is unnecessary |
| Prisma 7 config file plus driver adapter | Prisma 7 removed `url` from the datasource block. Connection details now live in `prisma.config.ts`, and the runtime client uses `@prisma/adapter-pg` |
| `accounts.issuer` added; unique key moved from `(provider_id, account_id)` to `(issuer, account_id)` | Better Auth 1.7.2 requires `issuer` and keys accounts on it. Credential accounts get `local:credential` |
| `advanced.database.generateId: false` | Hands id generation to Prisma's `@default(uuid(7))`, keeping the auth tables on the same UUIDv7 scheme as everything else |
| `roleId` declared `required: false` to Better Auth | Better Auth validates the request payload before the create hook runs, so a required field rejects every signup before the hook can supply a role. `users.role_id` stays NOT NULL, which is the real guarantee |
| Users seeded from `packages/auth`, not `packages/db` | Password hashing needs Better Auth, and `packages/auth` already depends on `packages/db`; seeding users from `db` would make the dependency circular |
| Database diagram is Mermaid in `db_schema.md`, not a checked-in SVG | The SVG could only be regenerated through an external web tool, so it drifted. Markdown is edited alongside the schema |
| Dropped TanStack Virtual | Every list endpoint caps a page at 100 rows, so tables never hold enough rows to virtualise. See §21 |
| Route loaders read through the Query cache; pages use `useSuspenseQuery` | Navigation holds the current page until the next has data, and per-page loading and error branches collapse into three router-level components. See §19 |
| Default query `staleTime` of 30s plus `MutationCache` invalidation of activity, notifications and dashboard stats | Hover preload followed by mount must not cost two requests; the derived modules that every write feeds are invalidated centrally so the longer staleness cannot hide a write |
| Mobile styling is NativeWind 4 on Tailwind CSS 3, while the web stays on Tailwind 4 | NativeWind 5, the Tailwind 4 line, is still a preview. The two apps do not share a stylesheet, so the versions can differ; `apps/mobile` declares its own `tailwindcss@3` |
| `react-native-css-interop` is a direct dependency of `apps/mobile` | NativeWind's Babel plugin rewrites JSX to that package's runtime, which pnpm's isolated layout only exposes to NativeWind itself |
| Tailwind `darkMode: 'class'` in the mobile config | NativeWind on web throws at startup if anything sets the colour scheme while dark mode is the `media` strategy; Expo Router does |
| Dark tone values live in `palette.json`, emitted as a `.dark` block by the token generator | One source of truth for both schemes. The web recolours its tone variables under the class; mobile reads the same pair as `bg-tone-*-dark` behind a `dark:` variant, since NativeWind cannot override a variable through a cascade |
| The theme preference (light / dark / system) is stored per client — `localStorage` on the web, SecureStore on the phone — under one key, `opsflow.theme` | Each client already has exactly one storage; the shared key and union mean the same three words on both. `system` stores nothing, so a user who never touches the control follows their device. On the web build of the mobile app, `system` is resolved by the app itself from `prefers-color-scheme`, because NativeWind's class strategy on web does not consult the OS |
| Better Auth Expo plugin; the app is trusted by its URL scheme | A native app has no HTTP origin. The plugin keeps the session cookie in SecureStore and presents `opsflow://` as the origin; the API lists it as trusted. Expo Go's `exp://` and the web dev server are trusted outside production only |
| Mobile attaches the session cookie by hand with `credentials: 'omit'` | There is no cookie jar on a device. `authClient.getCookie()` returns what SecureStore holds; on the web build the browser's jar is used, as in `apps/web` |
| `/api/me` resolves to `null` on 401 in the mobile client | The root layout switches between the login and app stacks on that value, so signed-out is a state rather than an error. Any other query's 401 sets it to null, which drops an expired session to login from any screen |
| `advanced.disableOriginCheck: false` pinned in Better Auth | Better Auth turns the check off whenever `NODE_ENV` is `test`, which Bun's test runner sets. Pinning it keeps the tests on the production rule and prevents a stray environment from disabling it |
| `apps/api/src/app.ts` exports the Hono app; `index.ts` serves it | The API tests call `app.request()` in-process on the seeded database, with no port and no mocking of the middleware chain |
| TypeScript 7 in `apps/mobile` although Expo expects 6 | One compiler version across the workspace; the mobile typecheck passes on 7 |
| Removing a member or replacing the manager refuses while they hold open tasks | The assignee rule (manager or member only) is otherwise only checked when a task is written. Blocking with `ASSIGNEE_HAS_OPEN_TASKS` keeps it true at all times, matching how an occupied department refuses deletion |
| Completed and cancelled projects refuse new tasks | `PROJECT_CLOSED`. Existing tasks on them stay editable so history can be tidied |
| Project and task status transitions are enforced against a table in `@opsflow/types` | Product §14 and §21 define state machines; the API accepted any move. `TASK_TRANSITIONS` and `PROJECT_TRANSITIONS` sit beside the status arrays, are enforced in the two services (`INVALID_TASK_TRANSITION`, `INVALID_PROJECT_TRANSITION`) and are mirrored by the web and mobile status controls, which offer only reachable moves. `cancelled` is terminal; `completed` reopens |
| A status PATCH that does not change the status is a 409 | `TASK_STATUS_UNCHANGED` / `PROJECT_STATUS_UNCHANGED`. It otherwise wrote an activity row saying nothing changed, and reset `completedAt` on an already-completed task |
| Completing a project sets `progress` to 100 | A completed project reading 60% is a contradiction the dashboard averages into its figures. Its tasks are left alone: auto-completing them would invent completion times for work nobody finished |
| Web forms map a local ZodError like a 422 envelope | Forms validate with the shared schema before sending. Without this the failure reached the user as a generic banner with no field highlighted |
| `@opsflow/ui` ships a JSON palette, a status → tone table and a generated `tokens.css` | The web badge collapsed every status into three shadcn variants while the mobile badge coloured each one; the two clients disagreed on what `completed` or `cancelled` looks like. One tone table, read by both, settles it. JSON rather than TypeScript because the mobile Tailwind 3 config and the icon script `require()` it; the CSS is generated so the web's Tailwind 4 build reads the same values |
| Mobile directory lists page with `useInfiniteQuery`; every paged list query ends its `orderBy` in `id` | Each mobile list fetched one page at the 100-row ceiling while its header showed the server's total, so anything past the first 100 rows silently did not exist on a phone. Concatenating offset pages needs a total order on the server and dedupe by id on the client; neither alone is enough. See §21.1 |
| Component tests use Testing Library on happy-dom, with the network mocked at `fetch` and no user-event or jest-dom | Nothing under test needs pointer capture, so `fireEvent` and `findBy*` suffice; jest-dom's matchers are typed for other runners. Mocking at `fetch` runs the real envelope path the forms depend on, and `mock.module` is process-global under Bun. See §30 |
| Mobile screens are not rendered in tests; their logic is extracted into modules react-native never reaches | Bun cannot parse react-native's Flow-typed entry, and every screen imports it. `errors.ts` and `api-url.ts` hold what `api.ts`, `message.tsx` and `env.ts` carried, re-exported so no caller changed. A rendered test would need jest-expo, a second runner — deferred until a screen has logic that cannot be pulled out |
| Unit tests run on `bun test` in every package, with happy-dom for the web | One runner and one assertion API across the repo. happy-dom is what the theme module needs — `matchMedia`, `localStorage`, `documentElement` — and nothing more; a second runner would have been a dependency added for the stack rather than for a problem. See §30 |
| The mobile paging helpers live in `paging.ts`, apart from the TanStack wiring in `paged.ts` | The helpers are pure; the wiring imports react-native through the API client, which Bun cannot load. The split makes the helpers testable and the boundary explicit, and `paged.ts` re-exports them so the screens did not change |
| Query plans are measured on a bench volume, and the measurement is a script | Reading a plan against the seven-row development database says nothing: the planner prefers a sequential scan at that size whatever the indexes. `pnpm db:bench` and `pnpm db:explain` make the evidence reproducible after any query change, and the first run found no index worth adding. See §21.2 |
| The mobile inbox is marked stale after a write and refetched on focus, instead of refetched after every write | It is an infinite list, and refetching one re-requests every loaded page in sequence. Marking one read patches the cached row. `maxPages` was rejected because it drops the oldest pages, removing rows the reader has already scrolled past. See §26.1 |
| Edit forms PATCH only the fields that changed, via `changedFields` in `@opsflow/types/changes` | The update services run their guards per key that arrives. Resending the whole record made an admin's own phone edit a 403 (`role` present), a title fix on a task in a closed project a 409, and wrote `role_changed` on every user edit. See §20 |
| One `SearchField` component for the web lists, which adopts the URL only when the URL moved on its own | The URL trails the field by one loader round trip; resetting the draft on every URL change dropped keystrokes typed during that trip |
| Suspending, deactivating or demoting a person is refused with `USER_HAS_OPEN_WORK` while they manage an open project or hold an open task; leaving `active` deletes their sessions | The manager and assignee rules were enforced on every path except the one that takes a person out of service. Same shape as `ASSIGNEE_HAS_OPEN_TASKS` |
| Better Auth refuses to create a session for a non-active user | Sign-in checked the password only, so a suspended person could mint a session and reach Better Auth's endpoints in front of `requireAuth`. Better Auth's own guidance names `databaseHooks.session.create.before` for this. See §10 |
| `POST /api/auth/update-user` is closed | It let a caller rewrite `name` and `image` past `updateProfileSchema` and the activity log. `PATCH /api/me` is the profile edit |
| `/api/me` resolving to `null` on 403 as well as 401 in the mobile client, after signing out | A 403 is a live session on a suspended account; kept, the stored cookie answered every retry the same way and left the phone on an error screen with no way out |
| `progress` is `z.number()`, not coerced | A cleared input arrived as `''` or `null` and became 0% |
| A 401 from any web query or mutation ends the session; the guard redirects only on 401 and 403 | A session that ended underneath the app was noticed only by route loaders; polling, the unread badge and saves failed quietly. A 500 on the profile is retryable, not a bounce to login. See §33 |
| The login page returns to the page the guard turned away, through `safeRedirect` | Deep-link restoration was left out until it could be done without an open redirect; only a path within the app is honoured |
| `clearSession` on every path that ends a mobile session | Only the sign-out button cleared the cache; an expired session or a 403 left the previous person's lists for the next sign-in to show |
| `PASSWORD_MIN_LENGTH` is 8 | Six was a demo concession recorded as pre-production work |
| `bodyLimit` of 64 KiB on `/api/*`; the health probe times out at two seconds | Bodies were read whole before validation; a hung database hung the probe, which a platform reads as "still starting" |
| Account creation wraps only Better Auth's `APIError` into a 400 and removes the account if the profile write fails | Any error became a 400 carrying its raw message; a failed second step left an employee-role account answering the retry with "email taken" |
| Cookie attributes written out: `SameSite=Lax`, `Secure` in production | The deployment is one registrable domain; the setting was Better Auth's default and the decision it rests on was nowhere |
| Better Auth's rate limiter counts in the `rate_limits` table | The memory store is per instance; the table shares the count through the Prisma adapter already in use. Production only, as before |
| `pnpm audit --prod` in CI, advisory | The findings are in tooling-only paths; gating on a tool's transitive tree would block unrelated work, while running it keeps drift visible |
| The API binds `PORT ?? API_PORT` | Railway and Render assign the port and inject it as `PORT`. Binding `API_PORT` in a deployment means the health check never answers |
| `pnpm bootstrap:admin` provisions the first administrator from the environment | A fresh production database had no way in: signup is closed at the HTTP layer, `POST /api/users` needs an admin session, and the development seed refuses to run in production. It is a no-op once an administrator exists, so a release command can keep calling it. See §36 |
| The API image is Debian slim carrying both Node and Bun, and runs the server from TypeScript source | Bun runs the server; Node runs the Prisma CLI, whose schema engine needs glibc. Render runs the pre-deploy migration and the server in one image, so a bundle-only image could not migrate. Prisma 7 emits plain TypeScript, so there is nothing to bundle anyway. See §36 |
| The Android app is built locally with Continuous Native Generation; `android/` is not committed and CI does not build it | `expo prebuild` regenerates the native project from `app.json`, so a checked-in tree would only drift. EAS was not needed: the SDK, NDK and JDK are on the build machine. See §36 |
| Release signing is a config plugin reading global Gradle properties, with a debug-keystore fallback | Hand edits to a generated `build.gradle` do not survive `prebuild --clean`; the properties keep the keystore out of the repository, and the fallback keeps `build:android` runnable from a fresh clone. See §36 |
| Application id `org.thegreengen.opsflow`; `app.json` `version` and `versionCode` are the mobile release numbers | The id is permanent once installed on a device, so it is the reverse of the owner's domain. The workspace `package.json` versions stay `0.0.0` |
| One origin is a deployment requirement; on Render it is a `/api/*` rewrite on the static site | `onrender.com` is on the Public Suffix List, so Render's own subdomains are cross-site to each other and a `SameSite=Lax` session cookie is never sent between them. Sign-in would appear to work and nothing after it would. The rewrite makes the API answer on the web app's origin; verified on the live site 2026-09-15. A custom domain on both services is the alternative. See §36 |
| A comment has exactly one parent — nullable `task_id` and `project_id` with a hand-written CHECK constraint in the migration | One table serves both threads and one service reads them; Prisma cannot express the constraint, so the migration carries it and the schema comment points at it |
| Comments are logged against the parent (`commented`, `comment_deleted`), not as a `comment` entity | The parent's activity feed should tell the whole story; a comment has no page of its own to link to |
| A comment's author is `SET NULL` on user deletion; the thread cascades with its parent | A thread keeps its shape when a person leaves ("Former user"), and has no meaning without the task or project it was under |
| Deleting a comment is for its author or any admin or manager, as `canDeleteComment` in `@opsflow/types/comment`, with no new permission string | Both rules are row-level, which the matrix comment says belongs in the service; sharing the predicate lets the web card hide the control on the same rule the API enforces |
| Completed tasks and closed projects still accept comments | A thread is where the closing discussion happens; refusing it would push that conversation elsewhere |
| Threads list oldest first and the web card asks for the maximum page | Appending keeps offset pages stable while people post; a pager appears only when a thread outgrows 100 |
| Comment threads are web only for now, and not polled | The API is client-agnostic and the predicate is shared, so the mobile card is a follow-up; live updates are a Server-Sent Events step, not a polling interval |
| Direct messages are end-to-end encrypted with per-person X25519 keys and a password-wrapped backup, in `packages/crypto` on the audited noble libraries | The server must not be able to read a private conversation, and a person must be able to read theirs from a second device. A key per device would need a fan-out per message; a key per person needs a backup, and the login password is the one secret already in hand at sign-in. The noble libraries run identically in the browser, under Bun and on Hermes, so one package serves both clients and the API tests. See §26.2 |
| An administrator and an employee cannot direct-message each other; the rule is `canDirectMessage` in `@opsflow/types/dm`, with no permission string | The requirement was that nobody but a manager reaches an administrator. A conversation is two-way, so an administrator opening one to an employee would be the employee reaching the administrator; the rule is applied to the pair, which is row-level like every other rule of its kind |
| `GET /api/dm/contacts` is authenticated but not gated by `users:read` | An employee has no directory, but has to find a colleague to write to. The endpoint answers only with the people the caller may message, and only their names, roles and public keys |
| The thread is paged on the UUIDv7 id with `?before=`, not on an offset | A thread being written to shifts under an offset page; the id is time-ordered and stable. The rest of the API stays offset-paged, where the tables are administrative and show a total |
| Unread counters are stored on the conversation row, one per party | The badge is then one aggregate over the caller's rows; computing it would compare a message time against a per-party read time, which Prisma cannot express without raw SQL |
| Messages are not logged to the activity trail | There is no content the server could describe, and who talks to whom in private is not an organisational event. Only the `New message` notification is raised, and it names the sender and nothing else |
