# OPSflow — Sprint Plan

**Version:** 2.0  
**Status:** Active  
**Project:** OPSflow  
**Architecture:** TypeScript Monorepo  
**Primary Runtime:** Bun  
**Package Manager:** pnpm  
**Monorepo:** Turborepo

---

# 1. Purpose

This document is the **source of truth for OPSflow development progress**.

All implementation work should be organized into the phases below.

The project should be completed incrementally rather than attempting to build the entire system simultaneously.

The development order prioritizes:

1. Architecture
2. Development environment
3. Database
4. Authentication
5. API
6. Web application
7. CRUD modules
8. Dashboard
9. Mobile application
10. Performance and polish
11. Testing
12. Deployment
13. Demo preparation

---

# 2. Definition of Done

A task is considered **Done** only when:

- Implementation is complete
- TypeScript errors are resolved
- Biome checks pass
- Relevant functionality has been manually tested
- API/database changes are documented where necessary
- No known blocking errors remain
- The task's acceptance criteria are satisfied

---

# 3. Status Legend

```text
[ ] Not started
[-] In progress
[x] Completed
[!] Blocked

```

---

# Phase 0 — Project Foundation

**Goal:** Establish the monorepo and development tooling.

### Repository

- Create OPSflow repository
- Create `apps/` directory
- Create `packages/` directory
- Create `docs/` directory
- Create `apps/web`
- Create `apps/api`
- Create `apps/mobile`
- Create `packages/auth`
- Create `packages/config`
- Create `packages/db`
- Create `packages/types`
- Create `packages/ui`

### Monorepo

- Configure pnpm workspaces
- Configure Turborepo
- Configure root TypeScript configuration
- Configure package dependencies
- Verify workspace dependency resolution

### Runtime

- Configure Bun
- Verify Bun runtime
- Decide whether Bun is used for all development/runtime tasks or selectively

### Code Quality

- Configure Biome
- Configure formatting
- Configure linting
- Add type-checking command
- Add root development scripts

### Acceptance Criteria

- `pnpm install` works
- `pnpm dev` can start applications
- Turborepo recognizes all workspaces
- Biome runs successfully
- TypeScript checks successfully

---

# Phase 1 — Database Architecture

**Goal:** Establish PostgreSQL and Prisma as the database foundation.

### Prisma

- Configure Prisma in `packages/db`
- Create `schema.prisma`
- Configure PostgreSQL datasource
- Configure Prisma client
- Create database package entry point

### Database Models

Implement:

- Role
- Department
- User
- Client
- Project
- ProjectMember
- Task
- ActivityLog
- Notification

### Relationships

- User → Role
- User → Department
- Project → Client
- Project → Manager
- Project → ProjectMembers
- ProjectMember → User
- Task → Project
- Task → User
- ActivityLog → User
- Notification → User

### Constraints

- Unique email
- Unique role names
- Unique department names
- Project member uniqueness
- Valid status values
- Valid priority values
- Referential integrity

### Migrations

- Generate initial migration
- Apply migration
- Verify database structure
- Test rollback/development reset workflow

### Documentation

- Create `db_schema.md`
- Create `db_schema.dbml`
- Embed a Mermaid ERD in `db_schema.md`
- Update documentation to reflect final Prisma schema

### Cleanup

- Remove duplicate `database/schema.sql`
- Ensure Prisma is the single source of truth

### Acceptance Criteria

- Prisma schema successfully migrates to PostgreSQL
- Prisma Client can connect to the database
- All core entities exist
- Relationships work correctly
- Database documentation matches the Prisma schema

---

# Phase 2 — Shared Packages

**Goal:** Establish reusable packages before application-level implementation.

## Types

Location:

```text
packages/types/

```

- Define User types
- Define Role types
- Define Department types
- Define Client types
- Define Project types
- Define Task types
- Define Notification types
- Define ActivityLog types
- Define enums/status types

## Database Package

Location:

```text
packages/db/

```

- Export Prisma Client
- Configure development-safe client initialization
- Define database utilities

## Configuration

Location:

```text
packages/config/

```

- Shared TypeScript configuration
- Environment variable conventions
- Shared application configuration

## UI

Location:

```text
packages/ui/

```

`packages/ui` holds design tokens, not components. React DOM components cannot
render in React Native, so a shared component could only ever serve one client.

- Colour palette and status colours
- Spacing scale
- Typography scale
- Radii
- Iconography conventions

Components are built per platform against these tokens:

```text
apps/web/src/components/ui     shadcn/ui + Tailwind
apps/mobile/src/components     React Native + NativeWind

```

Web components — Button, Input, Card, Badge, Dialog, Table, Dropdown, Toast —
are added through the shadcn CLI as the modules that need them are built,
rather than up front.

### Acceptance Criteria

- Packages can be imported by applications
- No circular dependencies
- Shared types compile successfully
- Web and mobile render the same tokens through their own component layers

---

# Phase 3 — Authentication

**Goal:** Implement secure authentication using Better Auth.

### Better Auth

- Install Better Auth
- Configure authentication server
- Configure database integration
- Configure sessions
- Configure user identity
- Configure authentication client

### Web

- Login page
- Logout functionality
- Session persistence
- Authentication state
- Protected routes

### API

- Authentication middleware
- Session validation
- Current-user utility
- Unauthorized response handling

### Mobile

- Authentication client
- Login screen
- Session persistence
- Logout

### Acceptance Criteria

- User can log in
- User can log out
- Session persists correctly
- Unauthenticated users cannot access protected API routes
- Unauthenticated users cannot access protected web routes
- Mobile authentication works

---

# Phase 4 — Authorization / RBAC

**Goal:** Enforce role-based permissions.

### Roles

- Admin
- Manager
- Employee

### Permissions

- Define permission matrix
- Create authorization utilities
- Add API authorization middleware
- Add route-level authorization
- Add UI permission checks

### Testing

- Admin permissions tested
- Manager permissions tested
- Employee permissions tested
- Unauthorized API requests rejected
- Unauthorized UI actions hidden/disabled

### Acceptance Criteria

A user must never be able to perform an operation solely because the frontend exposes the UI control.

All sensitive authorization decisions must occur server-side.

---

# Phase 5 — Hono API Foundation

**Goal:** Build the backend API architecture.

### Hono

- Configure Hono application
- Configure API prefix
- Configure middleware
- Configure error handling
- Configure request logging
- Configure CORS
- Configure validation

### API Structure

```text
apps/api/src/

routes/
middleware/
services/
validators/
lib/
index.ts

```

### Core Endpoints

- `/health`
- `/auth`
- `/users`
- `/departments`
- `/clients`
- `/projects`
- `/tasks`
- `/notifications`
- `/activity`

### API Standards

- Consistent response format
- Consistent error format
- HTTP status conventions
- Input validation
- Authentication middleware
- Authorization middleware

### Acceptance Criteria

- API starts successfully
- `/health` returns successful response
- API connects to Prisma
- API can authenticate users
- API handles errors consistently

---

# Phase 6 — User & Department CRUD

**Goal:** Build the first complete CRUD workflow.

## Users

- List users
- Search users
- Filter users
- View user
- Create user
- Edit user
- Suspend/deactivate user

## Departments

- List departments
- Create department
- Edit department
- Delete/archive department
- View department members

## Web UI

- User table
- User detail page
- User form
- Department table
- Department form
- Loading states
- Empty states
- Error states
- Confirmation dialogs

### Acceptance Criteria

Admin can manage users and departments through the web interface.

---

# Phase 7 — Client Management

**Goal:** Implement complete client management.

### API

- Create client
- List clients
- View client
- Update client
- Archive client
- Search clients
- Filter clients

### Web

- Client list
- Client detail
- Client creation form
- Client editing form
- Client archive confirmation
- Client search
- Client filtering

### Acceptance Criteria

A manager/admin can manage the complete client lifecycle.

---

# Phase 8 — Project Management

**Goal:** Implement the primary operational workflow.

### API

- Create project
- List projects
- View project
- Update project
- Delete/archive project
- Assign manager
- Add members
- Remove members
- Update status
- Update priority
- Track progress

### Web

- Project dashboard
- Project table
- Project detail page
- Project creation form
- Project editing form
- Project member management
- Status controls
- Priority controls
- Progress indicator

### UX

- Search
- Filtering
- Sorting
- Pagination/virtualization
- Loading states
- Empty states
- Error states

### Acceptance Criteria

A manager can create a project, assign employees, track progress, and manage its lifecycle.

---

# Phase 9 — Task Management

**Goal:** Implement task-based operational workflows.

### API

- Create task
- List tasks
- View task
- Update task
- Delete task
- Assign task
- Update status
- Update priority
- Set due date
- Mark completed

### Task States

```text
Pending
In Progress
Blocked
Completed

```

### Web

