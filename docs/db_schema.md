# OpsFlow Database Schema

## Overview

OpsFlow uses a relational PostgreSQL database to manage organizational users, departments, clients, projects, tasks, notifications, and system activity.

The database is designed around the following principles:

- Strong relational integrity
- UUID primary keys
- Explicit foreign-key relationships
- Role-based access control
- Auditability
- Query performance through indexes
- Extensibility for future features

---

# Entity Overview

```text
                         ┌─────────────┐
                         │    ROLES    │
                         └──────┬──────┘
                                │
                                │
                         ┌──────▼──────┐
                         │    USERS    │
                         └──────┬──────┘
                                │
                ┌───────────────┼────────────────┐
                │               │                │
                ▼               ▼                ▼
         DEPARTMENTS       PROJECTS        NOTIFICATIONS
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
           CLIENTS       PROJECT_MEMBERS       TASKS
                                │                 │
                                │                 │
                                └────── USERS ────┘

                         USERS
                           │
                           ▼
                    ACTIVITY_LOGS

```

---

# Tables

## 1. `roles`

Defines the access level of each user.

### Columns


| Column      | Type        | Nullable | Description           |
| ----------- | ----------- | -------- | --------------------- |
| id          | UUID        | No       | Primary key           |
| name        | VARCHAR(50) | No       | Role name             |
| description | TEXT        | Yes      | Role description      |
| created_at  | TIMESTAMPTZ | No       | Creation timestamp    |
| updated_at  | TIMESTAMPTZ | No       | Last update timestamp |


### Supported Roles

- `admin`
- `manager`
- `employee`

---

# 2. `departments`

Represents organizational departments.

### Columns


| Column      | Type         | Nullable | Description            |
| ----------- | ------------ | -------- | ---------------------- |
| id          | UUID         | No       | Primary key            |
| name        | VARCHAR(100) | No       | Department name        |
| description | TEXT         | Yes      | Department description |
| created_at  | TIMESTAMPTZ  | No       | Creation timestamp     |
| updated_at  | TIMESTAMPTZ  | No       | Last update timestamp  |


### Example Departments

- Management
- Engineering
- Design
- Operations
- Finance

---

# 3. `users`

Stores application users and their organizational information.

### Columns


| Column        | Type         | Nullable | Description                         |
| ------------- | ------------ | -------- | ----------------------------------- |
| id            | UUID         | No       | Primary key                         |
| name          | VARCHAR(150) | No       | User's full name                    |
| email         | VARCHAR(255) | No       | Unique email address                |
| auth_id       | UUID         | Yes      | External authentication provider ID |
| role_id       | UUID         | No       | Foreign key to roles                |
| department_id | UUID         | Yes      | Foreign key to departments          |
| phone         | VARCHAR(30)  | Yes      | Phone number                        |
| position      | VARCHAR(100) | Yes      | Job position                        |
| avatar_url    | TEXT         | Yes      | Profile image                       |
| status        | user_status  | No       | Account status                      |
| joined_at     | DATE         | Yes      | Organization join date              |
| created_at    | TIMESTAMPTZ  | No       | Creation timestamp                  |
| updated_at    | TIMESTAMPTZ  | No       | Last update timestamp               |


### Relationships

```text
users.role_id
    ↓
roles.id

users.department_id
    ↓
departments.id

```

A user belongs to one role and may belong to one department.

---

# 4. `clients`

Stores customers or organizations that the company works with.

### Columns


| Column     | Type          | Nullable | Description           |
| ---------- | ------------- | -------- | --------------------- |
| id         | UUID          | No       | Primary key           |
| name       | VARCHAR(150)  | No       | Contact/client name   |
| company    | VARCHAR(200)  | Yes      | Company name          |
| email      | VARCHAR(255)  | Yes      | Contact email         |
| phone      | VARCHAR(30)   | Yes      | Contact phone         |
| address    | TEXT          | Yes      | Client address        |
| status     | client_status | No       | Client status         |
| notes      | TEXT          | Yes      | Internal notes        |
| created_at | TIMESTAMPTZ   | No       | Creation timestamp    |
| updated_at | TIMESTAMPTZ   | No       | Last update timestamp |


### Relationship

```text
clients
   │
   └──< projects

```

One client can have multiple projects.

---

# 5. `projects`

Projects represent major units of business work.

### Columns


