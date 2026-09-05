# FieldDispatch

Job scheduler for field-service businesses (HVAC, cleaning, repair) that stops
double-booked technicians before they happen.

**Double-booked techs = missed jobs and no-show fees.** Every calendar app checks
whether two jobs overlap in time. None of them check whether the technician can
physically *get* from job A to job B in the gap between them. A schedule can look
perfectly clean — 9:00–10:00, then 10:15–11:00 — and still be undrivable if those
two addresses are 25 minutes apart across town. FieldDispatch is the scheduler
that catches that.

```
 Naive calendar check:            FieldDispatch check:
 ┌─────────┐  ┌─────────┐         ┌─────────┐  ┌─────────┐
 │ 9-10 AM │  │10:15-11 │         │ 9-10 AM │  │10:15-11 │
 │ Fishtown│  │ Univ.   │         │ Fishtown│  │ Univ.   │
 │         │  │ City    │         │         │  │ City    │
 └─────────┘  └─────────┘         └─────────┘  └─────────┘
      "no overlap, all good" ✅        ↑ 25 min drive, 15 min gap
                                        "TIGHT / CONFLICT" ⚠️
```

## How it works

Assigning a job runs two checks, not one:

1. **Time overlap** — does this job's time window collide with another job
   already on this technician's schedule?
2. **Travel feasibility** — using the technician's prior and next job, is
   there enough time in the gap to actually *drive* between the two
   addresses, not just enough time on the clock?

Every assignment gets a verdict:

| Verdict | Meaning |
|---|---|
| `OK` | Time is clear and there's comfortable travel slack. |
| `TIGHT` | It fits, but with under 10 minutes of slack — flagged as a warning. |
| `CONFLICT` | Time overlaps, or travel time exceeds the available gap. Blocked by default; can be force-assigned with an explicit override. |

The core logic lives in [`lib/scheduling/conflict.ts`](lib/scheduling/conflict.ts)
and is covered by [`lib/scheduling/conflict.test.ts`](lib/scheduling/conflict.test.ts)
(mocked distances — no network calls in tests).

Travel time itself comes from [`lib/scheduling/travel.ts`](lib/scheduling/travel.ts):
it calls the OpenRouteService driving-distance API when `ORS_API_KEY` is set, and
falls back to a haversine-distance + average-speed estimate when it isn't (or if
the API call fails/times out). **The app is fully functional without any API
key** — this is what makes the demo runnable with zero setup.

## Demo data

The seed script creates 3 technicians and 6 jobs around Philadelphia, including
one pair built specifically to demonstrate the point: Jordan Lee has a job in
Fishtown ending at 10:00, and a second job in University City starting at
10:15 — a 15-minute gap for what's actually a ~20+ minute drive. A time-only
calendar sees a clean schedule. FieldDispatch flags it `TIGHT`/`CONFLICT`.

There's also one `UNASSIGNED` job (a fridge repair in Fairmount) sitting in the
Dispatch Board's sidebar, ready to assign to any technician to see the
check run live.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- Prisma + PostgreSQL
- Zod validation on every API route
- OpenRouteService for driving distances (haversine fallback, in-memory cache)
- Twilio for job-assignment SMS (console-logged when not configured; respects
  a per-technician `smsOptOut` flag)
- In-memory rate limiting per IP on all API routes

## Setup

Requires Node 18+ and a local PostgreSQL server.

```bash
# 1. Install dependencies
npm install

# 2. Create a local Postgres database (skip if it already exists)
createdb fielddispatch

# 3. Copy env and adjust DATABASE_URL if your Postgres user/port differs
cp .env.example .env

# 4. Run migrations + seed demo data
npm run db:migrate
npm run db:seed

# 5. Run tests
npm test

# 6. Start the app
npm run dev
```

Open:
- `http://localhost:3000/schedule` — Dispatch Board (tech columns, map, unassigned-job assignment with live conflict checking)
- `http://localhost:3000/my-jobs` — Technician mobile view (pick a tech, see their day)

### Optional: real driving distances

Without `ORS_API_KEY`, travel time is a straight-line + average-speed estimate
— good enough to demonstrate the concept, not turn-by-turn accurate. To use
real driving distances:

1. Sign up free at https://openrouteservice.org/dev/#/signup
2. Dashboard → "Request a token" → free tier
3. Put the token in `.env` as `ORS_API_KEY`

### Optional: real SMS

Without Twilio credentials, job-assignment texts are logged to the console
instead of sent. To send real SMS:

1. Create a free trial account at https://console.twilio.com
2. Put `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` in `.env`

## API

- `GET /api/jobs` — list all jobs
- `POST /api/jobs` — create a job (zod-validated: title, address, lat, lng, startAt, durationMins)
- `GET /api/technicians` — list technicians
- `POST /api/assign` — assign a job to a technician. Runs the time + travel conflict check;
  returns `409` with the verdict/reasons on `CONFLICT` unless `force: true` is passed.
- `GET /api/route-check` — run the conflict check standalone (technicianId, lat, lng, startAt,
  durationMins query params) without assigning anything — useful for "what if" checks.

## Deploy (Vercel + Neon)

1. Push this repo to GitHub.
2. Create a free Postgres database at https://neon.tech, copy its connection string.
3. Import the repo on https://vercel.com/new, set `DATABASE_URL` (Neon connection string)
   and optionally `ORS_API_KEY` / `TWILIO_*` in the Vercel project's Environment Variables.
4. Deploy. Then run migrations against the Neon database once:
   ```bash
   DATABASE_URL="<neon-connection-string>" npx prisma migrate deploy
   DATABASE_URL="<neon-connection-string>" npx tsx prisma/seed.ts
   ```

## Testing performed

- `npm test` (vitest) — 5 unit tests on the conflict-checking core: time overlap,
  travel-infeasible conflict, tight-slack warning, clean OK case, and checking
  feasibility against both the prior *and* next job.
- Full browser click-through via Playwright (chromium): home page → dispatch board
  (3 technician columns, map, 1 seeded unassigned job) → assign flow (select
  technician, run check, verdict returned, job moves off the unassigned list) →
  technician mobile view (job list for a selected tech) → job creation via API
  reflected live in the UI. Zero console errors during the run.
- Manual `curl` verification of `/api/assign` and `/api/route-check`, including
  confirming the seeded Jordan Lee Fishtown→University City pair returns a
  `TIGHT` verdict (3 minutes of slack) — the exact scenario a time-only
  calendar would miss.