- Task table
- Task creation
- Task editing
- Task assignment
- Task filtering
- Task status controls
- Task priority indicators
- Due date indicators

### Employee Experience

- View assigned tasks
- Update task status
- Mark task complete

### Acceptance Criteria

Managers can assign tasks and employees can manage their assigned work.

---

# Phase 10 — Activity & Notifications

**Goal:** Introduce system awareness and auditability.

## Activity Logs

- Create activity log service
- Log important CRUD actions
- Log user actions
- Log project changes
- Log task changes
- Activity feed API
- Activity feed UI

## Notifications

- Notification creation
- Notification list
- Mark as read
- Mark all as read
- Notification count
- Notification UI

### Acceptance Criteria

Important system events appear in activity logs and relevant users receive notifications.

---

# Phase 11 — Dashboard

**Goal:** Create the primary executive/manager experience.

### Dashboard Metrics

- Total projects
- Active projects
- Completed projects
- Delayed projects
- Total tasks
- Pending tasks
- Completed tasks
- Overdue tasks
- Total employees
- Active clients

### Dashboard Components

- KPI cards
- Project progress
- Task summary
- Recent activity
- Upcoming deadlines
- Notifications
- Quick actions

### Role-Based Dashboard

Admin:

```text
Organization overview
Users
Departments
Projects
Clients
System activity

```

Manager:

```text
Projects
Tasks
Team
Clients
Deadlines

```

Employee:

```text
Assigned tasks
Assigned projects
Upcoming deadlines
Personal activity

```

### Acceptance Criteria

A user immediately understands the operational state of the organization after logging in.

---

# Phase 12 — TanStack Optimization

**Goal:** Fully integrate the TanStack ecosystem where useful.

### TanStack Router

- Configure route structure
- Protected routes
- Route parameters
- Route loaders where appropriate

### TanStack Form

- User forms
- Client forms
- Project forms
- Task forms
- Validation
- Submission states

### TanStack Virtual

Evaluated and dropped. Every list endpoint is offset-paginated with a hard
ceiling of 100 rows per page (`MAX_PAGE_SIZE` in `@opsflow/types/api`), so no
table ever holds more rows than a browser renders comfortably. The page cap is
what keeps the DOM small; a virtualiser on top of it would be the "added
unnecessarily" case the acceptance criterion warns against. Revisit only if a
screen ever needs an unpaginated list.

### TanStack Query

- Query key conventions per module
- Cache invalidation on mutation
- Loading and error states driven by query state
- Prefetching in route loaders where it removes a spinner

### TanStack Start

Evaluated and dropped. A Vite SPA plus a standalone Hono API already covers
what it would provide, so adopting it would add a second server for no
capability OPSflow needs. See Principle 7 and §43 of the technical
architecture.

### Acceptance Criteria

TanStack technologies solve real application problems rather than being added unnecessarily.

---

# Phase 13 — React Native Mobile Application

**Goal:** Deliver a useful mobile version of OPSflow.

### Foundation

- Scaffold the Expo application
- Configure Expo Router
- Configure NativeWind
- Configure API client
- Configure authentication
- Configure navigation

### Screens

- Login
- Dashboard
- Projects
- Project detail
- Tasks
- Task detail
- Notifications
- Profile

### Mobile Actions

- View assigned tasks
- Update task status
- View project information
- View notifications
- Update profile

### UX

- Responsive layouts
- Touch-friendly controls
- Loading states
- Empty states
- Error states
- Offline-friendly considerations

### Acceptance Criteria

An employee can authenticate and complete basic operational workflows from the mobile application.

---

# Phase 13b — Mobile Management

**Goal:** Let administrators and managers run the work from the phone, not only
watch it.

Phase 13 delivered the employee's mobile app: see what is assigned, move it
along. Phase 13b extends the same app to the roles that create and administer
the work, reusing the API and the permission matrix as they stand — nothing
is added server-side.

### Tasks (`tasks:write`)

- Create a task, optionally preselecting the project when arriving from it
- Edit title, description, project, assignee and due date
- Change priority from the task screen
- Delete a task after an inline confirmation
- See every task, not only assigned ones, with a Mine / All switch

### Projects (`projects:write`)

- Create a project with client, manager, priority and dates
- Edit a project, including progress
- Change status and priority from the project screen
- Add and remove team members
- Add a task to the project from its screen

### Clients (`clients:read` / `clients:write`)

- Client directory with a status filter
- Client detail
- Create and edit a client
- Deactivate, archive and reactivate with an inline confirmation

### Departments (`departments:read` / `departments:write`)

- Department list
- Add, rename and delete inline; deletion is refused while members remain

### Entry points and gating

- Clients and departments have no tab: the dashboard counts and a directory
  card on the profile tab open them, only for roles that may read them
- Every control is hidden with `can()` from `@opsflow/types/permissions`,
  the same courtesy check the web performs; the API enforces the matrix

### UX

- One-choice pickers open a bottom sheet, identical on iOS, Android and web
- Forms validate with the shared Zod schemas before the request and map a
  422 back onto the same fields
- Confirmations are inline, next to the record, never a native alert

### Acceptance Criteria

A manager can create, staff, edit and progress a project and its tasks, and
maintain the client directory, from the mobile application. An administrator
can additionally maintain departments. An employee sees no management
control.

---

# Phase 13c — Mobile People & Activity

**Goal:** Close the two gaps between the mobile application and the product
document: administer people from the phone, and show the activity trail.

Phase 13b ruled that "users remain web-only". That is reversed here. The
call was defensible — user administration is where roles and credentials are
granted — but §33 of the product document rates Users as *Limited* on
mobile, not absent, and the mobile dashboard was rendering a Users count
with nothing behind it. Activity was never a decision at all: §33 rates it
*View*, the technical document lists "basic activity information" among the
first mobile priorities, and it was simply missed by both mobile phases.

Nothing is added server-side. Every endpoint, schema and guard this needs
was finished in Phase 6 and Phase 10.

### Activity (`activity:read`, all three roles)

- A feed screen, newest first, filtered by entity type with a scrolling
  chip row
- One card per event — actor, action, description, timestamp, entity —
  because the web's five-column table does not fit a phone
- A row opens the record it refers to, subject to the same permission
  checks the web's `EntityLink` makes: an employee holds `activity:read`
  without `users:read` or `clients:read`, so those rows are plain text for
  them. A deleted entity has no id to open, and departments have no mobile
  detail screen, so neither is tappable

### People (`users:read` to see, `users:write` to change)

- Directory with role and status chip rows; managers reach it read-only,
  administrators get the Add button
- Person detail — status, role, department, position, phone, joined
- Create and edit in one form; the initial password is create-only, since
  there is no invite email
- Activate, deactivate and suspend behind an inline confirmation, absent on
  your own record

### Entry points and gating

- The profile tab's Directory card becomes four rows, each gated on its read
  permission; the hand-written separators became a filtered list
- The dashboard's Users, Employees and Team counts open the directory, where
  before they were plain cards with nowhere to go
- Self-demotion, self-suspension, the last active administrator and a
  duplicate email are all refused by the API; the phone shows each refusal
  where the action was taken, and asserts none of them itself

### Acceptance Criteria

An administrator can add a person, change their role and department, and
suspend them, from the phone. A manager sees the directory and no control
that writes to it. An employee cannot reach it, sees only their own actions
in the feed, and is offered no link to a record they may not open.

---

# Phase 14 — UI/UX Polish

**Goal:** Make OPSflow visually impressive and demonstrate the project's strongest differentiator.

### Design System

- Typography
- Spacing system
- Color system
- Status colors
- Component consistency
- Iconography

### UX

- Responsive layouts
- Skeleton loading
- Empty states
- Error states
- Toast feedback
- Confirmation dialogs
- Keyboard navigation
- Accessibility review

### Dashboard

- Improve information hierarchy
- Improve data visualization
- Improve navigation
- Add meaningful micro-interactions

### Acceptance Criteria

The application should look and feel like a polished production SaaS product rather than a CRUD demo.

---

# Phase 15 — Performance

**Goal:** Ensure the application remains responsive as data grows.

### Frontend

- Analyze bundle size
- Lazy-load appropriate routes
- Optimize expensive components
- Implement virtualization where necessary
- Optimize images

### API

- Review database queries
- Add appropriate indexes
- Avoid N+1 queries
- Implement pagination
- Optimize dashboard queries

### Database

- Review indexes
- Review relationships
- Review query performance

### Acceptance Criteria

Application performance remains acceptable with realistic data volumes.

---

# Phase 16 — Testing

**Goal:** Establish confidence in the system.

## Unit Tests

- Utility functions
- Business logic
- Validation
- Authorization

## API Tests

- Authentication
- Users
- Departments
- Clients
- Projects
- Tasks
- Notifications

## Integration Tests

- Database operations
- Authentication flow
- CRUD workflows
- Authorization

## Frontend Tests

