# HajjBro Backend

Production-ready Node.js Express backend for the Hajj pilgrimage mobile app.

## Tech stack

- **Express.js** – HTTP API
- **Prisma** – ORM with PostgreSQL
- **JWT** – Authentication (jsonwebtoken + bcrypt)
- **dotenv** – Environment config
- **node-cron** – Scheduled jobs (e.g. prayer times)
- **Firebase Admin SDK** – Push notifications (optional)
- **Pino** – Logging

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL
- (Optional) Firebase project for push notifications

### Install and run

```bash
cp .env.example .env
# Edit .env: set DATABASE_URL, JWT_SECRET, etc.

npm install
npm run db:migrate:dev   # create DB and run migrations
npm run db:seed          # seed rituals, locations, checklists, sample duas
npm run dev              # start with tsx watch
```

### Production

```bash
npm run build
npm run db:migrate       # run pending migrations (e.g. in CI or Railway deploy hook)
npm start
```

On **Railway**: set **Build Command** to `npm run build` and **Start Command** to `npm start`. Run migrations once after adding PostgreSQL (e.g. `npx prisma migrate deploy` in a one-off job or in Start Command before `npm start` if you prefer).

## Environment (Railway)

**Project ID:** `25f58a8c-32c5-4e0d-8923-1a28b854304e` (in `railway.json`). Link locally with:

```bash
railway link 25f58a8c-32c5-4e0d-8923-1a28b854304e
```

Railway sets `PORT` and `DATABASE_URL` automatically when you add a PostgreSQL plugin. Configure in the dashboard:

| Variable        | Required | Description                    |
|----------------|---------|--------------------------------|
| `DATABASE_URL` | Yes     | PostgreSQL connection string   |
| `JWT_SECRET`   | Yes     | Min 32 chars, keep secret      |
| `NODE_ENV`     | No      | `production` on Railway        |
| `CORS_ORIGINS` | No      | Comma-separated allowed origins|
| `LOG_LEVEL`    | No      | `info` (default)               |

Firebase (optional): `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_PRIVATE_KEY_ID`.

## API

- **Base:** `http://localhost:3000/api/v1`
- **Health:** `GET /api/v1/health` – status + DB check
- **Readiness:** `GET /api/v1/health/ready` – 200 if DB connected (for probes)
- **Auth:** `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me` (Bearer token)

## Project structure

```
src/
  app.ts              # Express app, CORS, middleware, routes
  server.ts           # Start server, cron, graceful shutdown
  config/             # env and config
  middleware/         # auth, logging, error handler
  routes/             # route modules
  controllers/        # request handlers
  services/           # auth, firebase (notifications)
  lib/                # prisma client
  types/              # shared types
  utils/              # logger
prisma/
  schema.prisma       # data model
  seed.ts             # seed data
  migrations/        # SQL migrations
```

## Database

- **Migrate (dev):** `npm run db:migrate:dev`
- **Migrate (prod):** `npm run db:migrate`
- **Seed:** `npm run db:seed`
- **Studio:** `npm run db:studio`

## Models

- **User** – auth, profile, FCM token
- **Ritual** – Hajj steps (Ihram, Tawaf, Sa'i, Wuquf, etc.)
- **Dua** – supplications (optional link to ritual)
- **Location** – Makkah, Mina, Arafat, Muzdalifah, Madinah
- **Checklist** – pre-travel / packing / documents
- **UserChecklist** – user checklist completion
- **UserRitualProgress** – user ritual completion
- **Notification** – in-app / push
- **Contact** – emergency / travel contacts
- **PrayerTime** – times per location/date

## License

MIT