| Column      | Type           | Nullable | Description           |
| ----------- | -------------- | -------- | --------------------- |
| id          | UUID           | No       | Primary key           |
| name        | VARCHAR(200)   | No       | Project name          |
| description | TEXT           | Yes      | Project description   |
| client_id   | UUID           | Yes      | Project client        |
| manager_id  | UUID           | Yes      | Project manager       |
| status      | project_status | No       | Project state         |
| priority    | priority_level | No       | Project priority      |
| progress    | INTEGER        | No       | Completion percentage |
| start_date  | DATE           | Yes      | Project start date    |
| deadline    | DATE           | Yes      | Project deadline      |
| created_at  | TIMESTAMPTZ    | No       | Creation timestamp    |
| updated_at  | TIMESTAMPTZ    | No       | Last update timestamp |


### Relationships

```text
projects.client_id
        ↓
    clients.id

projects.manager_id
        ↓
     users.id

```

A project belongs to a client and can have a manager.

---

# 6. `project_members`

Connects users with projects.

This table implements the many-to-many relationship between users and projects.

```text
Users                         Projects

User A ───────────────┐
                      │
User B ───────────────┼──── Project 1
                      │
User C ───────────────┘

User A ───────────────────── Project 2

```

### Columns


| Column     | Type        | Nullable | Description           |
| ---------- | ----------- | -------- | --------------------- |
| id         | UUID        | No       | Primary key           |
| project_id | UUID        | No       | Project foreign key   |
| user_id    | UUID        | No       | User foreign key      |
| joined_at  | TIMESTAMPTZ | No       | Date added to project |


### Constraints

A user cannot be added to the same project twice.

```text
UNIQUE(project_id, user_id)

```

---

# 7. `tasks`

Tasks represent individual units of work within projects.

### Columns


| Column       | Type           | Nullable | Description           |
| ------------ | -------------- | -------- | --------------------- |
| id           | UUID           | No       | Primary key           |
| project_id   | UUID           | No       | Parent project        |
| assigned_to  | UUID           | Yes      | Assigned employee     |
| created_by   | UUID           | Yes      | User who created task |
| title        | VARCHAR(200)   | No       | Task title            |
| description  | TEXT           | Yes      | Task details          |
| status       | task_status    | No       | Current task state    |
| priority     | priority_level | No       | Task priority         |
| due_date     | DATE           | Yes      | Task deadline         |
| completed_at | TIMESTAMPTZ    | Yes      | Completion timestamp  |
| created_at   | TIMESTAMPTZ    | No       | Creation timestamp    |
| updated_at   | TIMESTAMPTZ    | No       | Last update timestamp |


### Relationships

```text
tasks.project_id
       ↓
projects.id

tasks.assigned_to
       ↓
users.id

tasks.created_by
       ↓
users.id

```

Every task belongs to a project.

A task may be assigned to a user.

---

# 8. `activity_logs`

Records important actions performed within the system.

### Columns


| Column      | Type         | Nullable | Description                |
| ----------- | ------------ | -------- | -------------------------- |
| id          | UUID         | No       | Primary key                |
| user_id     | UUID         | Yes      | User who performed action  |
| action      | VARCHAR(100) | No       | Action performed           |
| entity_type | VARCHAR(50)  | No       | Type of affected entity    |
| entity_id   | UUID         | Yes      | ID of affected entity      |
| description | TEXT         | Yes      | Human-readable description |
| metadata    | JSONB        | Yes      | Additional structured data |
| created_at  | TIMESTAMPTZ  | No       | Activity timestamp         |


### Example

```json
{
  "old_status": "in_progress",
  "new_status": "completed"
}

```

### Example Activity

```text
User:
John Kamau

Action:
updated

Entity:
task

Description:
John completed "API Integration"

Metadata:
{
  "old_status": "in_progress",
  "new_status": "completed"
}

```

---

# 9. `notifications`

Stores user notifications.

### Columns


| Column     | Type              | Nullable | Description            |
| ---------- | ----------------- | -------- | ---------------------- |
| id         | UUID              | No       | Primary key            |
| user_id    | UUID              | No       | Notification recipient |
| title      | VARCHAR(200)      | No       | Notification title     |
| message    | TEXT              | No       | Notification content   |
| type       | notification_type | No       | Notification category  |
| is_read    | BOOLEAN           | No       | Read state             |
| created_at | TIMESTAMPTZ       | No       | Creation timestamp     |


### Example

```text
You were assigned to Project Alpha.

```

---

# Enumerations

## User Status

```text
active
inactive
suspended

```

## Client Status

```text
active
inactive
archived

```

## Project Status

```text
planning
active
on_hold
completed
delayed
cancelled

```

## Task Status

