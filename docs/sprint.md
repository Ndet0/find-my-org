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

**Last verified:** 2026-09-13 — against the working tree, not from memory.

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
- [x] Unit tests for `@opsflow/types` and the clients' pure modules (2026-09-13,
  below)
- [ ] Component, integration and mobile flow tests

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

## Phase 14 — UI/UX Polish (2026-09-08 → 2026-09-12, complete)

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
  profile icon and needs no menu primitive. It was first mounted twice
  beside sign-out, like `ProfileLink`; it is now the floating button
  described below. The toaster takes the app's resolved theme rather than
  `"system"`, so a user who chose dark on a light desktop gets dark toasts
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
- [x] Dark mode on mobile. Every light surface and ink class now carries
  its `dark:` pairing in place — `bg-white dark:bg-neutral-900`,
  `text-neutral-500 dark:text-neutral-400` and so on, 216 pairings across
  32 files from a fixed table: canvas 100 ↔ 950, surface white ↔ 900,
  borders 200 ↔ 800 and 300 ↔ 700, ink 900 ↔ 50, the muted steps one shade
  lighter, the primary button and active chip inverted. NativeWind has no
  cascade to override a variable with, so the pairing is a class rather
  than the web's `.dark` variable block; the badges read the tone's dark
  pair the same way. The seven colours that are props rather than classes
  (the screen background, placeholder text, icon tints) read
  `useColorScheme()`. The navigators' own chrome — stack headers, the tab
  bar, the scene behind a transition — is native and themed through Expo
  Router's `ThemeProvider` from `lib/navigation-theme.ts`, so a push in
  dark mode never shows a light frame. `lib/theme.ts` mirrors the web's:
  the same union and key, SecureStore on the phone and `localStorage` on
  the web build, `system` stored as nothing, read once before the
  navigator mounts. NativeWind's web build treats `system` as "remove the
  class" without consulting the OS, so there the module resolves it from
  `prefers-color-scheme` itself; on a phone NativeWind's Appearance
  handling does it. The control was first an Appearance row on the
  profile tab; it is now the floating button described below. The status
  bar follows the resolved scheme rather than the OS
- [x] Verified: `pnpm lint`, mobile `typecheck`; a grep for any surface
  class without its `dark:` pairing is empty; through the web build at
  390×844 against the running API as the employee — Dark turns the profile
  card to neutral-900 on neutral-950 with neutral-50 ink and the `dark`
  class on the root, Light turns it back, the choice persists across a
  reload, the tasks tab in dark shows the tone pairs on the badges and no
  light navigator container behind the scene, the task detail header reads
  in the light ink, and System follows the emulated OS in both directions.
  Native devices were not available here; SecureStore persistence and the
  Appearance path are the same calls the session already relies on
- [x] Web loading, empty and error states, shared. `MessageRow` — the one
  row a table shows when it has nothing to list — was the same nine lines
  in six list routes and inlined a seventh time in departments; it now
  lives in `components/table-message.tsx`. Beside it, `RefreshFailed`
  closes a real gap: a list page's loader awaits its query, so a failed
  first load was already the router's error card, but a failed *refresh*
  kept the rows Query already had and said nothing. Every list route now
  shows the notice above its table with the shared wording and a retry,
  the rows still readable underneath. The router's generic skeleton was
  a `max-w-2xl` block under every page; the list routes register
  `ListPending` (heading, count, filter row, six rows at the list width)
  and the four record routes `DetailPending`, so the skeleton has the
  rhythm of the page that replaces it. No per-page skeletons: one shape
  per route kind, as decided
- [x] Verified: `pnpm lint`, web `typecheck` and `build`; in the browser
  against the running API as the employee — with the API process paused,
  an in-app link to a filtered tasks list shows the list skeleton at
  `max-w-6xl` with eleven placeholder blocks; with the API stopped and the
  tasks query past its stale window, returning to the list keeps its rows
  and, once Query's retries are spent, shows "Could not refresh this list"
  as a `role="alert"` with Try again; after the API is back, Try again
  clears it. The pending threshold means a fast network never shows the
  skeleton, which is the point
