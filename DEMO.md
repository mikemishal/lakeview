# Demo Site

A separate deployment that showcases Lakeview with sample data. Keep it isolated
from production: its own database and its own Clerk instance.

## What the demo includes

Running the demo seed creates:

- One owner, "Jordan Lake" (Lakeview Rentals), with three properties: Birch Cabin,
  Lakeside Loft, and Pine Cottage.
- Three providers: Sparkle Clean Co (cleaning, the demo login), Fresh Start
  Cleaning (cleaning), and FixIt Maintenance (maintenance).
- Synced calendar events including a same-day turnover at Birch Cabin.
- Cleaning jobs in every status: needs assignment, assigned, accepted, in
  progress, and completed (with a restock flag), plus an ad-hoc maintenance job.
- Owner and provider notifications.

## One-time setup

1. Create a separate PostgreSQL database for the demo.
2. Create a separate Clerk application for the demo, and create two demo logins
   (one owner, one cleaner). Note each user's Clerk user id (starts with `user_`).
3. Deploy the app to a demo host (for example a second Azure App Service) with the
   demo Clerk keys and the demo `DATABASE_URL`.

## Seeding the sample data

Run against the demo database (PowerShell):

```powershell
$env:DATABASE_URL = "postgresql://...demo-db..."
$env:DEMO_OWNER_CLERK_ID = "user_owner_id_here"
$env:DEMO_PROVIDER_CLERK_ID = "user_cleaner_id_here"

npx prisma migrate deploy
npm run db:seed:demo
```

The seed links the sample owner and cleaner to those Clerk logins, so signing in
as the demo owner shows the owner dashboard with data, and signing in as the demo
cleaner shows the assigned jobs.

If you do not set the Clerk ids, the data is still created but is not attached to
any login, so the dashboards will look empty until a login is linked.

## Re-seeding

The seed is safe to run repeatedly. It removes only demo records (those on the
`@lakeview-demo.local` email domain) and their related properties, events, jobs,
and notifications, then rebuilds them. It does not touch other data, so do not run
it against the production database.

## Notes

- The seeded `airbnbCalendarUrl` values are placeholders. The demo "Sync calendar"
  button will fail against them, which is expected. The pre-seeded events and jobs
  are what the demo showcases.
- Keep the demo invite code (`SIGNUP_INVITE_CODE`) different from production.