- Forms
- Components
- Protected routes
- Critical user flows

## Mobile Tests

- Authentication
- Task workflow
- Navigation

### Acceptance Criteria

Critical workflows have automated tests and no known regressions.

---

# Phase 17 — Security Review

**Goal:** Perform a security pass before deployment.

- Review authentication
- Review authorization
- Review API validation
- Review environment variables
- Review CORS
- Review database permissions
- Review sensitive logging
- Review dependency vulnerabilities
- Review exposed endpoints
- Review session handling

### Acceptance Criteria

No known critical security issues remain.

---

# Phase 18 — Deployment

**Goal:** Deploy a production-ready version.

### Web

- Production build
- Environment variables
- Deployment
- Custom domain if applicable

### API

- Production build
- Environment variables
- Database connection
- Deployment
- Health endpoint

### Database

- Production PostgreSQL
- Production migration
- Backup strategy

### Mobile

- Production API configuration
- Android build
- iOS build planning if applicable

### Acceptance Criteria

OPSflow is accessible in a production-like environment.

---

# Phase 19 — Optional SaaS / Polar Integration

**Status:** Optional / Post-MVP

**Goal:** Demonstrate how OPSflow could evolve into a commercial SaaS platform.

### Organization Model

- Organization entity
- Organization members
- Tenant isolation
- Organization-level roles

### Billing

- Research Polar
- Define subscription plans
- Define feature limits
- Configure Polar
- Subscription status
- Billing UI

### Important

Do not allow billing implementation to delay the core OPSflow MVP.

---

# Phase 20 — Demo Preparation

**Goal:** Prepare OPSflow for demonstration to the company's superiors.

The demo should tell a clear story rather than simply showing features.

## Demo Scenario

### Step 1 — Login

Demonstrate:

```text
Authentication
Role
Personalized experience

```

### Step 2 — Dashboard

Show:

```text
KPIs
Project health
Task status
Recent activity
Upcoming deadlines

```

### Step 3 — Create Client

Demonstrate:

```text
CRUD
Form validation
UI/UX

```

### Step 4 — Create Project

Demonstrate:

```text
Client relationship
Project manager
Priority
Deadline
Team

```

### Step 5 — Assign Task

Demonstrate:

```text
Project
Employee
Task
Priority
Deadline

```

### Step 6 — Employee Login

Show a different experience based on role.

### Step 7 — Update Task

Employee changes:

```text
Pending
    ↓
In Progress
    ↓
Completed

```

### Step 8 — Activity

Show that the action created an activity record.

### Step 9 — Notification

Show the relevant user receiving a notification.

### Step 10 — Mobile

Open the React Native application and demonstrate the same operational workflow from mobile.

---

# 21. Demo Talking Points

The following concepts should be emphasized during the presentation:

### Architecture

> "OPSflow is built as a TypeScript monorepo so the web application, mobile application, API, database layer, authentication and shared packages can evolve independently while sharing common contracts."

### CRUD

> "The system demonstrates complete CRUD workflows across users, clients, projects and tasks."

### Authentication

> "Authentication is handled centrally, while authorization is enforced server-side through role-based access control."

### Database

> "Prisma provides the type-safe database layer over PostgreSQL, with migrations providing controlled schema evolution."

### UI/UX

> "The goal wasn't just to reproduce CRUD operations, but to turn operational data into an interface that is easy to understand and act on."

### Mobile

> "The mobile application consumes the same API and business logic, allowing employees to interact with operational workflows away from the desktop."

### Scalability

> "The monorepo and shared packages provide a foundation for expanding OPSflow without duplicating functionality across applications."

---

# 22. MVP Definition

OPSflow MVP is complete when the following capabilities work end-to-end:

```text
Authentication
      ↓
Role-based authorization
      ↓
Dashboard
      ↓
Users
      ↓
Clients
      ↓
Projects
      ↓
Tasks
      ↓
Activity logs
      ↓
Notifications
      ↓
Mobile task workflow

```

The MVP must demonstrate:

- Authentication
- RBAC
- Dashboard
- User CRUD
- Client CRUD
- Project CRUD
- Task CRUD
- Project membership
- Activity logging
- Notifications
- Web application
- Mobile application
- Responsive UI/UX

---

# 23. Post-MVP Features

These should not block the initial demonstration:

- Advanced analytics
- Organization/multi-tenancy
- Billing
- Polar integration
- Advanced reporting
- File attachments
- Real-time updates
- Email notifications
- Push notifications
- Advanced permissions
- Audit log filtering
- Export to CSV/PDF
- Calendar integration
- Third-party integrations

---

# 24. Current Project Status

**Last verified:** 2026-09-07 — against the working tree, not from memory.

Status markers follow the legend in §3. Anything not marked `[x]` has
**not** been built, regardless of how complete the surrounding plan reads.

## Phase 0 — Foundation

- [x] Monorepo directory structure (`apps/`, `packages/`, `docs/`)
- [x] pnpm workspace (`pnpm-workspace.yaml`)
- [x] Turborepo task pipeline (`turbo.json`)
- [x] Root TypeScript config (`packages/config`)
- [x] Biome formatting + linting
- [x] Bun as the API runtime
- [x] `.gitignore` and `.env.example`
- [x] Docker Compose for local PostgreSQL (port 5434)
- [x] `pnpm install`, `pnpm typecheck` and `pnpm lint` all pass

## Phase 1 — Database

- [x] Prisma configured in `packages/db`
- [x] `schema.prisma` — 12 models, 6 enums, explicit delete behaviour
- [x] `prisma.config.ts` (required by Prisma 7)
- [x] PostgreSQL driver adapter (`@prisma/adapter-pg`)
- [x] Initial migration generated and applied
- [x] Prisma Client generated and connecting
- [x] Seed script for roles and departments
- [x] `add_account_issuer` migration — reconciles `accounts` with Better Auth 1.7.2
- [x] `docs/db_schema.md` and `.dbml` reconciled with the Prisma schema: Better Auth
  tables documented, `users.auth_id` and the Supabase authentication section removed,
  index list corrected. The `opsflow.svg` export was retired in favour of a Mermaid
  ERD, which can be edited alongside the schema instead of regenerated externally

## Phase 2 — Shared Packages

- [x] `packages/config` — shared TypeScript configs
- [x] `packages/db` — Prisma client export
- [x] `packages/auth` — Better Auth configuration
- [x] `packages/types` — response envelope, `Paginated<T>`, permission matrix,
  `CurrentUser`, user, department, client, project, task, activity,
  notification and dashboard shapes, plus the matching Zod schemas. Exposed
  as subpath exports (`/api`, `/auth`, `/permissions`, `/user`, `/department`,
  `/client`, `/project`, `/task`, `/activity`, `/notification`, `/dashboard`)
- [x] `packages/ui` — design tokens: a JSON palette, the status → tone table and a
  generated Tailwind 4 `tokens.css`. See Phase 14 below

## Phase 3 — Authentication (web + API complete)

- [x] Better Auth 1.7.2 configured in `packages/auth` (Prisma adapter, email + password)
- [x] Signup assigns the least-privileged `employee` role via `databaseHooks.user.create.before`
- [x] `roleId` / `departmentId` / `status` exposed as `input: false` additional fields
- [x] `/api/auth/*` mounted on the Hono API
- [x] `requireAuth` middleware; suspended and inactive users are rejected with 403
- [x] `/api/me` returns the profile joined with role and department names
- [x] Bootstrap admin / manager / employee seed (`pnpm db:seed`)
- [x] Verified end to end: sign-in, session persistence, sign-out, 401 and 403 paths
- [x] `apps/web` scaffolded — Vite 8, React 19, TanStack Router + Query, Tailwind 4, shadcn/ui
- [x] Web authentication client (`better-auth/react`) and envelope-unwrapping API client
- [x] Login page, sign-out, and the `/_authed` layout route guard
- [x] `/api/me` is the client's single source of truth for "signed in and still active",
  so the guard cannot be fooled by a stale cookie
- [x] Verified cross-origin `:5173` -> `:3000`: preflight returns
  `Access-Control-Allow-Credentials`, sign-in sets an HttpOnly `SameSite=Lax` session
  cookie, `/api/me` returns the profile, and sign-out invalidates it
- [x] Mobile authentication — Better Auth's Expo plugin with the session cookie in
  SecureStore; see Phase 13

## Phase 5 — API Foundation (partial, out of order)

- [x] Hono application with `/api/health`
- [x] Consistent success/error response envelope (§27 of the technical architecture),
  defined in `@opsflow/types/api` so clients unwrap it with the same types
- [x] Centralised error handling and 404 handler
- [x] CORS configured for the web origin with credentials
- [x] Fail-fast environment validation via Zod
- [x] Authentication middleware (`requireAuth`)
- [x] Authorization middleware (`requirePermission`) — see Phase 4
- [x] Zod request validation via `@hono/zod-validator`, reported through the standard
  error envelope as `VALIDATION_ERROR` with flattened field errors