```text
pending
in_progress
blocked
completed

```

## Priority

```text
low
medium
high
critical

```

## Notification Type

```text
task
project
user
system

```

---

# Relationship Summary


| Relationship              | Type         |
| ------------------------- | ------------ |
| Role → Users              | One-to-Many  |
| Department → Users        | One-to-Many  |
| Client → Projects         | One-to-Many  |
| User → Projects (manager) | One-to-Many  |
| User ↔ Projects           | Many-to-Many |
| Project → Tasks           | One-to-Many  |
| User → Tasks              | One-to-Many  |
| User → Activity Logs      | One-to-Many  |
| User → Notifications      | One-to-Many  |


---

# Delete Behaviour

The database uses deliberate foreign-key deletion strategies.

### `CASCADE`

Used when the child record should not exist without the parent.

Example:

```text
Project deleted
       ↓
Project Members deleted
Tasks deleted

```

### `SET NULL`

Used when historical data should remain available.

Example:

```text
User deleted
       ↓
Activity Log remains
       ↓
user_id = NULL

```

### `RESTRICT`

Used when deleting a record could compromise system integrity.

Example:

```text
Role
 ↓
Users

Cannot delete a role that is currently assigned.

```

---

# Indexing Strategy

Indexes are created on frequently queried fields.

Important indexes include:

- `users.role_id`
- `users.department_id`
- `users.status`
- `projects.client_id`
- `projects.manager_id`
- `projects.status`
- `projects.deadline`
- `project_members.project_id`
- `project_members.user_id`
- `tasks.project_id`
- `tasks.assigned_to`
- `tasks.status`
- `tasks.due_date`
- `activity_logs.user_id`
- `activity_logs.entity_type + entity_id`
- `activity_logs.created_at`
- `notifications.user_id`
- `notifications.is_read`

The purpose is to keep common dashboard, filtering, and lookup queries performant as the database grows.

---

# Dashboard Data Sources

The dashboard does not require its own database table in the MVP.

Instead, dashboard metrics are derived from existing entities.

### Example

**Active Projects**

```sql
SELECT COUNT(*)
FROM projects
WHERE status = 'active';

```

**Completed Tasks**

```sql
SELECT COUNT(*)
FROM tasks
WHERE status = 'completed';

```

**Active Employees**

```sql
SELECT COUNT(*)
FROM users
WHERE status = 'active';

```

**Overdue Tasks**

```sql
SELECT COUNT(*)
FROM tasks
WHERE due_date < CURRENT_DATE
AND status != 'completed';

```

This keeps the database normalized and avoids duplicating information.

---

# Authentication Architecture

OpsFlow should separate authentication from application user data.

If Supabase Auth is used:

```text
Supabase Auth
      │
      │ auth_id
      ↓
OpsFlow users
      │
      ├── role
      ├── department
      └── profile

```

The authentication provider handles:

- Credentials
- Passwords
- Sessions
- Authentication tokens

OpsFlow handles:

- Roles
- Departments
- Business permissions
- User profiles
- Application data

Passwords should never be stored directly in the `users` table when an external authentication provider is used.

---

# Future Schema Extensions

The schema is intentionally designed to allow future expansion.

Potential additions include:

```text
documents
comments
timesheets
expenses
invoices
reports
project_milestones
teams
custom_roles
permissions
organizations

```

For example, multi-tenant support could eventually introduce:

```text
organizations
      │
      ├── users
      ├── clients
      ├── projects
      └── departments

```

This should not be implemented in the MVP unless multi-organization support becomes an explicit requirement.

---

# MVP Database Scope

The first release should focus on:

```text
roles
departments
users
clients
projects
project_members
tasks
activity_logs
notifications

```

This is enough to demonstrate:

- Authentication
- Authorization
- CRUD
- Relational database design
- Many-to-many relationships
- Dashboard analytics
- Audit logging
- Notifications
- Business workflows

---

# Design Principle

The database should support the product's workflow rather than simply mirror the UI.

The core business relationship is:

```text
CLIENT
  │
  └── PROJECT
        │
        ├── MANAGER
        │
        ├── TEAM MEMBERS
        │
        └── TASKS
              │
              └── ASSIGNEE

```

Around that core relationship, OpsFlow adds:

```text
AUTHENTICATION
      +
ROLE-BASED ACCESS
      +
ACTIVITY TRACKING
      +
NOTIFICATIONS
      +
DASHBOARD ANALYTICS

```

This provides a strong foundation for the OpsFlow MVP while leaving room for future product expansion.