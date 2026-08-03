# Task 1 — Users + Roles + Groups

> Foundation for the notification platform: auth, roles, and groups.

**What we’re building overall:** managers/admins send notifications; users in a group receive them.

---

## Goal

1. Login with JWT (any role)
2. Admin manages users
3. Users belong to **many groups**
4. Endpoints to add/remove people from a group

---

## Database

Use **MongoDB** or **PostgreSQL/SQL** — your choice. Stick with one for the workshop. Persist data (not in-memory). Config in `.env`.

---

## Model

### Roles

| Role | Meaning |
| --- | --- |
| `ADMIN` | Full access, manages users |
| `MANAGER` | Manages a group (notifications later) |
| `USER` | Receives notifications |

### Group

Organizational unit (`support`, `sales`, …). Users in the group are notification recipients later.

### User

| Field | Notes |
| --- | --- |
| `id` | id |
| `email` | unique, login |
| `passwordHash` | never return in API |
| `role` | `ADMIN` \| `MANAGER` \| `USER` |
| `groupIds` | many groups (array or join table) |

```text
User *──* Group
```

### Group

| Field | Notes |
| --- | --- |
| `id` | id |
| `name` | string |

A user can be in more than one group, decide the implementation

---

## Endpoints

### Auth

| Method | Path | Who | Notes |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | Public | Returns JWT + user |
| `GET` | `/me` | Any logged-in user | Profile + groups, no password |

Login body: `{ "email", "password" }`  
Header: `Authorization: Bearer <token>`

### Users (admin only)

| Method | Path | Who | Notes |
| --- | --- | --- | --- |
| `GET` | `/users` | `ADMIN` | List users |
| `GET` | `/users/:id` | `ADMIN` | Get one user |
| `POST` | `/users` | `ADMIN` | Create user (email, password, role, optional `groupIds`) |
| `PUT` | `/users/:id` | `ADMIN` | Edit email, role, groups |
| `DELETE` | `/users/:id` | `ADMIN` | Delete user |

### Groups

| Method | Path | Who | Notes |
| --- | --- | --- | --- |
| `GET` | `/groups` | `ADMIN` | List groups — paginated |
| `GET` | `/groups/:id` | `ADMIN` | Get one group |
| `POST` | `/groups` | `ADMIN` | Create group (optional but useful) |
| `POST` | `/groups/:groupId/members` | `ADMIN` | Add user to group. Body: `{ "userId" }` |
| `DELETE` | `/groups/:groupId/members/:userId` | `ADMIN` | Remove user from that group only |
| `GET` | `/groups/:groupId/members` | `ADMIN` | List members — paginated |

A user can be in several groups at once. Adding to a group does **not** remove them from others.

---

## Seed (recommended)

| Email | Role | Groups |
| --- | --- | --- |
| `admin@example.com` | `ADMIN` | `platform` |
| `manager@example.com` | `MANAGER` | `support` |
| `user@example.com` | `USER` | `support`, `sales` |

Password: `Password123!`  
Groups: `platform`, `support`, `sales`
