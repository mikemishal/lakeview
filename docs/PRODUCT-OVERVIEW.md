# Lakeview: product overview

## What Lakeview is

Lakeview is a turnover coordination tool for short-term rental operators. An
owner connects an Airbnb calendar, and Lakeview turns every checkout into a
cleaning job. Jobs are assigned to a service provider (a cleaner or maintenance
person) who accepts, executes, and completes them from a phone. The owner sees
each job move from created to assigned to accepted to completed without sending
a single text message.

In one line: connect your Airbnb calendar, and every checkout becomes a cleaning
job your cleaner can accept and finish from their phone.

## Who it is for

Lakeview is built for owners with roughly 1 to 10 listings who want turnover
scheduling without adopting a full property-management suite. It serves two
roles, and one account can hold both:

- Owners: people who manage one or more short-term rental properties and need
  every checkout cleaned reliably.
- Service providers: cleaners and maintenance people who receive jobs, work
  them in the field, and report back.

A single login can act as both owner and provider, which suits small operators
who clean their own units some of the time.

## The problem it solves

Short-term rental turnover is a scheduling problem that repeats on every
checkout. The owner has to know when guests leave, tell a cleaner, confirm the
cleaner is coming, confirm the work was done, and catch same-day turnovers where
a new guest arrives the same day someone leaves. Most small operators run this
on text messages and memory, which breaks down as listings and bookings grow.

Lakeview removes the manual relay. The Airbnb calendar is the single source of
truth, so jobs are generated from real reservations instead of being typed in by
hand. Same-day turnovers are flagged automatically because those are the highest
risk for a missed clean. Status is visible to both sides, so nobody has to chase
a confirmation.

## How it works

The pipeline is calendar to job to completion:

1. Connect. An owner adds a property and pastes its Airbnb iCal calendar URL.
2. Sync. A server route fetches the iCal feed, filters out owner blocks (entries
   marked "Airbnb (Not available)"), and stores the real reservations. Cancelled
   reservations are reconciled on each sync: their stored events are removed and
   any not-yet-started cleaning job for them is cancelled.
3. Generate. Each checkout becomes a dated cleaning job. When a checkout and a
   check-in fall on the same day at the same property, the job is flagged as a
   same-day turnover.
4. Assign. The owner assigns a job to a provider, or self-assigns it.
5. Execute. The provider accepts, starts, and completes the job. During the job
   the provider can flag maintenance, restock, or damage.
6. Notify. Both sides get in-app notifications scoped to their own account.

A cleaning job moves through these statuses: needs assignment, assigned,
accepted, in progress, completed, declined, and cancelled.

Owners can also create ad-hoc jobs that are not tied to a checkout, for example
a mid-stay clean or a maintenance visit.

## How to use it

New users sign up, then complete a one-time onboarding: enter the invite code,
choose Owner or Provider (or set up both), and fill in a short profile. After
that, owners work from the owner dashboard (properties, jobs, providers,
calendar) and providers work from the provider dashboard (assigned jobs,
notifications, and their action queue).

Lakeview is installable as a PWA, so a cleaner can add it to their phone home
screen and work jobs in the field. Step-by-step instructions live in the role
guides:

- Owners: docs/OWNER-GUIDE.md
- Providers: docs/PROVIDER-GUIDE.md
- A combined quickstart: docs/QUICKSTART.md

## Access and safety

Signup is gated by an invite code, so the app is not open to the public during
the pilot. Authentication is handled by Clerk, and the owner and provider
dashboards are protected so each user only sees their own data.

Calendar fetching is restricted for safety. The server only fetches calendar
URLs whose host is on an allowlist (Airbnb by default, plus any hosts you add
via the `LAKEVIEW_CALENDAR_HOST_ALLOWLIST` setting). IP-literal hosts and
redirects to other hosts are rejected, which prevents the fetch endpoints from
reaching internal addresses.

## Tech stack

- Next.js (App Router) and React
- Prisma with PostgreSQL (Neon in this setup)
- Clerk for authentication
- Playwright for end-to-end tests
- Hosted on Vercel (the upstream project also supports Azure App Service)

## Where to go next

- To run or deploy it, see LOCAL-TESTING.md.
- For required environment variables, see DEPLOYMENT.md.
- For the sample-data demo, see DEMO.md.
