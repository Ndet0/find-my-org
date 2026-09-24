# OPSflow Database Schema

## Overview

OPSflow uses a relational PostgreSQL database to manage organizational users, departments, clients, projects, tasks, notifications, and system activity.

> **This document follows [`packages/db/prisma/schema.prisma`](../packages/db/prisma/schema.prisma).**
> The Prisma schema is the executable source of truth; this file and
> `db_schema.dbml` are documentation artifacts that describe it. When the two
> disagree, the Prisma schema is correct.

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

Keys and the columns that distinguish each entity are shown below. Full column
lists follow in the per-table sections, and `db_schema.dbml` holds the
complete ERD source for [dbdiagram.io](https://dbdiagram.io).

```mermaid
erDiagram
    roles {
        uuid id PK
        varchar name UK
    }

    departments {
        uuid id PK
        varchar name UK
    }

    users {
        uuid id PK
        varchar email UK
        uuid role_id FK
        uuid department_id FK
        user_status status
    }

    sessions {
        uuid id PK
        text token UK
        uuid user_id FK
        timestamptz expires_at
    }

    accounts {
        uuid id PK
        text issuer UK
        text account_id UK
        uuid user_id FK
        text password
    }

    verifications {
        uuid id PK
        text identifier
        timestamptz expires_at
    }

    rate_limits {
        uuid id PK
        text key UK
        int count
        bigint last_request
    }

    clients {
        uuid id PK
        varchar name
        client_status status
    }

    projects {
        uuid id PK
        varchar name
        uuid client_id FK
        uuid manager_id FK
        project_status status
        priority_level priority
        integer progress
    }

    project_members {
        uuid id PK
        uuid project_id FK
        uuid user_id FK
    }

    tasks {
        uuid id PK
        uuid project_id FK
        uuid assigned_to FK
        uuid created_by FK
        task_status status
        priority_level priority
        date due_date
    }

    activity_logs {
        uuid id PK
        uuid user_id FK
        varchar action
        varchar entity_type
        uuid entity_id
    }

    notifications {
        uuid id PK
        uuid user_id FK
        notification_type type
        boolean is_read
    }

    comments {
        uuid id PK
        uuid task_id FK
        uuid project_id FK
        uuid user_id FK
        text body
    }

    dm_keys {
        uuid user_id PK
        bytea public_key
        bytea wrapped_secret_key
    }

    dm_conversations {
        uuid id PK
        uuid user_a_id FK
        uuid user_b_id FK
        int user_a_unread
        int user_b_unread
    }

    dm_messages {
        uuid id PK
        uuid conversation_id FK
        uuid sender_id FK
        bytea ciphertext
    }

    roles           ||--o{ users           : "grants"
    departments     |o--o{ users           : "groups"
    users           ||--o{ sessions        : "signs in with"
    users           ||--o{ accounts        : "authenticates through"
    clients         |o--o{ projects        : "commissions"
    users           |o--o{ projects        : "manages"
    projects        ||--o{ project_members : "staffed by"
    users           ||--o{ project_members : "member of"
    projects        ||--o{ tasks           : "contains"
    users           |o--o{ tasks           : "assigned"
    users           |o--o{ tasks           : "created"
    users           |o--o{ activity_logs   : "performs"
    users           ||--o{ notifications   : "receives"
    tasks           |o--o{ comments        : "discussed in"
    projects        |o--o{ comments        : "discussed in"
    users           |o--o{ comments        : "writes"
    users           ||--o| dm_keys         : "owns"
    users           ||--o{ dm_conversations : "party to"
    dm_conversations ||--o{ dm_messages    : "carries"
    users           ||--o{ dm_messages     : "sends"
```

`||` marks a required parent and `|o` an optional one, matching the nullability
of each foreign key. A user must have a role but need not have a department; a
project may exist without a client or a manager; and a task outlives both its
assignee and its creator. A comment hangs off exactly one of a task or a
project, which is why both of its parent keys are drawn optional; a CHECK
constraint makes the pair exclusive.

`verifications` has no foreign keys. Better Auth uses it for email and
password-reset tokens, which are keyed by an identifier string rather than a
user id. `rate_limits` has none either: it is Better Auth's request counter,
keyed by client address, shared across API instances through the database.

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

## 2. `departments`

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

## 3. `users`

Stores application users and their organizational information.

This table is **both** the Better Auth user record and the OPSflow employee
profile. There is deliberately no separate profile table and no `auth_id`
column — see [Authentication Architecture](#authentication-architecture).

### Columns


| Column         | Type         | Nullable | Description                          |
| -------------- | ------------ | -------- | ------------------------------------ |
| id             | UUID         | No       | Primary key                          |
| name           | VARCHAR(150) | No       | User's full name                     |
| email          | VARCHAR(255) | No       | Unique email address                 |
| email_verified | BOOLEAN      | No       | Better Auth email verification state |
| image          | TEXT         | Yes      | Better Auth profile image            |
| role_id        | UUID         | No       | Foreign key to roles                 |
| department_id  | UUID         | Yes      | Foreign key to departments           |
| phone          | VARCHAR(30)  | Yes      | Phone number                         |
| position       | VARCHAR(100) | Yes      | Job position                         |
| avatar_url     | TEXT         | Yes      | Profile image                        |
| status         | user_status  | No       | Account status                       |
| joined_at      | DATE         | Yes      | Organization join date               |
| created_at     | TIMESTAMPTZ  | No       | Creation timestamp                   |
| updated_at     | TIMESTAMPTZ  | No       | Last update timestamp                |


`image` and `avatar_url` both exist because the first belongs to Better Auth's
core schema and the second to the OPSflow profile. OPSflow reads `avatar_url`.

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

`role_id` is NOT NULL, so no user can exist before the roles are seeded. New
signups are assigned the least-privileged `employee` role by a Better Auth
create hook.

---

## 4. `sessions`

Owned by Better Auth. One row per active sign-in.

### Columns


| Column     | Type        | Nullable | Description               |
| ---------- | ----------- | -------- | ------------------------- |
| id         | UUID        | No       | Primary key               |
| token      | TEXT        | No       | Unique session token      |
| expires_at | TIMESTAMPTZ | No       | Session expiry            |
| ip_address | TEXT        | Yes      | Client address at sign-in |
| user_agent | TEXT        | Yes      | Client user agent         |
| user_id    | UUID        | No       | Session owner             |
| created_at | TIMESTAMPTZ | No       | Creation timestamp        |
| updated_at | TIMESTAMPTZ | No       | Last update timestamp     |


Deleting a user deletes their sessions.

---

## 5. `accounts`

Owned by Better Auth. Holds the credentials behind a user, one row per
authentication method.

### Columns


| Column                   | Type        | Nullable | Description                       |
| ------------------------ | ----------- | -------- | --------------------------------- |
| id                       | UUID        | No       | Primary key                       |
| issuer                   | TEXT        | No       | Credential issuer                 |
| account_id               | TEXT        | No       | Identifier at the issuer          |
| provider_id              | TEXT        | No       | Better Auth provider name         |
| user_id                  | UUID        | No       | Account owner                     |
| access_token             | TEXT        | Yes      | OAuth access token                |
| refresh_token            | TEXT        | Yes      | OAuth refresh token               |
| id_token                 | TEXT        | Yes      | OAuth ID token                    |
| access_token_expires_at  | TIMESTAMPTZ | Yes      | Access token expiry               |
| refresh_token_expires_at | TIMESTAMPTZ | Yes      | Refresh token expiry              |
| scope                    | TEXT        | Yes      | Granted OAuth scopes              |
| password                 | TEXT        | Yes      | Hashed password for credentials   |
| created_at               | TIMESTAMPTZ | No       | Creation timestamp                |
| updated_at               | TIMESTAMPTZ | No       | Last update timestamp             |


### Constraints

```text
UNIQUE(issuer, account_id)

```

Better Auth 1.7.2 keys accounts on `(issuer, account_id)` rather than
`(provider_id, account_id)`. Email-and-password accounts get the issuer
`local:credential`; for OAuth it is the provider's issuer URL, which is why the
column is unbounded `TEXT` rather than a `VARCHAR`.

**Password hashes live here, not in `users`.** Deleting a user deletes their
accounts.

---

## 6. `verifications`

Owned by Better Auth. Short-lived tokens for email verification and password
resets.

### Columns


| Column     | Type        | Nullable | Description                 |
| ---------- | ----------- | -------- | --------------------------- |
| id         | UUID        | No       | Primary key                 |
| identifier | TEXT        | No       | What the token verifies     |
| value      | TEXT        | No       | Token value                 |
| expires_at | TIMESTAMPTZ | No       | Token expiry                |
| created_at | TIMESTAMPTZ | No       | Creation timestamp          |
| updated_at | TIMESTAMPTZ | No       | Last update timestamp       |


---

## 6a. `rate_limits`

Owned by Better Auth (`rateLimit.storage: 'database'` in `packages/auth`).
One row per client key, counting requests to Better Auth's own endpoints
within the current window. Stored in the database rather than process
memory so the count is shared across API instances. Active in production
only.

### Columns


| Column       | Type   | Nullable | Description                              |
| ------------ | ------ | -------- | ---------------------------------------- |
| id           | UUID   | No       | Primary key                              |
| key          | TEXT   | No       | Client key, unique                       |
| count        | INT    | No       | Requests seen in the window              |
| last_request | BIGINT | No       | Epoch milliseconds of the last request   |


---

## 7. `clients`

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

## 8. `projects`

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

## 9. `project_members`

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

## 10. `tasks`

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

## 11. `activity_logs`

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


An activity record is never updated, so the table has no `updated_at`.

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

## 12. `notifications`

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


`type` has no default: the code that raises a notification always knows which
category it belongs to.

### Example

```text
You were assigned to Project Alpha.

```

---

## 13. `comments`

The discussion thread under a task or a project.

### Columns


| Column     | Type        | Nullable | Description                              |
| ---------- | ----------- | -------- | ---------------------------------------- |
| id         | UUID        | No       | Primary key                              |
| task_id    | UUID        | Yes      | The task discussed, if any               |
| project_id | UUID        | Yes      | The project discussed, if any            |
| user_id    | UUID        | Yes      | Author; null once their account is gone  |
| body       | TEXT        | No       | Comment text, at most 5 000 characters   |
| created_at | TIMESTAMPTZ | No       | Creation timestamp                       |
| updated_at | TIMESTAMPTZ | No       | Last update timestamp                    |


### Constraints

- `comments_one_parent_check`: `num_nonnulls(task_id, project_id) = 1`.
  Exactly one parent is set. Prisma cannot express this, so the constraint
  is written by hand in the migration (`20260922201820_add_comments`) rather
  than generated from the schema; Prisma does not diff CHECK constraints, so
  later migrations leave it alone.

### Relationships

- A comment goes with its task or project (`CASCADE`).
- A comment outlives its author (`SET NULL`); the thread keeps its shape
  and the row reads as "Former user".

Who may read a thread is decided by the parent: a comment is visible when the
task or project is. Posting needs only that visibility; deleting is for the
author, or for any admin or manager. There is no `comments:*` permission for
the same reason there is no row-level permission anywhere else — the matrix
answers "may this role try", the service applies the `where`.

---

## 14. `dm_keys`

One person's messaging identity, for end-to-end encrypted direct messages.
The public half is what others seal messages to; the secret half is stored
only as a blob sealed under the owner's password on their own device
(`packages/crypto`), so the server can back it up but never open it.

### Columns


| Column             | Type        | Nullable | Description                                                    |
| ------------------ | ----------- | -------- | -------------------------------------------------------------- |
| user_id            | UUID        | No       | Primary key and foreign key to `users`; one key per person     |
| public_key         | BYTEA       | No       | X25519 public key, 32 bytes                                    |
| wrapped_secret_key | BYTEA       | No       | The secret key sealed with XChaCha20-Poly1305, 48 bytes        |
| wrap_nonce         | BYTEA       | No       | Nonce for the seal, 24 bytes                                   |
| kdf_salt           | BYTEA       | No       | Salt for the password-derived wrapping key, 16 bytes           |
| kdf_params         | JSONB       | No       | `{ name: "scrypt", n, r, p }`, stored so they can be raised    |
| version            | INTEGER     | No       | Scheme version, 1                                              |
| created_at         | TIMESTAMPTZ | No       | Creation timestamp                                             |
| updated_at         | TIMESTAMPTZ | No       | Last re-wrap, which happens on a password change               |


The public key may not change once set: every message ever sent to this
person was sealed to it. The API refuses a `PUT` that carries a different one
(`DM_KEY_EXISTS`); a re-wrap under a new password keeps it. The first
registration is a plain insert, so two devices signing in at once cannot
each register a different key. Replacing the wrapped half needs the account
password in the request (`currentPassword`, verified against Better Auth's
hash and never stored): the backup is the one copy that lets a new device
in, and a session cookie alone may not overwrite it.

---

## 15. `dm_conversations`

One row per pair of people who have opened a thread.

### Columns


| Column          | Type        | Nullable | Description                                                   |
| --------------- | ----------- | -------- | ------------------------------------------------------------- |
| id              | UUID        | No       | Primary key                                                   |
| user_a_id       | UUID        | No       | The party with the smaller id                                 |
| user_b_id       | UUID        | No       | The party with the larger id                                  |
| user_a_unread   | INTEGER     | No       | Messages from B that A has not opened the thread since        |
| user_b_unread   | INTEGER     | No       | The reverse                                                   |
| last_message_at | TIMESTAMPTZ | Yes      | When the newest message arrived; null until one does          |
| created_at      | TIMESTAMPTZ | No       | Creation timestamp                                            |
| updated_at      | TIMESTAMPTZ | No       | Last update timestamp                                         |


### Constraints

- `(user_a_id, user_b_id)` is unique: one thread per pair.
- `dm_conversations_ordered_pair_check`: `user_a_id < user_b_id`. The pair is
  stored in id order so one row serves both directions and the unique
  constraint finds it whoever asks. Hand-written in the migration
  (`20260923094525_add_direct_messages`), as the comments CHECK is.

The unread counters are kept rather than computed, so the badge on both
clients is one aggregate over the caller's rows. Sending increments the
peer's counter and clears the sender's; opening the thread clears the
reader's.

Who may be paired is decided in the service by `canDirectMessage` in
`@opsflow/types/dm`: an administrator and an employee may not reach each
other in either direction, so the only way to an administrator is through a
manager. There is no `dm:*` permission string, for the same reason there is
none for comments.

---

## 16. `dm_messages`

Ciphertext only. The server stores and forwards; it never holds a key.

### Columns


| Column          | Type        | Nullable | Description                                                  |
| --------------- | ----------- | -------- | ------------------------------------------------------------ |
| id              | UUID        | No       | Primary key, UUIDv7 — the thread is ordered and paged on it  |
| conversation_id | UUID        | No       | The thread                                                   |
| sender_id       | UUID        | No       | Who sealed it; bound into the ciphertext as associated data  |
| ciphertext      | BYTEA       | No       | XChaCha20-Poly1305 output, at most 5 000 characters of text  |
| nonce           | BYTEA       | No       | 24 bytes, fresh per message                                  |
| version         | INTEGER     | No       | Scheme version, 1                                            |
| created_at      | TIMESTAMPTZ | No       | Creation timestamp                                           |


The conversation id and the sender id are bound into every seal, so a
message copied into another thread, or re-attributed to the other party,
fails to open. There is no editing and no deletion in the first version.

### Indexes

- `(conversation_id, id)`: the hot query — one thread, newest first, before
  a cursor id.
- `(sender_id)`: for the cascade when a user is deleted, as on every other
  user foreign key (`20260923150000_index_dm_message_sender`).

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
message

```

---

# Relationship Summary


| Relationship              | Type         |
| ------------------------- | ------------ |
| Role → Users              | One-to-Many  |
| Department → Users        | One-to-Many  |
| User → Sessions           | One-to-Many  |
| User → Accounts           | One-to-Many  |
| Client → Projects         | One-to-Many  |
| User → Projects (manager) | One-to-Many  |
| User ↔ Projects           | Many-to-Many |
| Project → Tasks           | One-to-Many  |
| User → Tasks              | One-to-Many  |
| User → Activity Logs      | One-to-Many  |
| User → Notifications      | One-to-Many  |
| Task → Comments           | One-to-Many  |
| Project → Comments        | One-to-Many  |
| User → Comments           | One-to-Many  |
| User → DM Key             | One-to-One   |
| User ↔ DM Conversations   | Many-to-Many |
| DM Conversation → Messages | One-to-Many |
| User → DM Messages        | One-to-Many  |


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
Comments deleted (the project's, and each task's)

Task deleted
       ↓
Comments deleted

User deleted
       ↓
Sessions deleted
Accounts deleted
Notifications deleted
Project Memberships deleted
Messaging key deleted
Direct-message conversations deleted (and their messages)

```

### `SET NULL`

Used when historical data should remain available.

```text
User deleted
       ↓
Activity Log remains        (activity_logs.user_id = NULL)
Comments remain             (comments.user_id = NULL, shown as "Former user")
Projects remain             (projects.manager_id = NULL)
Tasks remain                (tasks.assigned_to / created_by = NULL)

Client deleted
       ↓
Projects remain             (projects.client_id = NULL)

Department deleted
       ↓
Users remain                (users.department_id = NULL)

```

These rules are what the schema guarantees; the application reaches fewer of
them. Users, clients and projects are never deleted through the API (they
change status, or a project is cancelled), and a department delete is
refused with `DEPARTMENT_HAS_MEMBERS` while anyone is in it, so the
`SET NULL` on `users.department_id` is never taken through the app. The
rules stay so that a direct database operation cannot leave orphans.

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

### Unique constraints

- `roles.name`
- `departments.name`
- `users.email`
- `sessions.token`
- `accounts.issuer + account_id`
- `rate_limits.key`
- `project_members.project_id + user_id`

### Secondary indexes

- `users.role_id`
- `users.department_id`
- `users.status`
- `sessions.user_id`
- `accounts.user_id`
- `verifications.identifier`
- `clients.status`
- `projects.client_id`
- `projects.manager_id`
- `projects.status`
- `projects.deadline`
- `project_members.user_id`
- `tasks.project_id`
- `tasks.assigned_to`
- `tasks.status`
- `tasks.due_date`
- `activity_logs.user_id`
- `activity_logs.entity_type + entity_id`
- `activity_logs.created_at`
- `notifications.user_id + is_read`
- `notifications.created_at`
- `comments.task_id + created_at`
- `comments.project_id + created_at`
- `comments.user_id`
- `dm_conversations.user_b_id` (the unique `(user_a_id, user_b_id)` serves `user_a_id`)
- `dm_conversations.last_message_at`
- `dm_messages.conversation_id + id`

Seven of these are composites rather than the separate indexes a first pass
might suggest:

- `project_members` needs no standalone `project_id` index. The
  `(project_id, user_id)` unique constraint is a B-tree with `project_id` as its
  leading column, so it already serves lookups by project.
- `notifications` uses `(user_id, is_read)` rather than two single-column
  indexes, because the hot query is always "unread notifications for one user".
- `activity_logs (entity_type, entity_id)` serves the per-entity filter of the
  activity feed; neither column is useful alone.
- `accounts (issuer, account_id)` is the unique key Better Auth looks an
  account up by.
- `comments (task_id, created_at)` and `(project_id, created_at)` each walk one
  thread in posting order and stop after a page, which is the only way a
  thread is read.
- `dm_messages (conversation_id, id)` walks one thread newest first from a
  cursor id, which is the only way a thread is read; ids are UUIDv7, so the
  index is in time order.

The purpose is to keep common dashboard, filtering, and lookup queries performant as the database grows.

This list was measured, not only reasoned about. On a bench volume of 8 000
tasks, 60 000 activity rows and 15 000 notifications (`pnpm db:bench`), every
list endpoint and dashboard count that existed on 2026-09-13 runs on one of
these indexes for every role (`pnpm db:explain`; technical architecture
§21.2). The comment threads (2026-09-22) and direct messages (2026-09-23) are not
yet in the bench or the explain script; their composite indexes are reasoned,
not measured. The composites a first pass
might add for the time-ordered lists — `(user_id, created_at, id)` on
`notifications` and `activity_logs`, `(assigned_to, due_date)` on `tasks` —
were considered and declined: the single-column time index already walks the
list in order and stops after one page, and the per-user index serves the
count. A trigram index for the `ILIKE` searches was trialled and declined at
this volume; the numbers are in the sprint plan's known gaps.

---

# Dashboard Data Sources

The dashboard does not require its own database table in the MVP.

Instead, dashboard metrics are derived from existing entities. The queries
below are illustrative; the real ones in `dashboard.service.ts` add the
caller's visibility scope (an employee's project and task counts are their
own), and also count overdue projects, blocked tasks, departments and the
users holding the employee role.

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

OPSflow uses **Better Auth**, which writes into this PostgreSQL database
directly rather than delegating to an external identity provider.

```text
Better Auth
      │
      ├── users          ← also the OPSflow employee profile
      ├── sessions
      ├── accounts       ← password hashes live here
      ├── verifications
      └── rate_limits    ← request counter, production only
```

An earlier revision of this document assumed an external provider such as
Supabase Auth, reached through a `users.auth_id` column. That indirection was
dropped: Better Auth owns tables in our own database, so a second user record to
point at would be dead weight. `users` therefore carries both the authentication
identity and the OPSflow profile — role, department, position, status — and
there is no `auth_id` column.

Better Auth handles:

- Credentials
- Password hashing
- Sessions
- Verification tokens

OPSflow handles:

- Roles
- Departments
- Business permissions
- User profiles
- Application data

### Passwords

Passwords are never stored in `users`. Better Auth hashes them and writes them
to `accounts.password`, one row per credential, keyed by
`(issuer, account_id)` with the issuer `local:credential`.

### Primary keys

Better Auth generates its own ids by default, and its format is not a UUID.
Because these columns are typed `uuid`, `packages/auth` sets:

```ts
advanced: { database: { generateId: false } }
```

which hands id generation to Prisma's `@default(uuid(7))` and keeps the auth
tables on the same UUIDv7 scheme as the rest of the schema. Ids are therefore
generated by the application, not by a database default.

### Schema ownership

**Better Auth owns `users`, `sessions`, `accounts`, `verifications` and
`rate_limits`,** and it
has changed their shape between minor versions. The `accounts.issuer` column and
the move of the unique key from `(provider_id, account_id)` to
`(issuer, account_id)` were both required by the 1.7.2 upgrade.

After upgrading Better Auth, regenerate its expected schema and diff it against
Prisma:

```bash
pnpm dlx auth@latest generate --config packages/auth/src/index.ts
```

---

# Future Schema Extensions

The schema is intentionally designed to allow future expansion.

Potential additions include:

```text
documents
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
comments
dm_keys
dm_conversations
dm_messages

```

plus the four tables Better Auth requires alongside `users`:

```text
sessions
accounts
verifications
rate_limits

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
- Discussion threads on projects and tasks
- End-to-end encrypted direct messages
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
        ├── COMMENTS
        │
        └── TASKS
              │
              ├── ASSIGNEE
              │
              └── COMMENTS

```

Around that core relationship, OPSflow adds:

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

This provides a strong foundation for the OPSflow MVP while leaving room for future product expansion.
