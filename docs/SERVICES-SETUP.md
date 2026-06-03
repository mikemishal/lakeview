# Services setup: Neon, Clerk, Vercel

Account-by-account setup to get the `dev` branch running locally and live on
Vercel. Do them in this order: Neon (database), then Clerk (auth keys), then run
locally, then Vercel (deploy). Commands are PowerShell.

You collect four secrets along the way. Keep them somewhere temporary as you go:

- `DATABASE_URL` (from Neon)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` (from Clerk)
- `SIGNUP_INVITE_CODE` (you invent this)
- `CRON_SECRET` (you invent this)

---

## A. Neon database

### A1. Create the project

1. Sign in at neon.tech.
2. Create a project on the free tier. Pick any region close to you.
3. Neon creates a default database (usually named `neondb`).

### A2. Get the connection string

1. On the project dashboard, find Connection Details (also called Connect).
2. Neon shows a connection string. There are two forms:
   - Pooled: the host contains `-pooler`, for example
     `ep-xxxx-pooler.region.aws.neon.tech`.
   - Direct (non-pooled): the same host without `-pooler`.
3. You said you have the non-pooled string. Use it. It works for both migrations
   and app runtime at test volume. It looks like:

   ```
   postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
   ```

This whole string is your `DATABASE_URL`.

### A3. Where the connection string goes

In two places, both using the name `DATABASE_URL`:

- Locally: in `.env.local` (section C below).
- On Vercel: as an environment variable (section D below).

You do not edit `prisma/schema.prisma`. It already reads `DATABASE_URL`. You run
the migration against Neon in section C.

(Optional, later: if Vercel serverless hits connection limits, switch to the
pooled string for `DATABASE_URL` and add a `directUrl` for migrations. That
requires a small `schema.prisma` change and is not needed for testing.)

---

## B. Clerk authentication

### B1. Create the application

1. Sign in at clerk.com and create a new application.
2. Choose sign-in options (email is enough for testing).
3. Clerk creates a Development instance automatically. That is the one you use.

### B2. Get the API keys

1. In the Clerk dashboard, open API Keys.
2. Copy these two values:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_test_`)
   - `CLERK_SECRET_KEY` (starts with `sk_test_`)

### B3. Domains: nothing to configure for testing

Development keys (`pk_test_` / `sk_test_`) work on `localhost` and on any
`*.vercel.app` URL with no domain setup. You do not add your Vercel domain to a
development instance, and you cannot change a development instance's domain.

You only need to configure a domain later, if you move to a Clerk Production
instance on a custom domain (a `*.vercel.app` URL cannot be a Clerk production
domain). For this pilot, stay on the development instance.

Note: `SIGNUP_INVITE_CODE` is not a Clerk setting. It is your app's own invite
gate. Invent any value and set it in section C and section D.

---

## C. Run it locally

Full detail is in LOCAL-TESTING.md. Short version:

```powershell
cd C:\Users\Mike\Documents\GitHub\lakeviewv2
git checkout dev

Copy-Item .env.local.example .env.local
notepad .env.local
```

In `.env.local`, paste:

- `DATABASE_URL` = your Neon string (section A)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` = your Clerk keys
  (section B)
- `SIGNUP_INVITE_CODE` = any code you choose
- `CRON_SECRET` = any long random string

Then:

```powershell
npm install
npx prisma migrate deploy
npx prisma generate
npm run dev
```

`prisma migrate deploy` runs against Neon and creates all tables. Open
http://localhost:3000 and sign up to confirm Clerk and the database both work.

---

## D. Vercel deployment (tracking the dev branch)

### D1. Import the project

1. Go to vercel.com and sign in with GitHub.
2. Add New, Project, then import your fork `Mfernandes86/lakeview`.
3. Vercel auto-detects Next.js. Leave build settings as they are. The repo's
   `build` script already runs `prisma generate && next build`.

### D2. Add environment variables

Before the first deploy, expand Environment Variables and add every key from
your `.env.local`, with the same names and values:

- `DATABASE_URL` (your Neon string)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL` = `/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL` = `/sign-up`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` = `/`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` = `/onboarding`
- `SIGNUP_INVITE_CODE`
- `CRON_SECRET`

For each variable, select the environments to apply it to. Because you will make
`dev` the Production branch (next step), tick Production. Tick Preview too if you
want other branches to deploy with the same values. This is exactly where your
Neon connection string lives on Vercel: as `DATABASE_URL` under Settings,
Environment Variables.

### D3. Point Production at the dev branch

This is the key setting that makes the live URL track `dev`:

1. Open Project Settings, then Git.
2. Set Production Branch to `dev`.
3. Save.

How Vercel environments map after this:

- Production = your `dev` branch. Every push to `dev` rebuilds the main project
  URL. That is your push-and-see-it-live loop.
- Preview = any other branch or pull request, on a per-commit URL.

### D4. Deploy

1. Trigger a deploy (the first one, or Redeploy if you imported before changing
   the Production Branch).
2. When it finishes, copy your Vercel domain, for example
   `lakeview-xxx.vercel.app`.

Because your Clerk keys are development keys, sign-in works on that
`*.vercel.app` domain immediately. No Clerk domain step is required.

The deployed app uses the same Neon database you migrated in section C, so it
shares that schema and data.

### D5. Scheduled sync

`vercel.json` already defines a daily cron at 06:00 calling `/api/cron/sync`,
guarded by `CRON_SECRET`. Vercel Cron runs only on Production deployments, which
is why setting the Production Branch to `dev` matters. To trigger it by hand:

```powershell
curl "https://YOUR-VERCEL-DOMAIN/api/cron/sync?secret=YOUR_CRON_SECRET"
```

---

## E. Verify

1. Open your `*.vercel.app` URL.
2. Sign up, enter your invite code, and complete onboarding.
3. As an owner, add a property with an Airbnb iCal URL and click Sync calendar.
   Checkouts should appear as cleaning jobs.

If sign-in fails on Vercel, recheck the two Clerk keys in the Vercel environment
variables. If pages load but data fails, recheck `DATABASE_URL` in Vercel and
that section C's migrate succeeded against the same Neon database.

---

## Quick reference: where each secret goes

| Secret | Local (`.env.local`) | Vercel (Env Vars) |
| --- | --- | --- |
| Neon `DATABASE_URL` | yes | yes (Production) |
| Clerk publishable + secret keys | yes | yes (Production) |
| Clerk URL settings | yes | yes (Production) |
| `SIGNUP_INVITE_CODE` | yes | yes (Production) |
| `CRON_SECRET` | yes | yes (Production) |
