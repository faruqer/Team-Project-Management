# Orbit API Reference

Base URL: `http://localhost:4000` (development)

All JSON responses use `{ data }` or `{ error: { message, code, details? } }` shape.

## Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/csrf-token` | — | Issue CSRF token (required for cookie auth routes) |
| POST | `/api/auth/register` | CSRF | Create organization + admin user |
| POST | `/api/auth/login` | CSRF | Login with org slug, email, password |
| POST | `/api/auth/refresh` | CSRF + cookie | Rotate access token |
| POST | `/api/auth/logout` | Bearer + CSRF | Revoke refresh token |
| GET | `/api/auth/me` | Bearer | Current user profile |
| GET | `/api/auth/verify-email` | — | Verify email (`?token=&org=`) |
| POST | `/api/auth/forgot-password` | — | Request password reset |
| POST | `/api/auth/reset-password` | — | Reset password with token |

**Headers for protected routes:**
```
Authorization: Bearer <access_token>
```

**CSRF (cookie routes):**
```
X-CSRF-Token: <csrf_token>
```

## Organizations

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/organizations/current` | `org:read` | Get current org |
| PATCH | `/api/organizations/current` | `org:update` | Update org settings |
| POST | `/api/organizations/current/logo` | `org:update` | Upload logo |

## Team

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/team/members` | `team:list` | List members |
| GET | `/api/team/invitations` | `team:invite` | List invitations |
| POST | `/api/team/invitations` | `team:invite` | Invite member |
| DELETE | `/api/team/invitations/:id` | `team:invite` | Revoke invitation |
| PATCH | `/api/team/members/:userId/role` | `team:manage` | Change role |
| PATCH | `/api/team/members/:userId/deactivate` | `team:deactivate` | Deactivate user |
| PATCH | `/api/team/members/:userId/reactivate` | `team:deactivate` | Reactivate user |
| GET | `/api/team/invitations/preview` | — | Preview invite (`?token=`) |
| POST | `/api/team/invitations/accept` | — | Accept invitation |

## Projects & Tasks

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/projects` | `project:list` | List projects |
| POST | `/api/projects` | `project:create` | Create project |
| GET | `/api/projects/:id` | `project:list` | Get project |
| PATCH | `/api/projects/:id` | `project:update` | Update project |
| DELETE | `/api/projects/:id` | `project:delete` | Delete project |
| PUT | `/api/projects/:id/members` | `project:manage_members` | Set members |
| GET | `/api/tasks/project/:projectId` | `task:list` | List tasks |
| POST | `/api/tasks/project/:projectId` | `task:create` | Create task |
| GET | `/api/tasks/:id` | `task:list` | Get task |
| PATCH | `/api/tasks/:id` | `task:update` | Update task |
| PATCH | `/api/tasks/:id/move` | `task:update` | Move task (kanban) |
| DELETE | `/api/tasks/:id` | `task:delete` | Delete task |

## Comments

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/tasks/:taskId/comments` | `comment:list` | List comments |
| POST | `/api/tasks/:taskId/comments` | `comment:create` | Create comment (multipart) |
| PATCH | `/api/tasks/comments/:id` | `comment:update` | Edit comment |
| DELETE | `/api/tasks/comments/:id` | `comment:delete` | Delete comment |
| GET | `/api/tasks/:taskId/mentions` | `comment:create` | Search mentionable users |

## Activity & Notifications

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/activity/org` | `org:read` | Org activity timeline |
| GET | `/api/activity/project/:projectId` | `project:list` | Project activity |
| GET | `/api/notifications` | — | List notifications |
| GET | `/api/notifications/unread-count` | — | Unread count |
| PATCH | `/api/notifications/read-all` | — | Mark all read |
| PATCH | `/api/notifications/:id/read` | — | Mark one read |

## Analytics & Calendar

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/analytics/summary` | `project:list` | Dashboard analytics |
| GET | `/api/calendar/events` | `project:list` | Calendar events (`?start=&end=`) |

## Platform Admin (Super Admin + platform flag)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/organizations` | List all organizations |
| PATCH | `/api/admin/organizations/:id/status` | Suspend/unsuspend org |

Requires `SUPER_ADMIN` role and `isPlatformAdmin: true`. Set via `PLATFORM_ADMIN_EMAILS` env.

## Security

- **Rate limiting:** 300 req/15min general; 30 req/15min auth routes
- **CSRF:** Double-submit cookie on auth cookie routes
- **XSS:** Comment bodies sanitized server-side
- **Helmet:** Security headers on all responses
- **Validation:** Zod schemas on all request bodies and params
- **Tenant isolation:** All tenant data scoped by JWT `organizationId`

## WebSocket Events

Connect: `io(API_URL, { auth: { token } })`

| Event | Scope | Payload |
|-------|-------|---------|
| `task:created` | project room | `{ task }` |
| `task:updated` | project room | `{ task }` |
| `task:deleted` | project room | `{ taskId }` |
| `notification:new` | user room | `Notification` |
| `activity:new` | org + project rooms | `ActivityLog` |

Rooms: `org:{id}`, `project:{id}`, `user:{id}`