- [ ] Request logging beyond Hono's default
- [x] Domain routes — `/users`, `/departments`, `/clients`, `/projects`,
  `/tasks`, `/activity` and `/notifications` are complete

## Phase 4 — Authorization / RBAC

- [x] Permission matrix in `@opsflow/types/permissions` — `ROLE_NAMES`, `PERMISSIONS`,
  `ROLE_PERMISSIONS` and `can()`, shared by the API and the web app so both decide
  from one table
- [x] `requireAuth` resolves the caller's role name and puts it on the Hono context,
  so authorization is a lookup rather than a second query
- [x] `apps/api/src/lib/roles.ts` — role ids are memoised from one `findMany`. They are
  three rows of seeded reference data, so a per-request join buys nothing. A failed
  load is not cached, and Phase 19 custom roles will need an invalidation path
- [x] `requirePermission(permission)` middleware, composed after `requireAuth`
- [x] Fails closed: an unknown or missing `role_id` is 403 plus a server-side log,
  not a 500 and not a default set of permissions
- [x] `services/` layer introduced, so routes stay thin and row scoping has somewhere
  to live that is not a middleware
- [x] Role-aware navigation in `apps/web`, gated by the same `can()`

The matrix answers "may this role attempt this operation". It deliberately does not
answer "which rows may this user see" — rules like "an employee sees only assigned
tasks" cannot be expressed as a flat permission string. Phase 8 added that as a
`where` clause on projects (manager or member); Phase 9 does the same for tasks
(`assignedTo` is the caller). Phase 10 scopes activity to the actor for employees
and notifications to `userId = caller` for everyone.

## Phase 6 — Users & Departments

- [x] `GET /api/users` — paginated, searchable by name or email, filterable by role,
  status and department. Offset paging, because these are administrative tables that
  need a total and jump-to-page; the contract lives in `Paginated<T>`
- [x] `GET /api/users/:id`
- [x] `POST /api/users` — provisions through `auth.api.signUpEmail`, then patches
  role, department and profile. `users:write` (admin only)
- [x] `PATCH /api/users/:id` — profile, role and department. A caller cannot change
  their own role
- [x] `PATCH /api/users/:id/status` — activate, deactivate, suspend. A caller cannot
  change their own status
- [x] `GET /api/departments` — unpaginated reference data with member counts
- [x] `POST /api/departments`, `PATCH /api/departments/:id`, `DELETE /api/departments/:id`
  — delete is rejected with 409 while the department still has members
- [x] Public HTTP signup blocked at the Hono layer (`POST /api/auth/sign-up/email`
  returns 403). `disableSignUp` was not used: it lives inside the Better Auth
  handler, which `signUpEmail()` also runs, so it would have broken admin-create
  and the user seed
- [x] `/api/me` moved off its inline Prisma call and onto the service layer
- [x] `apps/web` — `/_authed` is the app shell; users list with URL-backed filters;
  user detail, create and edit (TanStack Form); departments page with create/edit
  dialogs and a guarded delete; navigation gated by `can()`

Verified against the seeded database: unauthenticated requests get 401; admin and
manager get 200 on reads; employee gets 403 on directory reads while `/api/me`
still returns 200. Manager and employee get 403 on every write. Admin can create
a user (201) who then signs in with the initial password. Duplicate email is 409,
a five-character password is 422, self-demotion and self-suspension are 403,
deleting an occupied department is 409, deleting an empty one succeeds. Public
`POST /api/auth/sign-up/email` is 403 while `pnpm db:seed` still works.

## Phase 7 — Client Management

- [x] `GET /api/clients` — paginated, searchable by name, company or email,
  filterable by status. Offset paging, same `Paginated<T>` contract as users
- [x] `GET /api/clients/:id` — includes `projectCount` from the existing relation
- [x] `POST /api/clients` — `clients:write` (admin and manager). Status defaults
  to `active`; it is not a create-form field
- [x] `PATCH /api/clients/:id` — profile fields only
- [x] `PATCH /api/clients/:id/status` — activate, deactivate, archive. There is
  no DELETE: hard-delete would `SetNull` `projects.client_id`
- [x] Name and email are not unique — two contacts at the same company are valid
- [x] `apps/web` — clients list with URL-backed search and status filter; detail,
  create and edit (TanStack Form); archive confirmation; navigation gated by
  `can('clients:read')`. Employees are redirected away from `/clients`

## Phase 8 — Project Management

- [x] `GET /api/projects` — paginated, searchable by name or description,
  filterable by status, priority, client, manager and overdue. Offset paging,
  same `Paginated<T>` contract. Employees only see rows they manage or belong to
- [x] `GET /api/projects/:id` — client, manager, members, progress, taskCount.
  A miss, including an employee asking for a project they are not on, is 404
- [x] `POST /api/projects` — `projects:write` (admin and manager). Status
  defaults to `planning`, progress to 0. Manager must be an active admin or
  manager; client must be active
- [x] `PATCH /api/projects/:id` — profile fields and progress (0–100). Status
  and priority have their own endpoints
- [x] `PATCH /api/projects/:id/status` — lifecycle values including `cancelled`.
  There is no DELETE: hard-delete would `Cascade` members and future tasks
- [x] `PATCH /api/projects/:id/priority`
- [x] `POST /api/projects/:id/members` and `DELETE /api/projects/:id/members/:userId`
  — members must be active; a duplicate is 409. The manager may also be a member
- [x] `apps/web` — projects list with URL-backed filters; detail with status
  confirmation, priority control and member management; create and edit
  (TanStack Form); navigation gated by `can('projects:read')`. Employees see
  this module; they cannot write

Progress is a writable integer. It is not calculated from task completion.

## Phase 9 — Task Management

- [x] `GET /api/tasks` — paginated, searchable by title or description,
  filterable by status, priority, project, assignee and overdue. Offset paging,
  same `Paginated<T>` contract. Employees only see rows assigned to them
- [x] `GET /api/tasks/:id` — project, assignee, creator, completion time.
  A miss, including an employee asking for a task they are not assigned, is 404
- [x] `POST /api/tasks` — `tasks:write` (admin and manager). Status defaults
  to `pending`. `createdBy` is taken from the session. Assignee, if set, must
  be an active manager or member of the project
- [x] `PATCH /api/tasks/:id` — title, description, project, assignee, due date.
  Status and priority have their own endpoints
- [x] `PATCH /api/tasks/:id/status` — `tasks:read`, so an employee can move
  their own assignment through pending / in progress / blocked / completed.
  `completedAt` is set on `completed` and cleared otherwise
- [x] `PATCH /api/tasks/:id/priority` — `tasks:write`
- [x] `DELETE /api/tasks/:id` — `tasks:write`. Hard-delete; a task has no
  dependents that would be left dangling
- [x] `apps/web` — tasks list with URL-backed filters; detail with status
  confirmation (all roles who can see the row), priority control and delete
  (writers); create and edit (TanStack Form); task list on the project page;
  navigation gated by `can('tasks:read')`. Employees see this module; they
  cannot create, edit, reassign or delete

## Phase 10 — Activity & Notifications

- [x] `GET /api/activity` — paginated, searchable by description, filterable by
  entity type and entity id. Offset paging, same `Paginated<T>` contract.
  Employees only see rows they performed; admin and manager see the trail
- [x] `GET /api/notifications` — paginated, searchable, filterable to unread.
  Always scoped to the caller
- [x] `GET /api/notifications/unread-count`
- [x] `PATCH /api/notifications/:id/read` and `POST /api/notifications/read-all`
- [x] Mutations write an `activity_logs` row in the same Prisma transaction.
  Notifications fire when someone else should know: task assigned, task
  completed (project manager), project created (manager), project status
  (manager and members), member added or removed. The actor is never notified
  of their own action
- [x] `activity:read` and `notifications:read` on all three roles
- [x] `apps/web` — activity feed with URL-backed filters and entity links;
  notifications list with mark-one and mark-all; unread badge on the nav.
  Count refetches every 30s; there is no realtime channel

Deadline-approaching notifications need a scheduler and were left out.

## Phase 11 — Dashboard

- [x] `dashboard:read` permission on all three roles; the route is gated like
  every other module
- [x] `GET /api/dashboard` — one `DashboardStats` object computed server-side
  in a single `prisma.$transaction` of counts, so every card reflects the
  same snapshot. Project and task counts reuse `projectVisibilityWhere` /
  `taskVisibilityWhere` (now exported from their services), so an employee's
  numbers are "my" numbers; overdue uses the exact semantics of the list
  filters. The `org` section (users, employees, departments, clients) is
  keyed off `users:read` and is `null` for employees — directory sizes never
  leave the server
