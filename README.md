<div align="center">

<br/>

```
  ██████╗ ██████╗ ██████╗ ██╗████████╗
 ██╔═══██╗██╔══██╗██╔══██╗██║╚══██╔══╝
 ██║   ██║██████╔╝██████╔╝██║   ██║
 ██║   ██║██╔══██╗██╔══██╗██║   ██║
 ╚██████╔╝██║  ██║██████╔╝██║   ██║
  ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚═╝   ╚═╝
```

**Multi-tenant SaaS for teams who ship things.**

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io)
[![License](https://img.shields.io/badge/license-Private-red?style=flat-square)](#)

<br/>

[Features](#-features) · [Architecture](#-architecture) · [Getting Started](#-getting-started) · [API Docs](#-api-reference) · [Roles](#-roles--permissions)

<br/>

</div>

---

Orbit is a **multi-tenant project management platform** where each organization gets a fully isolated workspace — kanban boards, real-time collaboration, threaded comments, analytics, and fine-grained role-based access, all in one place.

Built as an npm workspaces monorepo with **Next.js** on the front, **Express + Prisma** on the back, and **Socket.io** keeping everyone in sync.

---

## ✨ Features

### 🔐 Auth & Tenancy
- Organization registration with unique slug
- JWT access tokens + httpOnly refresh cookie rotation
- Email verification, forgot/reset password
- **Triple-layer tenant isolation** — JWT claims → AsyncLocalStorage context → Prisma extension
- Platform admin: suspend / unsuspend organizations

### 🏢 Organization & Team
- Org settings: name, logo, timezone, currency, theme
- Team invitations with role pre-assignment
- Five RBAC roles with granular, server-enforced permissions
- User profiles with avatar, bio, and password management

### 📋 Projects & Tasks
- Full project CRUD with per-project member management
- Project statuses: `Planning` · `Active` · `On Hold` · `Completed` · `Archived`
- **Kanban board** with drag-and-drop (`@dnd-kit`)
- Tasks with assignee, due date, priority, and column position
- Task statuses: `To Do` · `In Progress` · `Review` · `Done`

### 💬 Collaboration
- Threaded task comments with **@mentions**
- File attachments on comments
- Activity logs with live timelines
- In-app notifications (assignments, completions, invites) with bell icon

### ⚡ Real-Time
- Socket.io live task updates and notifications
- Rooms scoped by org, project, and user — **tenants never cross streams**

### 📊 Analytics & Calendar
- Dashboard charts (Recharts): project health, task breakdown, completion rate
- Calendar view (`react-big-calendar`) for deadlines and due dates

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js App :3000                     │
│              REST (Bearer JWT) + WebSocket               │
└───────────────────┬─────────────────────┬───────────────┘
                    │                     │
          ┌─────────▼──────────┐  ┌───────▼──────┐
          │   Express API :4000 │  │  Socket.io   │
          │  ┌──────────────┐  │  └──────┬───────┘
          │  │ Auth + CSRF  │  │         │
          │  ├──────────────┤  │         │
          │  │   Tenant MW  │  │         │
          │  ├──────────────┤  │         │
          │  │ RBAC Guards  │  │         │
          │  ├──────────────┤  │         │
          │  │   Services   │  │         │
          │  └──────┬───────┘  │         │
          └─────────┼──────────┘         │
                    │                    │
          ┌─────────▼────────────────────▼──┐
          │           PostgreSQL             │
          │         (via Prisma 6)           │
          └─────────────────────────────────┘
```

### Tenant isolation — three layers deep

| Layer | Mechanism |
|-------|-----------|
| **1. JWT** | Access token embeds `organizationId` + `userId` |
| **2. AsyncLocalStorage** | Tenant context bound per request lifecycle |
| **3. Prisma extension** | Auto-injects `organizationId` on every tenant-scoped query |

Pre-auth flows and platform admin routes use raw Prisma with explicit scoping.

---

## 📁 Project Structure

```
.
├── apps/
│   ├── api/                    # Express REST + Socket.io
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── src/
│   │       ├── routes/         # Route handlers
│   │       ├── services/       # Business logic
│   │       ├── middleware/     # Auth, tenant, RBAC, CSRF, rate limit
│   │       ├── validators/     # Zod schemas
│   │       └── lib/            # Prisma, socket, permissions, sanitize
│   └── web/                    # Next.js frontend
│       └── src/
│           ├── app/            # App Router pages
│           ├── components/     # UI, kanban, charts, notifications
│           ├── hooks/          # useAuth, useSocket
│           └── lib/            # API client, roles, CSRF
├── docs/
│   └── API.md
└── package.json                # npm workspaces root
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ (22 recommended)
- **PostgreSQL** 14+
- **npm** 9+

### 1 · Clone and install

```bash
git clone https://github.com/faruqer/Team-Project-Management
cd Team-Project-Management-Multi-Tenant-SaaS
npm install
```

### 2 · Configure environment

```bash
cp .env.example .env
# Edit .env with your values (see Environment Variables below)
```

### 3 · Create the database

```bash
createdb orbit
```

### 4 · Run migrations

```bash
npm run db:generate
npm run db:migrate
```

### 5 · Start dev servers

```bash
npm run dev
```

| Service | URL |
|---------|-----|
| Web app | http://localhost:3000 |
| API | http://localhost:4000 |
| Health | http://localhost:4000/health |

### 6 · Register your workspace

1. Open http://localhost:3000/register
2. Create an organization and admin account
3. Log in with your **org slug**, email, and password

---

## 🔧 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | ✅ | — | Min 32 characters |
| `JWT_REFRESH_SECRET` | ✅ | — | Min 32 characters |
| `JWT_ACCESS_EXPIRES_IN` | | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | | `7d` | Refresh token TTL |
| `API_PORT` | | `4000` | API listen port |
| `API_URL` | | `http://localhost:4000` | |
| `FRONTEND_URL` | | `http://localhost:3000` | CORS origin |
| `NEXT_PUBLIC_API_URL` | | `http://localhost:4000` | |
| `NODE_ENV` | | `development` | `development` \| `production` \| `test` |
| `SMTP_HOST` | | — | Optional in dev |
| `SMTP_PORT` | | — | |
| `SMTP_USER` | | — | |
| `SMTP_PASS` | | — | |
| `SMTP_FROM` | | — | |
| `PLATFORM_ADMIN_EMAILS` | | — | Comma-separated emails for cross-tenant admin |

> **Platform admin:** add your email to `PLATFORM_ADMIN_EMAILS`, register/login as Super Admin, and the `/admin` panel appears in the sidebar.

---

## 🗄 Database

### Migration history

| Migration | What it does |
|-----------|-------------|
| `20250609120000_init` | Core schema: orgs, users, projects, tasks, auth tokens |
| `20250609140000_phase2` | RBAC roles, org settings, invitations |
| `20250609155000_phase3_enum_values` | Enum additions |
| `20250609160000_phase3` | Project members, kanban fields, comments |
| `20250609165000_phase3_default` | Project status default |
| `20250609180000_phase4` | Activity logs, notifications |
| `20250609200000_phase5` | Analytics fields, org status, platform admin |

### Useful commands

```bash
npm run db:generate                    # Regenerate Prisma client
npm run db:migrate                     # Apply migrations (dev)
npm run db:push                        # Push schema, no migration file
npm run db:studio -w @orbit/api        # Open Prisma Studio GUI
```

---

## 🛠 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start API + web concurrently |
| `npm run dev:api` | API only |
| `npm run dev:web` | Web only |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier write |
| `npm run format:check` | Prettier check |
| `npm run test` | Run API tests (Vitest) |

---

## 🔑 Roles & Permissions

| Role | Scope |
|------|-------|
| **Super Admin** | Full access within the organization |
| **Organization Admin** | Manage org, team, projects, tasks |
| **Project Manager** | Manage projects and tasks, invite team |
| **Team Member** | Work on assigned projects and tasks |
| **Client** | Read-only access, can comment |

Permissions are enforced server-side via `requirePermission()` middleware. The UI mirrors a subset for gating — **the API is always authoritative**.

---

## ⚡ Real-Time Events

Connect from the client:

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', {
  auth: { token: accessToken },
});
```

| Event | Room | Description |
|-------|------|-------------|
| `task:created` | `project:{id}` | New task on kanban |
| `task:updated` | `project:{id}` | Task moved or edited |
| `task:deleted` | `project:{id}` | Task removed |
| `notification:new` | `user:{id}` | New in-app notification |
| `activity:new` | `org:{id}` / `project:{id}` | Activity log entry |

Clients auto-join org and user rooms on connect. Project rooms are joined when viewing a board.

---

## 🛡 Security

| Measure | Implementation |
|---------|----------------|
| Rate limiting | 300 req/15 min general · 30 req/15 min on auth routes |
| CSRF | Double-submit cookie on login, register, refresh, logout, invite accept |
| XSS | Comment bodies sanitized server-side |
| Headers | Helmet |
| Validation | Zod on all request bodies and route params |
| Tenant isolation | JWT + Prisma extension on every tenant-scoped query |
| Passwords | bcrypt (12 rounds) |
| Tokens | Short-lived access JWT · refresh rotation with family revocation |

---

## 📡 API Reference

Full docs: **[docs/API.md](docs/API.md)**

```bash
# Health check
curl http://localhost:4000/health

# Get CSRF token (required before login/register)
curl -c cookies.txt http://localhost:4000/api/auth/csrf-token

# Login
curl -b cookies.txt -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <token>" \
  -d '{"organizationSlug":"acme","email":"you@example.com","password":"secret"}'
```

Protected routes require:

```
Authorization: Bearer <access_token>
```

---

## 🧪 Testing

```bash
npm run test
```

Covers: role permission matrix · tenant isolation guards · XSS sanitization · Zod validation · API health, CSRF, and auth rejection

```bash
# Watch mode
npm run test:watch -w @orbit/api
```

---

## 🗺 Web Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login`, `/register` | Authentication |
| `/dashboard` | Analytics overview |
| `/projects` | Project list |
| `/projects/[id]` | Kanban board + activity |
| `/calendar` | Deadlines calendar |
| `/settings/organization` | Org settings + activity feed |
| `/settings/team` | Members and invitations |
| `/settings/profile` | User profile |
| `/admin` | Platform admin (restricted) |
| `/invite/accept` | Accept team invitation |

---

## 🔧 Troubleshooting

<details>
<summary><strong>Migration failed or drift detected</strong></summary>

```bash
cd apps/api
npx prisma migrate status
npx prisma migrate resolve --rolled-back <migration_name>
npx prisma migrate deploy
```

For a clean slate (⚠️ destroys all data):

```bash
cd apps/api
npx prisma migrate reset
```

</details>

<details>
<summary><strong>Prisma client EPERM on Windows</strong></summary>

Stop all running dev servers, then:

```bash
npm run db:generate
```

</details>

<details>
<summary><strong>CSRF errors on login/register</strong></summary>

The web client fetches a CSRF token automatically before auth requests. Ensure cookies are enabled and `FRONTEND_URL` matches your web origin exactly.

</details>

<details>
<summary><strong>Email not sending</strong></summary>

SMTP is optional in development. Without valid `SMTP_*` variables, registration still works — check API logs for verification links printed to console.

</details>

<details>
<summary><strong>Suspended organization</strong></summary>

Platform admins retain access to suspended orgs. All other users see *"Organization has been suspended"* at login. Unsuspend via `/admin`.

</details>

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, CSS Modules |
| Backend | Express 4, TypeScript |
| Database | PostgreSQL, Prisma 6 |
| Auth | JWT, bcrypt, refresh token rotation |
| Real-time | Socket.io |
| Validation | Zod |
| Charts | Recharts |
| Calendar | react-big-calendar, date-fns |
| Kanban | @dnd-kit |
| Testing | Vitest, Supertest |

---

<div align="center">

Private — all rights reserved.

</div>
