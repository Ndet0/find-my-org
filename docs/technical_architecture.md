# OPSflow — Technical Architecture

**Version:** 2.0  
**Status:** Proposed  
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
       React + Vite                  React Native
             │                             │
       TanStack Router                    │
             │                            Uniwind
       TanStack Forms                     │
             │                             │
       Tailwind + shadcn                  │
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
- TanStack Form
- TanStack Virtual
- Tailwind CSS
- shadcn/ui

---

# 6. Mobile Application

Location:

```text
apps/mobile/

```

The mobile application provides access to essential OPSflow functionality from mobile devices.

### Technology

- React Native
- TypeScript
- Uniwind
- Shared authentication
- Shared API
- Shared types

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
Reports     → Read
System      → Manage

```

### Manager

```text
Clients  → CRUD
Projects → CRUD
Tasks    → CRUD
Users    → Read
Reports  → Read

```

### Employee

```text
Projects → Assigned projects
Tasks    → Assigned tasks
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

The previous:

```text
database/schema.sql

```

is not required as a duplicate database definition.

---

# 13. Prisma Architecture

Database package:

```text
packages/db/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
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
        └── Human-readable documentation

docs/db_schema.dbml
        │
        └── ERD source

docs/opsflow.svg
        │
        └── Visual database diagram

```

The Prisma schema is authoritative.

The DBML and SVG are documentation artifacts.

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

The UI package contains reusable design-system components.

Examples:

```text
Button
Input
Modal
Dialog
Card
Badge
Table
Dropdown
Sidebar
Tabs
Toast
Avatar
Pagination

```

The goal is to establish a consistent OPSflow visual language.

Web-specific components can use:

```text
Tailwind CSS
shadcn/ui

```

React Native-specific styling can use:

```text
Uniwind

```

Shared design principles should remain consistent across platforms.

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

---

# 20. Forms

OPSflow uses **TanStack Form** for complex forms.

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

OPSflow uses **TanStack Virtual** where large datasets could affect performance.

Potential use cases:

```text
Employee directory
Task lists
Activity logs
Project lists
Notifications

```

Instead of rendering thousands of records simultaneously:

```text
10,000 records
       │
       ▼
TanStack Virtual
       │
       ▼
Only visible records rendered

```

This allows the UI to remain responsive as datasets grow.

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
   Uniwind

```

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

Potential configuration:

```text
DATABASE_URL
BETTER_AUTH_SECRET
API_URL
WEB_URL
MOBILE_API_URL

```

An `.env.example` file should document required variables without exposing secrets.

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
│   ├── opsflow.svg
│   ├── product_architecture.md
│   ├── sprint.md
│   └── technical_architecture.md
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── biome.json
└── tsconfig.json

```

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

Advanced technologies such as TanStack Start, Polar, and extensive virtualization should be introduced when they solve actual problems rather than simply being added for the sake of the stack.

---

# 41. Technology Stack Summary


| Layer                   | Technology       |
| ----------------------- | ---------------- |
| Language                | TypeScript       |
| Runtime                 | Bun              |
| Package Manager         | pnpm             |
| Monorepo                | Turborepo        |
| Web                     | React            |
| Web Build               | Vite             |
| Routing                 | TanStack Router  |
| Full-stack capabilities | TanStack Start   |
| Forms                   | TanStack Form    |
| Virtualization          | TanStack Virtual |
| Styling                 | Tailwind CSS     |
| Web UI                  | shadcn/ui        |
| Mobile                  | React Native     |
| Mobile Styling          | Uniwind          |
| Backend                 | Hono             |
| ORM                     | Prisma           |
| Database                | PostgreSQL       |
| Authentication          | Better Auth      |
| Formatting/Linting      | Biome            |
| Type System             | TypeScript       |
| Billing                 | Polar            |
| API Clients             | Web + Mobile     |
| Architecture            | Monorepo         |


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
UI components

```

This architecture allows OPSflow to demonstrate not only CRUD implementation, but also **authentication, authorization, responsive UI/UX, mobile development, database design, API architecture, reusable packages, performance considerations, and modern TypeScript engineering practices.**