- [x] `utcToday()` deduplicated out of the project and task services into
  `apps/api/src/lib/dates.ts`
- [x] `apps/web` — the placeholder landing page replaced with the role-based
  dashboard: KPI cards (linked, alert colouring on overdue counts), quick
  actions gated by `can()`, project progress, upcoming deadlines (the tasks
  list already orders by due date ascending, so overdue items surface
  first), recent/system/personal activity, and a notifications card with the
  unread badge. Admin leads with the directory, manager with delivery,
  employee sees only their own scope
- [x] Feeds reuse the existing list endpoints with `pageSize=5` — they are
  already row-scoped and ordered, so no new query parameters were added

Stats refetch every 30s, the same cadence as the unread badge; there is
still no realtime channel.

## Phase 12 — TanStack Optimization

- [x] Route loaders. Every list, detail and edit route under `/_authed` awaits
  its primary query in a `loader` through `queryClient.ensureQueryData`, with
  `loaderDeps` carrying the validated search so a filter or page change re-runs
  it. A navigation now keeps the current page on screen until the next one has
  data, and with `defaultPreload: 'intent'` the row is usually cached before the
  click lands. Pages read the same cache with `useSuspenseQuery`, so the
  per-page `isPending` / `isError` branches, skeleton helpers and
  `describeError` copies were deleted
- [x] Prefetch without await for data that carries its own loading state: the
  filter options on list pages (only for roles the API would answer), the four
  dashboard feeds, and the task list on a project page
- [x] `defaultPreloadStaleTime: 0` so Query, not the router, decides freshness,
  plus a default `staleTime` of 30s so a query fetched on hover still counts
  as fresh when the page mounts. One request per navigation
- [x] `MutationCache.onSuccess` invalidates activity, notifications and the
  dashboard stats after every mutation. The API logs activity for every write
  and the counts move with all of them, so they are derived views rather than
  something each mutation has to remember. Without this the 30s `staleTime`
  would have let them lag behind a write
- [x] `components/route-feedback.tsx` — `RoutePending`, `RouteError` and
  `RouteNotFound`, registered once as router defaults. `RouteError` renders in
  the failed route's outlet so the shell stays around it; 404 and 403 get
  plain wording and no retry, anything else gets "Try again"
  (`router.invalidate()`), and a 401 drops the cached profile and hands over
  to `/login`
- [x] TanStack Form audited on all four modules: shared Zod schemas, disabled
  and relabelled submit while the mutation is pending, 422 envelopes mapped
  back onto fields. No changes needed
- [x] TanStack Virtual evaluated and dropped (Phase 12 above)
- [x] Verified in the browser as admin: dashboard, team list, person detail,
  deep-linked filtered projects list, filter change from the UI, unknown
  record (404 card inside the shell), unknown URL, and a session revoked
  server-side mid-visit (401 to login). Every endpoint was requested exactly
  once per state

## Phase 13 — React Native Mobile Application

- [x] `apps/mobile` scaffolded: Expo SDK 57, Expo Router, NativeWind 4 on
  Tailwind CSS 3, TanStack Query, `@opsflow/types` for every contract and
  never `@opsflow/db`. Runs inside the pnpm workspace with isolated
  `node_modules` (supported from SDK 54); Expo's default Metro config handles
  the monorepo, NativeWind is layered on top in `metro.config.js`
- [x] `packages/config/tsconfig.expo.json` — the shared base with Expo's
  `react-native` custom condition and DOM lib. Root TypeScript 7 is kept even
  though `expo install --check` expects 6; the typecheck passes
- [x] Authentication. `packages/auth` registers the Better Auth Expo plugin
  and trusts the app by its URL scheme (`opsflow://`, from `expo.scheme`).
  The mobile client keeps the session cookie in SecureStore and
  `src/lib/api.ts` attaches it by hand with `credentials: 'omit'`; on the web
  build the browser's cookie jar is used exactly as in `apps/web`
- [x] `/api/me` is the client's source of truth, as on the web, but a 401
  resolves to `null` rather than throwing: "signed out" is a normal state
  for the root layout, which mounts either the login or the app stack
  through `Stack.Protected`. A 401 from any other query sets it to null
  (`QueryCache.onError`), so an expired session drops to login from any screen
- [x] Login (shared Zod schema, field errors, pending state), My tasks
  (assigned to the signed-in user, ordered by due date, overdue in red,
  pull to refresh), task detail with an inline status confirmation, and a
  profile tab with sign-out. The status change is the employee workflow the
  phase's acceptance criterion names
- [x] Verified in a browser through the app's web build at 390×844: sign-in
  as the employee, empty state, list with an overdue task, detail, status to
  in progress (PATCH 200, list and detail refetched), reload keeps the
  session, profile, sign-out returns to login. Native devices were not
  available here, so SecureStore and the `opsflow://` origin were verified
  against the API in-process (see Phase 16) rather than from a phone
- [x] Development conveniences: Expo's web dev server (`http://localhost:8081`)
  is a CORS origin and a trusted origin outside production;
  `EXPO_PUBLIC_API_URL` is read from the root `.env` by the mobile scripts
- [x] Dashboard tab over `GET /api/dashboard`: the same role-based KPI set
  as the web in a two-column grid (directory counts are plain cards, since
  there is no mobile screen to open), an inbox card with the unread count,
  and two feeds — upcoming deadlines and active projects — from the
  row-scoped list endpoints at `pageSize=5`. Pull to refresh refetches all
  four queries
- [x] Projects tab (one page at the API ceiling, ordered by name on the
  server) and a read-only project detail: status, priority, progress,
  dates, manager and members, and the project's tasks through
  `GET /api/tasks?projectId=`, so an employee sees only their own
  assignments there while the card's total is the whole project's
- [x] Inbox tab: newest first, unread rows marked, tap to mark one read,
  mark all read, an all/unread filter, and the polled unread count as a
  badge on the tab bar. The same `MutationCache.onSuccess` rule as the web
  refreshes the dashboard counts and every notifications query after any
  mutation, so the badge moves with a task status change too
- [x] Five tabs — Home, My tasks, Projects, Inbox, Profile — the mobile
  priorities of product §30. Shared `Card`, `DetailRow` and `ProgressBar`
  components; `toSearchParams` deduplicated across the list modules
- [x] Verified through the web build at 390×844 as the employee: dashboard
  counts and feeds, project detail with the scoped task list, projects
  list, inbox at 9 unread → tap one (PATCH 200, badge 8) → mark all (badge
  gone, button disabled). Admin and manager dashboards verified for their
  KPI sets and org counts
- [x] Profile editing. `PATCH /api/me` accepts name and phone under
  `requireAuth` only, so every active role may edit themselves; email, role,
  department, position and status stay on the admin endpoints. Position was
  self-editable at first and is not any more: it states what someone does for
  the organisation, which is the work assigner's to say, not the account
  holder's. The
  write logs `updated` on the user in the same transaction. On mobile,
  "Edit profile" pushes a form screen on the same shared Zod schema, with
  local field errors and 422 envelopes mapped onto the same fields; a save
  writes the response straight into the current-user cache and returns to
  the tab. Covered in `rules.test.ts` (happy path, empty and invalid bodies,
  a stripped `role` key, the activity row) and verified through the web
  build: local "Enter a name", save, tab shows the new value, reload keeps
  it, exactly one PATCH and no extra GET
- [x] Changing your own password, the one account operation a person may
  perform on themselves. It does not go through `PATCH /api/me`: Better Auth
  owns the hash and is the only thing that can verify the current password
  before replacing it, so the mobile screen posts to its
  `/api/auth/change-password` with `revokeOtherSessions: true` — a password is
  changed because the old one is no longer trusted, and this device gets a
  fresh cookie in the same response. `changePasswordSchema` in
  `@opsflow/types/auth` validates locally against the same
  `PASSWORD_MIN_LENGTH` the API enforces, plus a confirmation field that never
  leaves the client, because the inputs are masked and a typo would lock
  someone out of the account they were securing. `INVALID_PASSWORD` lands on
  the current-password field; everything else is the error line. The screen
  reports success in place rather than returning to a tab that looks
  untouched. Covered in `rules.test.ts`: a wrong current password is 400, the
  change is 200, the old password then fails sign-in and the new one succeeds,
  and the seeded hash is restored through Prisma in `afterAll` so a failure
  mid-test cannot strand the fixture
- [x] First run on a device: an iPhone running Expo Go over the LAN, with
  `EXPO_PUBLIC_API_URL` and `BETTER_AUTH_URL` on the machine's address. The
  app loaded and the workflows worked from the phone, so the SecureStore
  cookie and the `credentials: 'omit'` path are exercised for real, not only
  in-process. Expo Go shows the project card with the app icon; it renders
  its own launcher instead of the app's splash, which needs a native build
