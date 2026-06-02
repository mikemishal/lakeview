# Lakeview

Lakeview coordinates short-term-rental turnovers. Property owners connect an
Airbnb calendar, and Lakeview turns each checkout into a cleaning job that a
service provider can accept, start, and complete.

## What the app does

- Owners create properties and connect an Airbnb iCal calendar URL.
- The calendar is synced through a server route that fetches the iCal feed,
  filters out owner blocks ("Airbnb (Not available)"), and stores reservations.
- Cancelled reservations are reconciled on each sync: their stored events are
  removed and any not-yet-started cleaning job is cancelled.
- Each checkout becomes a cleaning job. Same-day checkout/check-in pairs are
  flagged as turnovers.
- Owners assign jobs to providers (or self-assign). Providers accept, start, and
  complete jobs, and can flag maintenance, restock, or damage.
- Both sides get in-app notifications scoped to their own account.
- Installable as a PWA for use on a phone.

## Tech stack

- Next.js (App Router) and React
- Prisma with PostgreSQL
- Clerk for authentication
- Playwright for end-to-end tests
- Deployed to Azure App Service via GitHub Actions

## Running locally

See LOCAL-TESTING.md for the full local setup and a manual test checklist. In
short:

1. `npm install`
2. Create a `.env.local` with the variables in DEPLOYMENT.md (a local PostgreSQL
   `DATABASE_URL`, Clerk keys, `SIGNUP_INVITE_CODE`).
3. `npx prisma migrate deploy` then `npx prisma generate`
4. `npm run dev` and open http://localhost:3000

## Calendar URL safety

The server only fetches calendar URLs whose host is on an allowlist (Airbnb by
default, plus other providers and any hosts listed in
`LAKEVIEW_CALENDAR_HOST_ALLOWLIST`). IP-literal hosts and redirects to other
hosts are rejected. This prevents the fetch endpoints from reaching internal
addresses.

## Scheduled sync

`/api/cron/sync` re-syncs every property and regenerates jobs. It requires the
`CRON_SECRET` (Authorization: Bearer or `?secret=`). The
`.github/workflows/sync-cron.yml` workflow calls it on a schedule; an Azure
WebJob or external cron service can call the same endpoint.

## Useful scripts

- `npm run dev` - local dev server
- `npm run lint` / `npm run typecheck` - lint and TypeScript checks
- `npm run test:e2e` - Playwright tests
- `npm run db:seed:demo` - seed demo data (see DEMO.md)
- `npm run db:backfill-owner-ids` - assign legacy null-owner records to an owner
- `npm run db:clear-operational` - clear properties, events, and jobs (keeps
  providers)

## Deployment

See DEPLOYMENT.md for environment variables, database setup, secrets, and
migrations. See DEMO.md for the sample-data demo deployment.

## Tests

Playwright specs live in `tests/e2e`. Run `npm run test:e2e` locally, or
`npm run test:e2e:ui` for the interactive runner.