- [x] Typography and spacing. The web's type scale was already one scale —
  the page `h1` at `text-2xl`, the record card's title at `text-xl`,
  sub-cards and feedback at `text-lg`, dashboard tiles at `text-base` — so
  the review changed only the two pages that broke the pattern: departments
  sat in `max-w-4xl` where every other list is `max-w-6xl`, and the
  activity header was a bare `div` where every other page has the
  `header` with an action slot. On mobile the card was the thing being
  re-spelled: the form frame, the login and the two profile screens each
  hand-rolled a `rounded-2xl p-6` panel beside `Card`'s `rounded-xl p-4`,
  and five list rows re-spelled the card's classes to add a press state.
  `Card` now takes `padding="lg"` for the form case at the same radius, and
  `PressableCard` is the row that opens a record, with the press state and
  the button role built in. `Field` and `Picker` shared a label-above,
  message-below frame by copy; `FieldFrame` and `controlBorder` in
  `field.tsx` are now the one copy. The unread dot on the notifications
  list was stock `blue-600`, the last colour outside the palette on
  mobile; it reads the info tone now. `rounded-2xl` no longer appears in
  the app
- [x] Verified: `pnpm lint`, web and mobile `typecheck`, web `build`;
  through the mobile web build at 390×844 — a task row is the shared card
  (12px radius, 16px padding, 8px gap, dark surface) and still links to
  its record; the profile edit form is the same card at 24px padding and
  gap; a field's frame keeps its 6px label gap and the input its 8px
  radius and dark border. On the web, the activity page header now carries
  the shared header classes
- [x] Accessibility and keyboard navigation. Web: a "Skip to content"
  link is the first thing in the tab order and lands focus on `<main>`,
  which is now focusable; every column header carries `scope="col"`; the
  row actions — the Edit links on four lists and the Edit and Delete
  buttons on departments — were a bare `<a>` or `<button>` with no focus
  ring, and are now the button primitive's `link` variant at the same
  size and colour, so they inherit its `focus-visible` ring; the page
  summary under a table is a polite live region, so a page change is
  announced. The one real defect found: every dialog in the app is opened
  by an ordinary button and controlled with `open`, so it has no Radix
  trigger, and on close Radix let focus fall to the body — a keyboard
  user lost their place after every confirmation. `useReturnFocus`
  records the opener in `onOpenAutoFocus`, which fires with focus still
  on it, and both content wrappers hand focus back in `onCloseAutoFocus`.
  Mobile: `ErrorText` announces as an alert and `PressableCard` carries
  the button role (earlier slices); `Segmented` reads as a radio group
  with checked state rather than three buttons; the dashboard's deadline
  line, which said only the date and relied on colour for "overdue", now
  carries an accessibility label that says so. Status badges already read
  their label as text and needed nothing
- [x] Verified: `pnpm lint`, web and mobile `typecheck`, web `build`; in
  the browser as the employee — Tab from the top lands on the skip link,
  and following it puts `<main>` in `document.activeElement`; all six
  headers on the tasks table are `th[scope=col]`; on a task, opening the
  status dialog from its focused button moves focus into the dialog,
  Escape closes it, and once the exit animation ends focus is back on the
  button (before the fix it was the body). The browser harness embeds the
  page without document focus, so `:focus-visible` rings could not be
  observed; they are the button primitive's own classes. No axe run was
  available here

- [x] The theme control is a floating button (2026-09-12). The icon
  beside sign-out in the sidebar was not found in use, and a row on the
  profile tab is not where anyone looks for a theme. Both clients now show
  one round button, bottom-right, that cycles light → dark → system and
  shows the current mode's icon, with the same label naming the current
  and the next mode. On the web it floats on every signed-in page —
  rendered once by `AppShell`, so the login page has none — and the two
  sidebar mounts are gone; the router devtools button moved to the
  top-right corner in development so it does not cover it. On mobile
  `ThemeFab` floats over the dashboard tab only, above the tab bar, inside
  `Screen`'s gutter so it lines up with the cards; the dashboard's scroll
  content gained bottom padding so the last card clears it, and the
  profile tab's Appearance row is removed. No storage or resolution logic
  changed
