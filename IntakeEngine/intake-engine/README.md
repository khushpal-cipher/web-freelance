# IntakeEngine

**Manual onboarding delays cash and drops clients.**

Every new client onboarding that runs through email — "send me your info," "wait,
what type of business are you," "can you re-sign this," "did we ever set up your
account?" — is a day of delay and a chance for the client to go cold. IntakeEngine
replaces that back-and-forth with one link: a conditional intake form that only
asks what's relevant, captures a legally-binding signature, and provisions the
account itself the moment the client is done. No one on the team touches it until
there's a signed, provisioned client waiting in the dashboard.

## The trust builder: a conditional engine, not a form

Most "smart forms" are a pile of `if` statements wired into JSX. That breaks the
moment someone wants to add a question, and nobody can tell what the form will
ask without reading the whole component tree.

IntakeEngine's form is **data**, not code. `lib/forms/schema.ts` defines steps and
fields with a declarative `showIf` condition:

```ts
{
  id: "clinic-compliance",
  title: "Compliance",
  showIf: { and: [{ field: "businessType", equals: "clinic" }, { field: "hipaaRequired", truthy: true }] },
  fields: [
    { id: "baaSigner", label: "Name of person authorized to sign the BAA", type: "text", required: true },
    { id: "dataRetentionPolicy", label: "Preferred data retention period", type: "select", required: true, options: [...] },
  ],
}
```

Two pure functions do all the work:

- `visibleSteps(schema, data)` — which steps exist *right now*, given the answers so far
- `visibleFields(step, data)` — which fields on the current step are visible

Everything else — the progress bar, "Next"/"Back" navigation, per-step zod
validation, and resume — is derived from those two functions. Validation can
never drift from what's on screen, because `zodForStep()` builds its zod schema
from the exact same `visibleFields()` call the UI uses to render inputs.

```
business-info ──► businessType?
                     ├─ clinic ──► clinic-details ──► hipaaRequired?
                     │                                   ├─ yes ──► clinic-compliance ──┐
                     │                                   └─ no ───────────────────────────┤
                     ├─ ecommerce ──► ecommerce-details ─────────────────────────────────┤
                     └─ agency ──► agency-details ────────────────────────────────────────┤
                                                                                            ▼
                                                                                   scope ──► review + sign
```

Add a field, add a step, change a branch condition — it's a JSON edit, no
component rewiring. That's the part of this project meant to demonstrate: the
form *is* the business logic, and the business logic is inspectable.

## What happens when a client finishes

1. **Signs** — a canvas signature pad (no library, ~100 lines) captures a PNG,
   stored on disk outside `public/` and served only through an HMAC-signed,
   expiring URL (`/api/signature/[id]?expires=...&sig=...`) — never a public,
   guessable link.
2. **Provisions** — `POST /api/provision` creates a `ProvisionedAccount` record
   and sends a welcome email via Resend. This is the moment manual onboarding
   usually takes another day; here it's synchronous and instant.

## Data model

```prisma
model Submission {
  id, resumeToken, data (Json), currentStep, status, signedAt, signatureUrl, ...
}
model ProvisionedAccount {
  id, submissionId, createdAt, welcomeSentAt
}
```

`data` holds the full merged answer set as JSON — the schema (not a rigid
column-per-field table) owns the shape, so adding a field never means a
migration.

## API

| Route | Purpose |
|---|---|
| `POST /api/intake` | Validates one step's answers against that step's live zod schema, merges into `Submission.data`, returns the next visible step. Creates the submission (and its resume token) on the first call. |
| `GET /api/intake?token=` | Resume: rehydrates saved answers and recomputes current step from the schema — not a cached value, so branch changes stay correct even mid-resume. |
| `POST /api/sign` | Stores the signature PNG, marks the submission `SIGNED`. |
| `POST /api/provision` | Creates the account record, sends the welcome email, marks `PROVISIONED`. Idempotent — calling twice returns the existing account. |
| `GET /api/signature/[id]` | Serves a signature PNG, but only with a valid, unexpired HMAC signature on the URL. |

Every route is rate-limited per IP (in-memory sliding window — see the
`ponytail:` comment in `lib/ratelimit.ts` for the upgrade path if this needs to
survive multi-instance deploys). Logs (`lib/logger.ts`) carry ids, step names,
and statuses only — never field values or raw emails.

## Running it

Requires Node 18+ and a Postgres instance.

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL; SIGNING_SECRET can be generated (see comment in the file)
npm run db:push        # create tables
npm run db:seed        # 3 demo submissions: in-progress, signed, provisioned
npm run dev
```

Then:

- **Take the form**: http://localhost:3000/onboard/business-info — pick "Clinic"
  and check "protected health information" to watch a step (`clinic-compliance`)
  appear that wasn't there a screen ago.
- **Dashboard**: http://localhost:3000/submissions
- **Test the engine directly**: `npm test` — 8 assertions covering branching,
  nested conditions, resume-consistency, and per-step validation isolation.

Without a `RESEND_API_KEY`, provisioning still runs and the welcome email is
logged (not sent) — the demo works end to end either way. Add a real key to
`.env` to see it land.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · shadcn-style primitives ·
react-hook-form + zod · Prisma + Postgres · Resend · a hand-rolled canvas
signature pad. Deploy target: Vercel + Neon.

## Scope note

This is a portfolio prototype: it demonstrates the conditional-engine and
auto-provisioning mechanics end to end, seeded with demo data. It intentionally
skips auth on the dashboard, background job queues for email, and object
storage for signatures (local disk instead) — each is called out inline with a
`ponytail:` comment naming what to add and when.
