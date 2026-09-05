# RestockIQ

Stockouts lose sales. Dead stock ties up cash. RestockIQ computes the exact reorder
point for every SKU from its actual sales velocity, so a D2C brand knows precisely
when to reorder — not too early (cash sitting in a warehouse) and not too late
(a bestseller going dark on the storefront).

## The math (the trust builder)

```
avg_daily_sales = units sold in the last N days / N        (rolling window, default 30)
reorder_point   = avg_daily_sales × lead_time_days + safety_stock
days_of_cover   = current_stock / avg_daily_sales
```

- **Reorder now** — `current_stock <= reorder_point`. At current velocity, stock runs
  out before a new order could arrive.
- **Overstocked** — velocity is zero (dead stock) or `current_stock` is more than 3×
  the reorder point — far more cash tied up in this SKU than its sell-through justifies.
- **Healthy** — everywhere in between.

Every number on the dashboard is reproducible from `Product` + `SaleRecord` rows —
no black box, no ML model to trust blindly. The formula lives in one place:
[`lib/forecast/reorder.ts`](./lib/forecast/reorder.ts), unit-tested in
[`lib/forecast/reorder.test.ts`](./lib/forecast/reorder.test.ts).

```
        ┌────────────┐        ┌───────────────┐
        │  Product   │──has──▶│  SaleRecord   │
        │ leadTime   │        │  qty, soldAt  │
        │ safetyStock│        └───────┬───────┘
        │ currentStk │                │ rolling window
        └─────┬──────┘                ▼
              │              avg_daily_sales
              │                       │
              └──────────┬────────────┘
                          ▼
              reorder_point = avg_daily_sales × leadTime + safetyStock
                          │
                          ▼
         status: reorder-now / healthy / overstocked
```

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · Prisma + Postgres · Recharts

## Data model

- **Product** — `sku`, `name`, `currentStock`, `leadTimeDays`, `safetyStock`
- **SaleRecord** — `productId`, `qty`, `soldAt`

## API

| Route | Method | Purpose |
|---|---|---|
| `/api/products` | GET, POST | List / create products |
| `/api/products/[id]` | GET, PATCH, DELETE | Read / update / delete one product |
| `/api/sales` | GET, POST | List / ingest sale records |
| `/api/reorder` | GET | Computed reorder recommendation per SKU (`?windowDays=30`) |

All writes are validated with `zod` and every route is rate-limited
(60 req/min/IP — see [`lib/rateLimit.ts`](./lib/rateLimit.ts)).

## Setup

Requires Node 18+ and a Postgres database.

```bash
npm install
cp .env.example .env        # set DATABASE_URL
npm run db:push             # create tables
npm run db:seed             # load realistic demo data (6 SKUs across all 3 statuses)
npm run dev                 # http://localhost:3000
```

## Test

```bash
npm test
```

Runs the reorder-point math against fixed dates and known inputs (Node's built-in
test runner — no framework needed for a handful of pure functions).

## Demo data

The seed script creates 6 SKUs that deliberately span all three states: a fast
seller under-stocked for its lead time (**reorder now**), a slow mover sitting on
400 units (**overstocked**), a brand-new SKU with zero sales history, and a couple
of steady, well-balanced sellers (**healthy**).

## Deploying

Built for Vercel + [Neon](https://neon.tech) (Postgres). Point `DATABASE_URL` at a
Neon connection string, run `npx prisma db push` against it, then deploy.

## Optional: Shopify import

Not wired to a live store in this prototype — `SaleRecord` and `Product` map
directly onto Shopify's `Order` line items and `Product` variants
(`sku`, `inventory_quantity`), so a scheduled sync job is a straightforward
follow-up: pull orders since the last sync, upsert `SaleRecord`s by `qty`/`soldAt`.
