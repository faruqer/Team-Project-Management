# Orbit API

Standalone Express + Prisma + Socket.io backend for the Orbit multi-tenant project management platform.

## Prerequisites

- **Node.js** 20+ (22 recommended)
- **PostgreSQL** 14+
- **npm** 9+

## Environment variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Yes | Min 32 characters |
| `JWT_REFRESH_SECRET` | Yes | Min 32 characters |
| `FRONTEND_URL` | Yes | Frontend origin for **CORS** and **Socket.io** (e.g. `http://localhost:3000`) |
| `API_PORT` | No | HTTP port (default `4000`) |
| `API_URL` | No | Public API URL for upload links (default `http://localhost:4000`) |
| `NODE_ENV` | No | `development` \| `production` \| `test` |
| `JWT_ACCESS_EXPIRES_IN` | No | Default `15m` |
| `JWT_REFRESH_EXPIRES_IN` | No | Default `7d` |
| `SMTP_*` | No | Email (verification, password reset) |
| `PLATFORM_ADMIN_EMAILS` | No | Comma-separated emails for cross-tenant admin |

## Development

```bash
npm install
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT secrets

npm run db:generate
npm run db:migrate

npm run dev
```

API runs at **http://localhost:4000** (or your `API_PORT`).

Health check: `GET /health`

## Production

```bash
npm install
cp .env.example .env
# Set production values (strong secrets, real DATABASE_URL, FRONTEND_URL)

npm run db:generate
npm run db:migrate:deploy

npm run build
npm start
```

Run behind a reverse proxy (HTTPS recommended). Set `NODE_ENV=production` and `FRONTEND_URL` to your deployed web app URL.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with hot reload (tsx) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server |
| `npm test` | Vitest unit/integration tests |
| `npm run db:migrate` | Apply migrations (dev) |
| `npm run db:migrate:deploy` | Apply migrations (production) |
| `npm run db:studio` | Prisma Studio GUI |

## API reference

See [docs/API.md](docs/API.md).

## Architecture notes

- **Tenant isolation:** JWT `organizationId` + Prisma extension auto-scoping
- **Real-time:** Socket.io rooms `org:{id}`, `project:{id}`, `user:{id}`
- **Security:** Rate limiting, CSRF on cookie auth routes, Zod validation, Helmet headers
