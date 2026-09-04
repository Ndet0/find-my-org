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

- Evaluate large tables
- Implement virtualization where necessary
- Test performance with large datasets

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

**Last verified:** 2026-09-04 — against the working tree, not from memory.

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
- [-] `packages/types` — response envelope, `Paginated<T>`, permission matrix,
  `CurrentUser`, user, department, client, project and task shapes, plus the matching
  Zod schemas. Exposed as subpath exports (`/api`, `/auth`, `/permissions`, `/user`,
  `/department`, `/client`, `/project`, `/task`) and extended per module as the
  remaining ones land
- [ ] `packages/ui` — design tokens

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
- [ ] Mobile authentication — blocked on `apps/mobile`

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
- [x] Domain routes — `/users`, `/departments`, `/clients`, `/projects` and
  `/tasks` are complete

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
(`assignedTo` is the caller).

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
- `turbo.json` sets `globalDependencies` to a root `tsconfig.base.json` that does
  not exist — the shared configs live in `packages/config`. Harmless today, but the
  cache will not invalidate when they change.
- Password minimum is 6 characters (`PASSWORD_MIN_LENGTH` in `@opsflow/types/auth`),
  a demo concession. Raise it before production; it is the same bound Better Auth
  and the create form share, so they cannot drift.
- There is no password reset or change-your-own-password. Email notifications are
  post-MVP (§23); an admin can set a new person up with a fresh initial password
  but cannot rotate an existing one from the UI.
- The last-admin guard in the user service is unreachable with the current matrix:
  only admins have `users:write`, and they cannot change their own role or status.
  The self-modification rule is what actually stops the last admin locking the
  organisation out. The last-admin check stays so a future permission change
  cannot create that hole.

## Not started

- [ ] Phase 10 — Activity & Notifications
- [ ] Phase 11 — Dashboard
- [ ] Phase 12 — TanStack Optimization
- [ ] Phase 13 — Mobile Application
- [ ] Phases 14-20 — Polish, performance, testing, security, deployment, demo

## Stack amendments

The stack decisions taken during implementation now live in
[`technical_architecture.md`](technical_architecture.md) §43, alongside the
sections they changed, rather than being tracked separately here. That document
was updated to v2.1 to reflect them.

---

# 25. Immediate Next Steps

Users, Departments, Clients, Projects and Tasks are complete vertical slices:
authentication, RBAC, service layer, Prisma, and both reads and writes on the
web (§24). Tasks added assignment, due dates, and employee row scoping on
`assignedTo`.

The same pipeline, without inventing a new one:

```text
1. Phase 10 — Activity & Notifications
```

Activity logs and notifications record the mutations the earlier modules already
perform. Do not begin mobile or the dashboard until those events exist.

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