- [x] Verified: `pnpm lint`, web and mobile `typecheck`, web `build`; in
  the browser as the employee — the login page has no theme button; the
  dashboard, tasks list, a task and the profile page each have exactly one,
  `position: fixed`, round, none inside the sidebar; three presses cycle
  system → light → dark → system with the class, stored value and label
  moving together. Through the mobile web build at 390×844 — the dashboard
  shows one round button 16px from the right edge, in line with the cards
  and clear of the tab bar; three presses cycle the same way, flipping the
  root class, the stored value and the button's own fill; the tasks tab
  and the profile tab have no button, and the profile tab no Appearance
  row. The mobile web build was reached through the user's own Expo
  server, whose API address is a LAN IP this browser cannot reach, so the
  request was redirected to localhost from the page for the check
- [x] Phase 14 closed on 2026-09-12. Left out deliberately, so the next
  reader does not look for them here: the web's grey surfaces are still
  shadcn's zinc-toned `oklch` variables, not the palette's neutral scale —
  they are close, not identical, and unifying them touches every surface
  variable for no functional gain; dashboard charts (product §42's
  "detailed analytics") belong with demo preparation, since the attention
  card and the counts already answer "what needs attention"; tooltips on
  the icon-only buttons, whose `aria-label` and `title` say what they do;
  and a dropdown for the theme control, which the three-state cycle makes
  unnecessary. Mobile list paging, the one thing mobile still does
  differently from the web, is a Phase 15 item (§25)

## Phase 15 — Performance (2026-09-12 → 2026-09-13, complete)

Most of the phase brief was already satisfied by construction when it was
audited against the tree, so it is a review with measurements rather than a
rebuild. What the audit found:

- [x] Routes lazy-load: `autoCodeSplitting: true` in `apps/web/vite.config.ts`
  splits every route into its own chunk
- [x] No N+1 queries: the list services use an explicit `select` with nested
  relation selects and `_count`. Prisma loads each nested relation as one
  `WHERE id IN (…)` statement for the page, so a task list is four statements
  — rows, projects, assignees, count — however many rows the page has (Slice 2
  measured it)
- [x] Indexes: all 21 secondary indexes `db_schema.md` documents are present in
  `schema.prisma`, with no drift in either direction
- [x] Pagination at the API: default 25, ceiling 100, `Paginated<T>` carries
  `totalPages`
- [x] Dashboard: one `$transaction` of eleven counts (seventeen with the org
  section), scoped by the list endpoints' own visibility rules
- [x] Images: the web app ships none; the four mobile PNGs are generated and
  each under 10 KB
- [x] Bundle baseline, `pnpm build` on 2026-09-12: **802 KB raw / 237 KB gzip**
  across all web JS; the largest chunk, `index`, is 297 KB raw / 92 KB gzip.
  Recorded so later changes have something to be compared with

### Slice 1 — paging for the mobile lists

The one unbuilt item, and worse than a performance trade. Every mobile list
fetched one page at `pageSize: 100` and nothing more, while its header read the
server's total — an organisation with 247 tasks saw "247 tasks" above 100 rows
and nothing said the other 147 existed. Silent truncation, not slowness.

- [x] The six directory lists — tasks, projects, notifications, activity,
  people, clients — use `useInfiniteQuery` and load the next page from
  `onEndReached`, at the server's default page size of 25. Pickers, dashboard
  feeds and a project's own task list keep one capped page: `FeedCard` is typed
  to a plain query result, and a picker wants a bounded list
- [x] `apps/mobile/src/lib/paged.ts`: one `infiniteListOptions` factory, so
  `initialPageParam` and `getNextPageParam` are written once; `flattenPages`;
  `pagedTotal`; `pagedCountLabel`; and `loadMore`, which drops a second
  `onEndReached` while a page is on its way and passes `cancelRefetch: false`
  for the one that slips past. Page and page size are omitted from the filters
  type, so a caller cannot put a page number in the key while another goes into
  the URL
- [x] Each `xKeys` object gains `infinite(filters)` under the module's existing
  prefix, so the existing `invalidateQueries({ queryKey: xKeys.all })` calls
  reach the lists with no change to any mutation
