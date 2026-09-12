# OPSflow — Technical Architecture

**Version:** 2.6  
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
since a pushed screen has no loader to redirect from. And mobile lists ask
for one page at the API's ceiling rather than paging, so the people
directory and the activity feed are unsearchable single pages — the
filtered, paged tables stay on the web.

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
├── /auth
│
├── /users
│
├── /departments
│
├── /clients
│
├── /projects
│
├── /tasks
│
├── /notifications
│
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
DELETE /api/projects/:id

```

Routes should remain relatively thin.

They should delegate business operations to services.

---

# 9. Service Layer

Business logic should be isolated from HTTP routes.

Example:

```text
projects/
├── project.routes.ts
├── project.service.ts
└── project.validation.ts

```

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

### Admin

```text
Users       → CRUD
Departments → CRUD
Clients     → CRUD
Projects    → CRUD
Tasks       → CRUD
Dashboard   → Read
Reports     → Read
System      → Manage

```

### Manager

```text
Clients  → CRUD
Projects → CRUD
Tasks    → CRUD
Users    → Read
Dashboard → Read
Reports  → Read

```

### Employee

```text
Projects → Assigned projects
Tasks    → Assigned tasks
Dashboard → Own scope
Profile  → Own profile

```

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

```

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
       ├── Activity Logs
       │
       └── Notifications

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
 └── Tasks

```

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

Examples:

```text
User
Role
Project
Task
Client
Notification
ProjectStatus
TaskStatus
PriorityLevel

```

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
  tints, placeholder text) read `@opsflow/ui/colors`. `app.config.js` overrides the two colours in
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
├── dashboard
├── projects
│   ├── /
│   ├── /new
│   └── /:projectId
├── tasks
├── clients
├── users
├── departments
├── notifications
└── settings

```

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

```

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
Task assigned
Task deadline approaching
Project status changed
User added to project
Task completed
System announcement

```

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
 ┌────┼────┐
 ▼    ▼    ▼
Web  API  Mobile

```

Shared packages should be built or type-checked according to dependency relationships.

---

# 32. Environment Configuration

Environment variables should never be committed to source control.

Example:

```text
.env
.env.local
.env.example

```

The variables the system actually reads:


| Variable             | Consumer     | Purpose                                          |
| -------------------- | ------------ | ------------------------------------------------ |
| `DATABASE_URL`       | API, Prisma  | PostgreSQL connection string                     |
| `BETTER_AUTH_SECRET` | Auth         | Session signing key, at least 32 bytes           |
| `BETTER_AUTH_URL`    | Auth         | Origin Better Auth issues and validates URLs for |
| `API_PORT`           | API          | Port the Hono server binds to                    |
| `WEB_URL`            | API, Auth    | CORS allow-list and Better Auth trusted origin   |
| `VITE_API_URL`       | Web (public) | API origin the browser calls                     |


`WEB_URL` has no default. It is both the CORS allow-list and Better Auth's
trusted origin, so guessing it wrong fails in confusing, security-shaped ways.

Anything behind a `VITE_` prefix is inlined into the browser bundle at build
time and is therefore public. Secrets must never use that prefix.

An `.env.example` file documents every required variable without exposing
secrets.

---

# 33. Security Architecture

Security considerations include:

### Authentication

Handled through Better Auth.

### Authorization

Handled through server-side role and permission checks.

### Database

Prisma should use parameterized queries and prevent raw unsafe SQL where possible.

### Secrets

Secrets must be stored in environment variables or deployment secret managers.

### API

The API should implement:

- Input validation
- Authentication checks
- Authorization checks
- Rate limiting where necessary
- Safe error responses

### Client

The frontend must never contain:

- Database credentials
- Private API keys
- Authentication secrets
- Server-only environment variables

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

The web, API, and database should be independently deployable.

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
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   ├── services/
│   │   │   ├── validators/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── routes/
│   │   │   ├── features/
│   │   │   ├── hooks/
│   │   │   └── lib/
│   │   ├── public/
│   │   └── package.json
│   │
│   └── mobile/
│       ├── app/
│       ├── src/
│       │   ├── components/
│       │   ├── features/
│       │   ├── hooks/
│       │   └── lib/
│       └── package.json
│
├── packages/
│   │
│   ├── auth/
│   │   └── src/
│   │
│   ├── config/
│   │
│   ├── db/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── prisma.config.ts
│   │   └── src/
│   │
│   ├── types/
│   │   └── src/
│   │
│   └── ui/
│       └── src/
│
├── docs/
│   ├── db_schema.dbml
│   ├── db_schema.md
│   ├── product_architecture.md
│   ├── sprint.md
│   └── technical_architecture.md
│
├── docker-compose.yml
├── .env.example
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── biome.json

```

There is deliberately no root `tsconfig.json`. The shared TypeScript
configurations live in `packages/config` (`tsconfig.base.json`,
`tsconfig.bun.json`, `tsconfig.react.json`) and each application extends the one
that matches its runtime, so the root stays free of a config that no single
target could satisfy.

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
following decisions were taken while building Phases 0 to 3 and are reflected in
the sections above. They are recorded here so the reasoning survives, rather
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

