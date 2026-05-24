# Allo Inventory — Take-Home Exercise

A multi-warehouse inventory and reservation platform built with Next.js, Prisma, and PostgreSQL. Solves the checkout race condition: stock is held for 10 minutes while payment processes, then confirmed or released atomically.

## Live Demo

> **URL:** `https://allo-inventory.vercel.app` *(replace with your deployed URL)*

## Tech Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Prisma ORM** + **PostgreSQL** (hosted on Neon or Supabase)
- **Zod** — input validation shared across API and forms
- **Tailwind CSS** — UI styling
- **Vercel Cron** — automatic reservation expiry

---

## Running Locally

### 1. Clone and Install

```bash
git clone https://github.com/your-username/allo-inventory.git
cd allo-inventory
npm install
```

### 2. Environment Variables

Create a `.env` file at the project root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
CRON_SECRET="your-random-secret-here"
```

### 3. Run Migrations

```bash
npx prisma migrate deploy
```

### 4. Seed the Database

```bash
npm run db:seed
```

This creates 3 warehouses (Mumbai, Delhi, Bangalore) and 5 products with stock levels.

### 5. Start Dev Server

```bash
npm run dev
```

Open http://localhost:3000

---

## How Concurrency Safety Works

Instead of read-then-write, the reservation uses a single atomic SQL UPDATE:

```sql
UPDATE "StockLevel"
SET "reservedUnits" = "reservedUnits" + {quantity}
WHERE "productId" = {productId}
  AND "warehouseId" = {warehouseId}
  AND ("totalUnits" - "reservedUnits") >= {quantity}
```

PostgreSQL executes this atomically. If two requests race, one updates 1 row (succeeds) and the other updates 0 rows (fails with 409). No application-level locks needed.

## Reservation Expiry

Two-layer approach:
1. **Vercel Cron** (every minute) — sweeps and releases expired PENDING reservations
2. **Lazy cleanup** — the confirm endpoint also checks expiry inline, releasing stock and returning 410 if expired

## Idempotency (Bonus)

Pass `Idempotency-Key: your-unique-key` header on POST /api/reservations or confirm. The server returns the original response on retry without repeating side effects.

## Trade-offs

- Cron granularity is 1 minute — Redis keyspace TTL would be sub-second
- No auth — reservations aren't tied to user sessions
- No distributed locking — atomic UPDATE works for single-region Postgres; multi-region would need Redlock

## Deployment

1. Push to GitHub
2. Create Postgres DB on Neon (neon.tech — free tier)
3. Import repo at vercel.com/new, set DATABASE_URL + CRON_SECRET env vars
4. Run: `DATABASE_URL="..." npx prisma migrate deploy && npm run db:seed`