- [x] Headers say what is on screen: `25 of 67 tasks`, then `67 tasks` once
  everything has loaded. The inbox keeps its unread count, which never claimed
  to count rows
- [x] `ListFooter`, the app's first list footer: a spinner while the next page
  loads, `ErrorText` if it failed, nothing otherwise. A failed next page used
  to be impossible to reach — `useInfiniteQuery` raises the query-wide
  `isError` for it with the loaded rows intact, and every screen rendered
  `isError` as a full-screen error. The full-screen error is now for a list
  with nothing loaded
- [x] A total order on every paged list query: `id` appended to the `orderBy`
  in the task, project, client, user, activity and notification services.
  Project, client and user names are not unique, and two activity or
  notification rows can share `createdAt`, so `skip`/`take` could put a tied
  row on two pages or none. Project members and departments are not paged and
  were left alone
- [x] Dedupe by id in `flattenPages`, because a total order does not stop a row
  inserted above the loaded window from repeating across a page boundary — the
  normal case for the newest-first activity trail and inbox. Both parts are
  needed; technical architecture §21.1
- [x] The inbox, which the mobile `MutationCache` refreshed after every write.
  As an infinite list that became one request per loaded page, for every tap
  anywhere. It is now marked stale with `refetchType: 'none'` and refetched
  when the tab comes into focus, if stale; marking one read patches the cached
  row (removing it under the Unread chip) and marks the inbox stale again,
  since `setQueryData` would otherwise clear a stale mark left by an earlier
  write. `maxPages` was rejected: it drops the oldest pages, so rows already
  scrolled past would vanish. Technical architecture §26.1
- [x] `rules.test.ts` walks a tie group of five notifications at `pageSize=2`
  and asserts every row appears once, in id-descending order. It fails with the
  notification tiebreaker removed — three runs out of three, on the ordering
  assertion; the disjoint and complete assertions passed even then, so what it
  reproduces is the reordering, not a duplicate. On the four ascending lists a
  tie's incidental order at test sizes matches the fixed one, so the tiebreaker
  there is a correctness fix with no failing test behind it
- [x] Verified: `pnpm lint`, `pnpm typecheck` (8/8), `pnpm test` (22 pass),
  `pnpm build`. Against the running API, every page of all six lists walked
  with no duplicate and no gap (67 tasks, 34 projects, 36 clients, 37 people,
  694 activity rows over 28 pages, 67 notifications), on fixtures inserted for
  the check and removed after, returning every table to its prior count
- [x] Verified in the mobile web build at 390×844 as the admin. Tasks read
  `25 of 67`, then `50 of 67`, then `67 tasks`, with pages 2 and 3 each requested
  once across twelve scroll-to-end events. Projects, people, clients and
  activity page the same way, and a filter chip on each restarts at page 1. With
  clients page 2 made to fail, the 25 loaded rows stayed and the footer read
  "Could not load more. Scroll to retry." as an alert, after the query's two
  retries; scrolling again loaded it. With four activity pages loaded, a row
  inserted at the top made page 5 begin with row 100 again, and the list grew to
  124 rows, not 125, all unique. In the inbox, marking a page-2 row read sent the
  PATCH, the unread count and the dashboard stats and no inbox request, and the
  row turned read in place. Returning 5 seconds after the inbox's last fetch —
  inside its 30-second stale window, so only the write could have made it stale —
  refetched it once; with no write in between, a return seconds later sent
  nothing. Under Unread the row disappeared. Mark all
  read refetched and left "Nothing unread" with no footer. The console recorded
  no React warnings. Not verifiable here: the pull-to-refresh gesture, which
  `RefreshControl` does not implement on the web, and a native device
- [x] Harness notes, so the next browser pass does not chase them. The Expo
  server's API address is a LAN IP this machine cannot reach, so requests were
  rewritten to localhost from inside the page. The embedded browser pauses
  rendering while unobserved, which stops `requestAnimationFrame`, scroll events
  and react-native-web's `onLayout` delivery: a list mounted in that state
  measures no cells and never reaches `onEndReached`. A viewport resize, or
  dispatching the scroll event and cell layouts by hand, resumes it. On a phone
  `onLayout` is native and none of this applies