- [x] App assets. `apps/mobile/assets` holds the icon, the Android adaptive
  icon (mark inside the 66% safe zone over `#171717`), the splash image and
  a favicon, all drawn by `scripts/make-assets.mjs` — a dependency-free
  Node script (`pnpm --filter @opsflow/mobile assets`) that encodes the
  PNGs itself, since the machine has no image tooling. The mark is three
  stacked pills in the neutral scale the components already hard-code, so
  the Phase 14 token extraction can recolour it in one place. `app.json`
  wires `icon`, `android.adaptiveIcon`, `web.favicon` and the
  `expo-splash-screen` plugin (SDK 57 dropped the top-level `splash` key);
  `expo-splash-screen` is installed at the SDK-pinned version. `expo export
  --platform web` now emits `favicon.ico` and links it from `index.html`.
  The template's `newArchEnabled` and `android.edgeToEdgeEnabled` keys are
  gone: SDK 57 has both always on, dropped them from the config schema, and
  `expo-doctor` rejected them

## Phase 13b — Mobile Management

- [x] Write side of the mobile data modules: `tasks.ts` and `projects.ts`
  gain the same mutations as the web (`create`, `update`, status, priority,
  delete / members); new `clients.ts`, `departments.ts` and a read-only
  `users.ts` for the manager and member pickers. Query keys match the web
  client's, so the invalidation rules carry over unchanged
- [x] Shared pieces: `Picker` (a bottom-sheet single choice, with an optional
  "none" row for nullable foreign keys), `InlineConfirm`, `FormScreen` (the
  keyboard-aware card every create/edit screen uses), `Segmented`, a
  multiline mode on `Field`, client status badges, and `useCan()` on top of
  the current-user query
- [x] Tasks: `tasks/new` (with `?projectId=`), `tasks/[taskId]/edit`, and on
  the task screen an Edit button, a priority picker and a delete
  confirmation for `tasks:write`. The tab gains a Mine / All switch and an
  Add button for the same roles; employees see exactly what they saw before.
  Detail routes moved from `[taskId].tsx` to `[taskId]/index.tsx` so the
  edit screen can sit beside them
- [x] Projects: `projects/new`, `projects/[projectId]/edit` (progress is
  edited here, priority only on create, as on the web), and on the project
  screen status buttons with confirmation, a priority picker, add/remove
  team members from the active people directory, and an Add task button
  that preselects the project
- [x] Clients: `clients/index` with an all / active / inactive / archived
  filter, `clients/[clientId]`, `clients/new`, `clients/[clientId]/edit`,
  and deactivate / archive / reactivate with the same projects note as the
  web dialog
- [x] Departments: one screen with the list, an inline add/rename form and
  an inline delete; a department with members shows the reassign message
  instead of a delete button, mirroring the API's 409
- [x] Entry points: the dashboard's Departments and Active clients counts
  open their screens; the profile tab gets a Directory card with the same
  links, both gated on the read permission. The stack registers every new
  screen with a header title
- [x] Verified through the web build at 390×844 against the running API as
  the manager: client create (local email validation first, then POST 201),
  edit, deactivate; task create with project and assignee pickers, priority
  to critical, edit, delete (back to the list, row gone); project create
  with client and manager pickers (deadline-before-start refused locally),
  status to active, member added and removed, progress edited to 40%, Add
  task lands on the form with the project preselected; departments
  read-only for the manager. As the admin: department add, rename and
  delete. As the employee: no Add, Edit or Delete control anywhere

## Phase 13c — Mobile People & Activity

- [x] `src/lib/activity.ts` — keys and one query; the feed is read-only,
  there being no endpoint that writes or clears a log. `src/lib/users.ts`
  gains `detail`, `createUser`, `updateUser` and `updateUserStatus`, so the
  module that existed for the project pickers now backs a directory too
- [x] `usersQueryOptions` lost its five-minute `staleTime`. It was tuned for
  picker use; a directory you can edit from would have shown a stale row for
  five minutes after a save. The global 30s default is right for both
- [x] `UserStatusBadge` — `USER_STATUS_TONES` was already in `@opsflow/ui`
  and unused by mobile, so this is the shared table finding its second
  reader. `Badge` is now exported for labels that are not a status, which is
  what an activity action is
- [x] `FilterChip` moved out of the notifications screen into
  `components/filter-chip.tsx`, joined by `ChipRow`. `Segmented` divides its
  width between options and stops reading past three or four; activity needs
  six and people needs two rows of four, so the chips scroll instead
- [x] Activity: one card per event, filtered by entity type. A row opens the
  record it names, subject to the same checks the web's `EntityLink` makes.
  This is not hypothetical — the seeded employee's feed contains `user`
  rows, and an employee has no `users:read`, so those render as plain text
  with no chevron
- [x] People: directory with role and status chips, detail, one create/edit
  form, and activate / deactivate / suspend behind an inline confirmation.
  The password is create-only; the status control is absent on your own
  record; the role picker is not, because the API's 403 is the guard and
  hiding the control would differ from the web
- [x] Entry points: the profile Directory card is now a filtered list of
  four rather than a chain of conditional separators, and the dashboard's
  Users, Employees and Team counts open the directory instead of being
  plain cards
- [x] Every route registered in `(app)/_layout.tsx` with a header title

Verified against the seeded database with the API running. Per role, over
HTTP: `GET /users` is 200 for admin and manager and 403 for an employee,
while `GET /activity` is 200 for all three; the employee's feed is 43 rows
against the other roles' 266, every one of them their own action. A manager
is refused `POST /users` with 403. A create with the exact payload the form
builds — empty strings for the optional profile fields, `null` for a cleared
department and joined date — returns 201 with those fields nulled, the email
lowercased, `joinedAt` defaulted to today, and the new person signs in with
the initial password. A duplicate email is 409 and a five-character password
is 422 with the message under `details.password`, which is why one lands on
the form's error line and the other on the field. Self-demotion and
self-suspension are both 403. The fixture user and the role changes made
during this were removed again afterwards.

`LAST_ADMIN` could not be provoked over HTTP, and on reading
`assertNotLastAdmin` it cannot be: the self-guard rejects a caller acting on
themselves before the count is taken, and anyone else holding `users:write`
is by definition another active admin, so the remaining count is never zero.
It is a defensive guard for a future in which `users:write` is not the
admin's alone. The mobile screen predicts none of this — it shows whatever
the API refuses, wherever the action was taken.

Two doc corrections came out of this. `technical_architecture.md` said users
were web-only, which this phase reverses. `product_architecture.md` §33
rated Clients as *View* on mobile, which Phase 13b had already outgrown —
create, edit and the status actions all shipped there.

## Phase 16 — Testing (pulled forward, partial)

- [x] `apps/api/test/api.test.ts` — Bun's test runner against the assembled
  Hono app in-process (`app.request()`), on the seeded development database.
  Covers the session round trip, sign-out, the closed signup endpoint, the
  trusted-origin rule for the web origin and the mobile scheme, refusal of
  an unknown origin, and one authorization decision per role. `pnpm test`
- [x] `apps/api/src/app.ts` now exports the app without a listener;
  `index.ts` only serves it
- [x] Better Auth disables its origin check whenever `NODE_ENV` is `test`,
  which Bun's runner sets. `advanced.disableOriginCheck: false` pins it on so
  the tests exercise the production rule and no environment can switch it
  off silently
- [x] `apps/api/test/rules.test.ts` — the cross-record rules below, with the
  fixture rows removed again afterwards
- [x] `.github/workflows/ci.yml` — GitHub Actions on every push to `main` and
  every pull request: Biome, typecheck, the API tests against a seeded
  `postgres:16-alpine` service, then a production build. The Prisma client is
  generated explicitly because `packages/db/src/generated` is gitignored and
  the `test` task never schedules the db package's generate task; migrations
  are applied with `migrate deploy`, not `migrate dev`. The same sequence
  works locally after `rm -rf packages/db/src/generated`
- [ ] Unit, integration, frontend and mobile tests

## Audit fixes (2026-09-05)

A full read of the code against this plan and the product document found
these defects; all are fixed and covered by tests or verified by typecheck.

- [x] The user, project, client and department forms parsed their payload
  with the shared Zod schema but only understood API errors, so a local
  validation failure showed a generic banner and no field message. The
  web API client now maps a ZodError the same way as a 422 envelope, and
  every form uses one `formErrorMessage` helper
- [x] Editing a user, client or department wrote no activity row, contrary
  to the "every mutation is logged" rule. All three now log `updated`; a
  role change logs `role_changed` with the old and new values
- [x] Removing a project member, or handing the project to a new manager,
  left open tasks assigned to someone who was neither manager nor member.
  Both now refuse with `ASSIGNEE_HAS_OPEN_TASKS` until the work is
  reassigned; completed tasks stay with the person as history
- [x] Tasks could be created on, or moved to, completed and cancelled
  projects. Both now refuse with `PROJECT_CLOSED`
