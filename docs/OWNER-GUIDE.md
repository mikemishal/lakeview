# Owner guide

For property owners using Lakeview to schedule turnovers, and for whoever runs
the Lakeview instance. Part 1 is how to use the app. Part 2 is the technical
setup behind it.

## Part 1: Using Lakeview as an owner

### Sign up and onboarding

1. Open the app and click Sign up. Create your account.
2. You arrive at onboarding. Enter the invite code you were given. New accounts
   must verify this code once.
3. Choose Owner as your account type (you can add a Provider profile later from
   the same account).
4. Fill in your owner profile, including your property location. Save.

You now have access to the owner dashboard.

### Add a property and connect its calendar

1. In the owner dashboard, open Properties and add a property.
2. Give it a name and paste the property's Airbnb iCal calendar URL. The
   calendar URL is the only field that drives automation, so it matters most.
3. Save the property.

Where to find the Airbnb iCal URL: in Airbnb, open the listing's calendar or
availability settings and look for the option to export the calendar. Airbnb
gives you an `.ics` link. Copy that link and paste it into Lakeview.

### Sync and let jobs appear

1. On the property, click Sync calendar. Lakeview fetches the feed, ignores
   owner blocks marked "Airbnb (Not available)", and stores the real
   reservations.
2. Each checkout becomes a dated cleaning job. A checkout and check-in on the
   same day at the same property is flagged as a same-day turnover, which is the
   highest-risk clean.
3. If a reservation is later cancelled, the next sync removes its stored event
   and cancels any not-yet-started job for it.

After the first manual sync, the scheduled daily sync keeps things current (see
Part 2).

### Assign and track jobs

1. Open Jobs. Each job shows its property, date, and status.
2. Assign a job to a service provider, or self-assign it if you clean it
   yourself.
3. Watch the status move: needs assignment, assigned, accepted, in progress,
   completed. You do not need to text anyone for a confirmation.
4. If a provider flags maintenance, restock, or damage during a job, you get an
   in-app notification.

### Ad-hoc jobs

For work that is not tied to a checkout (a mid-stay clean, a maintenance visit),
create an ad-hoc job and assign it the same way.

### Notifications

In-app notifications are scoped to your account. Check them for accepted jobs,
completions, and any issues a provider flagged.

### Install on your phone

Lakeview is installable as a PWA. On iPhone, open it in Safari, tap Share, then
Add to Home Screen. On Android, open it in Chrome, open the menu, then Add to
Home screen or Install app.

## Part 2: Technical setup behind an owner instance

If you are the one running Lakeview (not just using it), the owner experience
above depends on a few settings. Full steps are in LOCAL-TESTING.md; this is the
owner-relevant summary.

- Invite code: set `SIGNUP_INVITE_CODE`. This is the code owners type during
  onboarding. Keep it private during the pilot.
- Database: `DATABASE_URL` points at your Neon Postgres. Properties, events,
  jobs, and notifications all live here.
- Auth: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from your
  Clerk instance. The owner dashboard at `/owner` is protected, so owners only
  see their own properties and jobs.
- Scheduled sync: `vercel.json` runs `/api/cron/sync` daily at 06:00, which
  re-syncs every property and regenerates jobs. It is guarded by `CRON_SECRET`.
  Vercel Cron runs only on Production deployments, so set the Production Branch
  to `dev` if you want the daily sync to fire.
- Calendar host allowlist: Airbnb is always allowed. To accept other calendar
  hosts (for example VRBO), add them to `LAKEVIEW_CALENDAR_HOST_ALLOWLIST`.

To run or deploy, follow LOCAL-TESTING.md. For the full variable list, see
DEPLOYMENT.md.