### Slice 2 — query plans (2026-09-13)

The audit had settled the indexes by inspection; this slice measured them.
The development database had 7 tasks and 758 activity rows, too few for the
planner to prefer any index over a sequential scan, so a plan read against it
said nothing.

- [x] `packages/db/prisma/bench.ts` (`pnpm db:bench`, `--clean`,
  `BENCH_SCALE`): a deterministic bench volume, separate from `db:seed` —
  200 users, 150 clients, 400 projects with 3–8 members, 8 000 tasks,
  60 000 activity rows, 15 000 notifications, spread over two years and across
  statuses. The seeded manager runs one project in eight and the seeded
  employee is on one in ten, holds ~4% of tasks, wrote ~2% of the activity and
  receives ~3% of the notifications, so the scoped plans have real selectivity.
  Every row is marked (`@bench.opsflow.local` emails, a `[bench]` prefix) and
  `--clean` removes them in FK order, returning each table to its prior count.
  Ends with `ANALYZE`. 25 seconds to insert
- [x] `apps/api/scripts/explain.ts` (`pnpm db:explain`): signs in as the
  admin and the employee, drives 26 requests through `app.request()` — every
  list with its filters, page 1 and a deep page, the unread count and the
  dashboard — with `PRISMA_LOG_QUERIES=1` (a new opt-in in
  `packages/db/src/index.ts`) capturing each SQL statement Prisma emits, and
  runs each under `EXPLAIN (ANALYZE, BUFFERS)`. Nothing is copied by hand, so
  the plans are the production queries' plans. The two `requireAuth`
  lookups on every request are filtered out. Output:
  `docs/perf/2026-09-13-query-plans.md`, 155 plans with a summary table. The
  manager sees what the admin sees on every list and was not run separately
- [x] What the plans show. Every page-1 list statement runs in under 2 ms
  and every count under 3 ms, with one family of exceptions. The lists ordered
  by time or due date walk `activity_logs_created_at_idx`,
  `notifications_created_at_idx` and `tasks_due_date_idx` backward or forward
  with an Incremental Sort for the `id` tiebreaker, stopping after 25 rows —
  the tiebreaker costs nothing measurable. The employee-scoped versions use
  the same scan with a filter (331 rows skipped for tasks, 132 for activity,
  13 for notifications); the planner has the `assigned_to` / `user_id`
  indexes as the alternative when a user's share is small, and takes it for
  the counts. `entity_type, entity_id` serves a record's history (17 rows,
  0.14 ms). The employee project scope (`manager_id = ? OR members some`) is a
  hashed subplan over `project_members_user_id_idx`, 0.3 ms. The dashboard's
  seventeen counts total 8.4 ms as the admin and eleven total 4.2 ms as the
  employee, all on index-only scans
- [x] The exceptions. Deep offset pages sort everything before them: task
  page 300 of 8 000 is a 16 ms in-memory quicksort, activity page 1 000 of
  60 000 is 28 ms. Inherent to `skip`, and nobody pages to 1 000 by hand; the
  mobile lists reach it only by scrolling 25 000 rows. And the `q` searches:
  `ILIKE '%…%'` cannot use a B-tree, so their *count* is a sequential scan —
  10 ms over 8 000 tasks, 72 ms over 60 000 activity rows for a term that
  matches a quarter of them. The page itself stays fast because the time
  index stops after 25 matches
- [x] Decision: no index changes. Every candidate from the plan — composite
  `(user_id, created_at, id)` on notifications and activity, `(assigned_to,
  due_date)` on tasks — would replace a filter that skips a few hundred rows
  in a fraction of a millisecond. A `pg_trgm` GIN index was tried on the bench
  database and dropped again: the activity count fell from 72 ms to 21 ms
  (a bitmap over 15 000 matches remains), the task count from 10 ms to 2 ms,
  for 3.7 MB of index on an 8.7 MB table and an extension every environment
  must carry. Recorded under "Known gaps" with the numbers; the trigger is a
  search over roughly 250 000 activity rows or a measured search above 100 ms