- [x] The users list and detail routes lacked the client-side permission
  redirect the other admin pages have
- [x] The mobile current-user hook threw during the sign-out frame; it now
  returns `null` and the two screens render nothing for that frame

## Lifecycle enforcement (2026-09-07)

The Phase 14 prerequisite in §25 — enforce the project and task state
machines, or document them as guidance — was decided in favour of
enforcement.

- [x] `TASK_TRANSITIONS` and `PROJECT_TRANSITIONS` in `@opsflow/types`,
  beside the status arrays and in the same spirit as the permission matrix:
  one table, enforced server-side, mirrored by the clients
- [x] `setTaskStatus` and `setProjectStatus` refuse an unreachable move with
  `INVALID_TASK_TRANSITION` / `INVALID_PROJECT_TRANSITION` (409), and a
  no-op with `TASK_STATUS_UNCHANGED` / `PROJECT_STATUS_UNCHANGED`. A no-op
  previously wrote an activity row saying nothing changed and reset
  `completedAt` on an already-completed task
- [x] The status controls on all four detail screens — web and mobile,
  project and task — now offer `nextTaskStatuses()` / `nextProjectStatuses()`
  instead of every status but the current one
- [x] Moving a project to `completed` sets `progress` to 100. A completed
  project reading 60% is a contradiction the dashboard averages into its
  figures
- [x] `apps/api/test/rules.test.ts` walks both lifecycles end to end and
  asserts every refusal. 17 tests pass

The two edges the product document does not draw, and why they are open:

- A completed task or project reopens (`completed → in_progress`,
  `completed → active`), because completion is a claim that can turn out to
  be wrong. Reopening a project does not reverse the progress figure; it is
  edited back with the rest of the plan
- A task un-starts (`in_progress → pending`), which corrects a misclick
  rather than skipping a step

`cancelled` is the one terminal status: cancelling is a decision that was
taken, not a claim that can be wrong. Both project detail screens say so in
place of the status controls rather than rendering an empty row. `cancelled`
is also reachable from every open status, not only from `planning` as
product §14 draws it — work is abandoned mid-flight more often than during
planning.

## Phase 14 — UI/UX Polish (started 2026-09-08)

- [x] `@opsflow/ui` design tokens. `src/palette.json` is the single source of
  truth — the neutral scale the mobile components are built on, and six
  semantic tones (muted, neutral, info, success, warning, danger), each a
  background and a text colour. `src/tones.ts` says which tone every task,
  project, client and user status, and every priority, renders in.
  `src/tokens.css` is a Tailwind 4 `@theme` block generated from the JSON by
  `pnpm --filter @opsflow/ui generate`, committed, and checked for drift in CI
- [x] Web and mobile now agree on status colours. The web badge had collapsed
  every status into three shadcn variants, so completed, active and in
  progress were indistinguishable and cancelled read as destructive; the
  mobile badge coloured each one. Both badge components read the shared
  tone table and keep their own tone → class map, because Tailwind only
  scans each app's sources. Labels come from one `toneLabel()`, so the web
  now reads "In progress" like mobile rather than "In Progress"
- [x] Mobile reads the palette everywhere a colour is not a class name:
  `tailwind.config.js` extends `neutral` and `tone` from the JSON, the
  `SafeAreaView` background, icon tints and placeholder text import
  `@opsflow/ui/colors`, `app.config.js` overrides the launcher and splash
  colours in `app.json` from it, and `scripts/make-assets.mjs` draws the
  icon set in the same ink. The regenerated PNGs are byte-identical, which
  is the point: nothing moved, it is now defined once
- [x] Verified: `pnpm lint`, `pnpm typecheck`, 17 API tests, `pnpm build`
  (the web bundle contains all twelve tone utilities), `expo config` shows
  the palette-driven colours, `pnpm --filter @opsflow/mobile assets` is a
  no-op
- [x] The web profile page, which closes the last self-service gap between the
  clients. Three routes under `_authed/profile`, mirroring the mobile screens
  and the app's own read-page → form-route shape: `/profile` shows your details
  in the same `dl` the person page uses, `/profile/edit` is name and phone, and
  `/profile/password` is the Better Auth change. None of them carries a
  permission guard — `/api/me` is behind `requireAuth` alone, so a check on
  "yourself" would be the only tautology in the route table. Position is shown
  and not editable, matching what the API now enforces, and the Status row from
  the person page is dropped: on your own profile it can only ever read
  "active", since a suspended session never gets this far
- [x] Two entry points, mirroring how `SignOutButton` is already mounted twice:
  the sidebar footer that carries your name and role becomes the link, and
  because that footer is `hidden md:block`, narrow screens get a labelled
  person icon beside sign-out in the header. Deliberately not a ninth nav item
  — every other entry there is a module, and this one is you
- [x] `ProfileForm` writes the `PATCH /api/me` response straight into the
  current-user cache and invalidates `userKeys.all`, since your name is a row
  in the People directory. It also calls `router.invalidate()`: `AppShell`
  reads the user from the `_authed` route context, a snapshot taken in
  `beforeLoad` rather than a live subscription, so without it the sidebar keeps
  showing the old name until a reload. The same latent staleness exists in
  `user-form.tsx` for an admin renaming themselves; left alone here as it is
  not this change's to fix
- [x] `ChangePasswordForm` posts to Better Auth with `revokeOtherSessions: true`
  and maps `INVALID_PASSWORD` onto the current-password field. Better Auth does
  not answer with the OPSflow envelope, so its failures become a local
  `ChangePasswordError` rather than an `ApiRequestError` — that type is defined
  as an envelope failure and `route-feedback.tsx` reads it as one. A local
  ZodError still falls through to the shared `fieldErrorsFrom` /
  `formErrorMessage` helpers, so a short or mismatched password reports itself
  exactly as in every other form
- [x] Verified: `pnpm lint`, web `typecheck` and `build` (the route tree
  regenerated to three new routes), 19 API tests, and the four requests the
  pages make driven by hand from the web origin — sign-in 200, `PATCH /api/me`
  200 for name and phone, 422 for a position-only body, and
  `/api/auth/change-password` 400 with `code: "INVALID_PASSWORD"` for a wrong
  current password
- [x] Browser pass (2026-09-10), as the employee at 1280×800 against the running
  API. `/profile` opens from the sidebar footer and shows role, department,
  position, "Not provided" for an empty phone and the join date, with no status
  row. `/profile/edit`: an empty name stays on the page with "Enter a name" on
  the field and sends no request; a new name and phone save, return to
  `/profile`, persist, write an `updated` activity row, and the sidebar shows
  the new name without a reload; clearing the phone stores `null`.
  `/profile/password`: a mismatched confirmation marks only that field and
  sends no request; a wrong current password lands "That is not your current
  password" on the current-password field and leaves the credential untouched;
  a real change returns to `/profile` still signed in, drops the account's live
  sessions from three to one, and the old password then fails sign-in while the
  new one succeeds. Name, phone and password were restored through the same
  pages, and the 19 API tests pass afterwards. The success toasts had closed
  before they could be read, so they are unobserved rather than confirmed
- [x] Test hazard found on the way: `rules.test.ts` restores only the
  employee's credential, so changing the seeded admin or manager password by
  hand (as happened on 2026-09-09) fails eight tests with 401 until the
  password is set back. Exercise the password pages on the employee account
- [x] Dashboard information hierarchy (2026-09-12). The web dashboard now
  follows product §42's order — what needs attention, then the current
  state, then upcoming work, then activity. A "needs attention" card leads
  the page with overdue and blocked tasks and delayed and overdue projects,
  each count linking to the list already filtered; the header carries the
  role's quick actions. `DashboardTaskStats` gained `blocked`, so the count
  is one more row in the same transaction. The tasks list gained an `open`
  filter (`taskListQuerySchema`, `task.service.ts`): the list orders by due
  date, so without it completed tasks with past due dates filled the
  deadlines card ahead of the work still to do. Both dashboard feeds — web
  and mobile — now ask for `open: true`; an explicit `status` is narrower
  and wins
- [x] Verified: `pnpm lint`, `pnpm typecheck`, 21 API tests (two new in
  `rules.test.ts` — the open filter leaves completed tasks out and an
  explicit status wins; the dashboard counts blocked tasks), `pnpm build`
- [x] Dark tone values and a destructive fill in the palette. Each tone in
  `palette.json` now carries a `dark` pair — a deep tint and a light ink —
  beside its light pair, and `danger` alone carries `strong` (`#dc2626`),
  the solid fill a destructive button needs: `foreground` is ink and turns
  light in dark mode, so it cannot double as a fill. The generator emits the
  light values as before and appends a `.dark { … }` block that overrides
  every tone variable, the override its own header comment anticipated; the
  web utilities reference `var(--color-tone-*)`, so nothing else changes
  there. On mobile, Tailwind 3 flattens the nested pair to
  `bg-tone-info-dark` for a `dark:` variant, since NativeWind has no cascade
  to override a variable with. `colors.ts` asserts the shape, so a tone
  missing its dark pair fails typecheck rather than rendering undefined.
  Technical architecture §18 updated
- [x] Verified: `pnpm --filter @opsflow/ui generate` is a no-op after the
  commit, `pnpm lint`, `pnpm typecheck`, `pnpm build` — the web bundle now
  contains the `.dark` tone block
- [x] The mobile reds are gone. Every `red-*` utility in `apps/mobile` was
  stock Tailwind, not a palette value, so the error line under a field read
  in a different red from the `blocked` badge beside it. `ErrorText` is the
  one component for a failed request or field now — thirteen sites, three
  of them shared components — and it carries `accessibilityRole="alert"`,
  which none of the bare `<Text>` lines it replaced did. Invalid borders,
  the overdue date lines, the overdue KPI value and `DetailRow`'s alert
  tone read `tone-danger-foreground`; the destructive button fills with
  `tone-danger-strong`. The login and change-password screens now pass
  their error through `describeError()` like every other screen, instead
  of reading `.message` directly
- [x] Verified: `grep -rn "red-" apps/mobile/app apps/mobile/src` is empty;
  `pnpm lint`, mobile `typecheck`; through the web build at 390×844
  against the running API — a wrong password renders "Invalid email or
  password" as a `role="alert"` in the danger ink, the overdue task and
  project KPIs and the deadline line read in the same ink, and Tailwind
  generated `bg-tone-danger-strong` from the nested palette key
- [x] Dark mode on the web. `lib/theme.ts` owns a light / dark / system
  preference under one `localStorage` key, applied as the `.dark` class on
  `<html>` that the shadcn variables and the generated tone block already
  key on, plus `color-scheme` so native controls and scrollbars follow.
  `system` is the default and stores nothing. A four-line script in
  `index.html` applies the same rule before the bundle loads, so a dark
  session never paints a white frame first; from then on the module owns
  it, re-syncing on the media query's `change` event, on `visibilitychange`
  (an OS switch made while the tab was in the background) and on `storage`
  (a preference set in another tab). `ThemeToggle` is one button cycling
  light → dark → system with an `aria-label` that names the current and
  the next mode — three states in one control keeps it the size of the
  profile icon and needs no menu primitive. Mounted twice, like
  `ProfileLink`: the narrow-screen header and the sidebar footer. The
  toaster now takes the app's resolved theme rather than `"system"`, so a
  user who chose dark on a light desktop gets dark toasts
- [x] Verified: `pnpm lint`, web `typecheck` and `build`; in the browser
  against the running API as the employee — the boot script honours an
  emulated light and dark OS with nothing stored; three presses cycle
  system → light → dark → system with the class, `color-scheme`, the
  stored value and the label moving together, on both mount points; with
  `dark` stored and the OS emulated light, a reload comes up dark and the
  `/tasks` badges render the dark tone pairs; a profile save shows a
  success toast carrying `data-sonner-theme="dark"`. The emulated OS
  switch does not dispatch the media query's `change` event in this
  browser harness, so the live flip was verified through the
  `visibilitychange` path instead, which re-applied the OS value
- [ ] The remaining Phase 14 items — typography and spacing review, dark
  mode on mobile (the palette pairs exist; every screen still hard-codes
  its light surfaces), accessibility review

Not a token: the web's grey surfaces are shadcn's zinc-toned `oklch`
variables, not this neutral scale. §25 previously said the two were the
same; they are close, not identical, and unifying them is a later polish
item rather than a prerequisite

## Known gaps in this plan

- The login page always lands on `/`. Deep-link restoration was left out
  deliberately: an unvalidated `?redirect=` parameter is an open redirect. Add
  it with an internal-path check now that the route table has more than one
  protected page.
- The session cookie is `SameSite=Lax`. Correct for development and for
  production hosts that share a registrable domain, but a genuinely cross-site
  deployment needs `SameSite=None; Secure` (Phase 18).
- The users table pages, but has no sortable columns. Sorting is a service-layer
  `orderBy` plus a search parameter; it was left out until a screen needs it.
  The product document (§29) also lists bulk actions; none exist.
- There is no global search (product §27); each list searches itself.
- Completing a project does not touch its tasks. Deliberate: auto-completing
  them would invent completion times and activity rows for work nobody
  finished. The open tasks stay open and visible on a completed project.
- No detail page links to the entity's activity history, although
  `GET /api/activity` can filter by entity. Product §24 promises "how an
  entity evolved".
- No avatar upload path; `users.avatar_url` is never written.
- No deadline reminders (product §25 "due tomorrow"); notifications fire only
  on direct actions.
- Departments are hard-deleted behind a 409 guard where the product document
  says archive. A deliberate simplification, recorded here.
- Creating a user is two steps (Better Auth signup, then the profile patch).
  If the second fails, an employee-role account without a department remains.
- Overdue is computed against the UTC date, so a user ahead of UTC sees
  yesterday's date as "today" for the first hours of their day.
- Rate limiting is Better Auth's default, which is active only in production.
- There is no Dockerfile and no git hooks yet (Phase 18). CI exists (Phase 16).
- Password minimum is 6 characters (`PASSWORD_MIN_LENGTH` in `@opsflow/types/auth`),
  a demo concession. Raise it before production; it is the same bound Better Auth
  and the create form share, so they cannot drift.
- There is no password reset. Email notifications are post-MVP (§23), so a
  forgotten password still needs an admin to set a new one out of band.
  Changing a password you know is self-service on both clients.
- The last-admin guard in the user service is unreachable with the current matrix:
  only admins have `users:write`, and they cannot change their own role or status.
  The self-modification rule is what actually stops the last admin locking the
  organisation out. The last-admin check stays so a future permission change
  cannot create that hole.

## Not started

- [ ] Phases 15-20 — Performance, testing (started), security, deployment, demo.
  Phase 14 is in progress (above)

## Stack amendments

The stack decisions taken during implementation now live in
[`technical_architecture.md`](technical_architecture.md) §43, alongside the
sections they changed, rather than being tracked separately here. That document
is at v2.5 to reflect them.

---

# 25. Immediate Next Steps

The application is complete through Phase 13c: every web module is a full
vertical slice — authentication, RBAC, service layer, Prisma, reads and writes
(§24) — navigation is loader-driven, the dashboard gives each role its
operational overview from real rows, and the mobile app now reaches every
module the web does. It covers the employee workflows and, for managers and
administrators, the management of tasks, projects, clients, departments and
people, plus the activity trail, with its own icon set.

Mobile is no longer missing a module. What it still does differently is
paging: every mobile list is one page at the API's ceiling, filtered with
chips, where the web has search, filters and jump-to-page. That is a
deliberate trade, but it is also the next thing that will hurt — an
organisation with more than a hundred people or a busy activity trail sees
only the first page on a phone, and the header count is what tells them so.

Next:

```text
1. Phase 14 — UI/UX Polish
```

The lifecycle question that gated Phase 14 is settled: the state machines
are enforced in the API and mirrored by both clients (§24 "Lifecycle
enforcement").

The first polish slice is done: `packages/ui` holds the palette and the
status → tone table, both badges read it, and the mobile icon set is drawn
from the same JSON (§24 "Phase 14"). CI runs lint, typecheck, the API tests
and the build on every push and pull request, so each polish commit from
here is verified.

The dashboard slice is done: the web dashboard leads with what needs
attention and both feeds show open work only (§24 "Phase 14"). The next
slice is the remaining mobile reds, then dark mode on both clients, then
typography and spacing across both. Dark mode needs tone values for the
`.dark` block before a toggle is worth wiring.

Two `expo-doctor` notes are carried, not fixed: `typescript` 7 against the
SDK's expected 6 (accepted in Phase 13, the typecheck passes) and
`expo-font` as a direct dependency for `@expo/vector-icons`, which only
matters for a native build outside Expo Go — install it with
`npx expo install expo-font` when the first development build is made
(Phase 18).

Do not begin building all remaining modules simultaneously.

---

# 26. Final Project Principle

OPSflow should not be built merely to demonstrate that CRUD operations can be implemented.

The objective is to demonstrate that the developer can take a real operational problem and build a maintainable, secure, scalable and polished product around it.

The final system should demonstrate:

```text
                 OPSFLOW

        ┌─────────────────────┐
        │      UI / UX        │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │    Web + Mobile     │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │    TanStack / API   │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │       Hono          │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │       Prisma        │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │     PostgreSQL      │
        └─────────────────────┘

```

**Primary objective:** Build a production-quality CRUD/operations platform that demonstrates strong engineering fundamentals, modern TypeScript architecture, authentication, authorization, responsive UI/UX, mobile development, and the ability to turn a business workflow into a polished software product.