- [x] Verified: `pnpm lint`, `pnpm typecheck` (8/8), `pnpm test` (22 pass)
  with the bench rows present — the tests create and remove their own
  fixtures and were unaffected by 60 000 rows around them; `pnpm db:bench
  --clean` removed exactly what was inserted (200 users, 150 clients, 400
  projects, 8 000 tasks, 60 000 activity rows, 15 000 notifications) — the
  32 activity and 4 notification rows the tables gained across the exercise
  are what the test runs and the explain sign-ins wrote, not bench leftovers —
  and the 22 tests pass again afterwards
- [x] Phase 15 closed on 2026-09-13. Technical architecture §21.2 records
  the method; `docs/perf/` holds the plans and is regenerated, not edited

## Phase 16 — Unit tests (2026-09-13)

The API tests and CI were pulled forward earlier (above). This slice adds the
unit layer under the same runner — `bun test` in every package, one `pnpm test`
— and leaves component and flow tests for the next.

- [x] `packages/types/test/*.test.ts`, 215 tests. Every expected table is a
  literal restated in the test, never derived from the export, so a change
  to the matrix has to be made twice on purpose: every role × permission
  (39 rows) against technical architecture §11; every `from → to` pair of
  `TASK_TRANSITIONS` (16) and `PROJECT_TRANSITIONS` (36), with the terminal
  `cancelled`, the `completed → active` reopen and the closed shortcuts
  named; the six list-query schemas walked through one paging helper (the
  defaults, the string coercion, the bounds, `q` trimming, the `'true'`-only
  flags); the auth, client, project and task refinements the forms rely on
  (`changePasswordSchema`'s two paths, the deadline rule on create and
  update, `clientId: ''` refused so the select keeps mapping to `null`).
  `can()` with an unknown role throwing is pinned as current behaviour, not
  a contract — it is why `isRoleName` guards the database boundary
- [x] `apps/web`, 24 tests, with happy-dom registered once from
  `bunfig.toml` (`test/setup.ts`) for the module that reads `window` at
  import. `lib/api.test.ts` mocks `fetch` and covers the envelope unwrap,
  the error envelope with details, `MALFORMED_RESPONSE` for a non-envelope
  body, a network failure propagating untouched, and the `fieldErrorsFrom` /
  `formErrorMessage` branches every form uses. `lib/theme.test.ts` stubs
  `matchMedia` before a dynamic import and covers read, resolve, apply, the
  stored / `system` split, a live OS switch, and storage disabled — which
  found a defect: `setTheme` swallowed the storage error and `sync()` then
  re-read storage, so in private mode the choice was dropped the moment it
  was made, against the module's own comment. It is kept in memory now.
  `useTheme` waits for the component slice and `@testing-library/react`.
  Vite never sees the colocated `*.test.ts` files; the build was grepped
- [x] `apps/mobile`, 25 tests. `paged.ts` imports the API client, which
  imports react-native, and Bun cannot load that outside Metro — so the
  helpers that make offset concatenation correct were untestable. They
  live in `src/lib/paging.ts` now (dedupe by id with first occurrence
  winning, the freshest total, the count label, the guarded `onEndReached`,
  and `nextPageParam` extracted from the query options), with `paged.ts`
  re-exporting them so no screen changed. `toSearchParams` is covered too:
  it is what makes the schemas' `'true'`-only flags right. The rule, in
  `bunfig.toml`: a mobile module under test must not import react-native
- [x] The seeded-credential hazard from Phase 14 is closed. `pnpm db:seed`
  skips a user that already exists, so a password changed by hand stayed
  changed and eight tests failed with bare 401s. `apps/api/test/helpers.ts`
  now holds what both files shared (the accounts, the sign-in request, the
  cookie join) and `assertSeededAccounts`, run in `beforeAll` by each file:
  it names the account that refused `SEED_USER_PASSWORD`, says to set it
  back through `/profile/password` or `pnpm db:reset && pnpm db:seed`, and
  points at an aborted run of the rotation test when the employee is the
  one refused. The API test files are typechecked from here on
- [x] Verified: `pnpm lint`, `pnpm typecheck` (8/8, with Bun's types now
  visible to the web and mobile packages beside `vite/client` and the RN
  typings — no clash), `pnpm test` at the root runs all four packages:
  215 + 24 + 25 + 22 = 286 pass. Negative check of the guard: with the
  admin's credential hash replaced by junk, the API run stops before any
  test with the message naming `admin@opsflow.local` and the fix; restored,
  22 pass. `pnpm --filter @opsflow/web build` contains no test code. A
  bare `bun test` at the repository root also passes all 286: it reads no
  per-package `bunfig.toml`, so the web's DOM setup is a guarded import in
  the test that needs it rather than only a preload — found when the root
  run failed with `window is not defined`

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
- The `q` search filters are `contains` with `mode: 'insensitive'`, which Postgres
  runs as `ILIKE '%q%'` — no B-tree index can serve that. Measured on the Phase 15
  bench volume: the search *page* is fast because the time index stops after 25
  matches, but its *count* is a sequential scan — 10 ms over 8 000 tasks, 72 ms
  over 60 000 activity rows for a common term. A `pg_trgm` GIN index was trialled
  and brought those to 2 ms and 21 ms for 3.7 MB of index and an extension in
  every environment (`CREATE EXTENSION IF NOT EXISTS pg_trgm` at the top of a
  migration). Not added; add it when the activity trail passes roughly 250 000
  rows or a search measures above 100 ms.
- Mobile lists page by offset. A row inserted above what is loaded is absorbed by
  the client dedupe and appears on refresh; a row removed above it shifts the
  next page by one and skips a row until refresh. A cursor would avoid both, at
  the cost of the web's jump-to-page tables sharing the contract.
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

- [x] Phase 15 — Performance (closed 2026-09-13; see above)
- [-] Phase 16 — Testing (API, CI and the unit layer done; component and flow tests
  remain)
- [ ] Phases 17-20 — Security, deployment, demo

## Stack amendments

The stack decisions taken during implementation now live in
[`technical_architecture.md`](technical_architecture.md) §43, alongside the
sections they changed, rather than being tracked separately here. That document
is at v2.5 to reflect them.

---

# 25. Immediate Next Steps

The application is complete through Phase 14: every web module is a full
vertical slice — authentication, RBAC, service layer, Prisma, reads and writes
(§24) — navigation is loader-driven, the dashboard leads with what needs
attention, the mobile app reaches every module the web does, and both
clients read one palette, in light and dark, with the same status colours,
one card, one error line, and a keyboard path through every dialog.

Phase 15 is closed (§24). The mobile lists page as the reader scrolls, and
the queries have been measured rather than inspected: on a bench volume of
8 000 tasks and 60 000 activity rows every list page and every dashboard count
uses an index and answers in low single-digit milliseconds, per role. No index
was added, because none of the plans asked for one; the two costs found —
deep offset pages and the `ILIKE` search counts — are recorded with their
numbers and their trigger under "Known gaps". `pnpm db:bench` and
`pnpm db:explain` regenerate the evidence after any query or schema change.

Next:

```text
1. Phase 16 — Testing
2. Phase 17 — Security review
```

Phase 16 has the API tests, CI, and now the unit layer (§24): the
permission matrix, both state machines and the list-query schemas in
`@opsflow/types`, the web API client and theme store, and the mobile paging
helpers — 286 tests across four packages under one `pnpm test`. The
seeded-credential hazard is closed. What remains is the component and flow
layer: the web forms' local validation path (a ZodError landing on its field
without a request) and the `_authed` guard's redirect, rendered with
`@testing-library/react` under the happy-dom setup already in place — which
is also when `useTheme` gets its test — then one critical flow on each
client. That layer needs providers (Query, Router, the toaster) per test
and is a slice of its own.

Phase 17's checklist already has a start in "Known gaps" above: the login
page's missing deep-link restoration, the six-character password minimum, and
`SameSite` for a cross-site deployment.

CI runs lint, typecheck, the API tests and the build on every push and pull
request, so each commit from here is verified.

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

