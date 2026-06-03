# Local testing and deployment (dev branch)

This guide gets the `dev` branch running on your machine and live on Vercel.
You use your own free Clerk development instance and your own Neon database, so
nothing here touches the original (upstream) project's accounts or secrets.

Commands are PowerShell. Dates use the dd-MM convention.

## Prerequisites

- Node 20 or newer and git installed.
- A Neon Postgres connection string (you have this).
- A Clerk application created (you have this). Use its Development instance keys.
- A Vercel account connected to GitHub (you have this).

Network access is required: Clerk auth and the Neon database are hosted, so
"local" here means your local dev server, not offline.

## 1. Get the repo and switch to dev

If you already have the repo cloned, just make sure you are on `dev`:

```powershell
cd C:\Users\Mike\Documents\GitHub\lakeviewv2
git checkout dev
git pull origin dev
```

Fresh clone (your fork, not the upstream repo):

```powershell
git clone https://github.com/Mfernandes86/lakeview.git
cd lakeview
git checkout dev
```

Why dev: your `dev` branch is about 1,600 lines ahead of `main` (security
hardening, the calendar sync refactor, input validation, demo seed). Deploy and
test `dev`, not `main`.

## 2. Create .env.local

A template named `.env.local.example` is in the repo root. Copy it and fill in
your values:

```powershell
Copy-Item .env.local.example .env.local
notepad .env.local
```

Fill in four things:

1. `DATABASE_URL` - your Neon string. The non-pooled (direct) string is fine for
   both migrations and runtime at test volume.
2. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - your Clerk dev key (`pk_test_...`).
3. `CLERK_SECRET_KEY` - your Clerk dev key (`sk_test_...`).
4. `SIGNUP_INVITE_CODE` - pick any code. You type this once during onboarding.

Also set `CRON_SECRET` to a long random string. The other Clerk URL values in
the template can stay as they are.

`.env.local` is gitignored, so it is never committed.

## 3. Install, migrate, run

```powershell
npm install
npx prisma migrate deploy
npx prisma generate
npm run dev
```

`npm run dev` serves the app at http://localhost:3000.

`prisma migrate deploy` applies the three existing migrations to your Neon
database, creating all tables. `prisma generate` builds the typed Prisma client
(the `build` script also runs this automatically on Vercel).

## 4. First run check

1. Open http://localhost:3000.
2. Click Sign up and create an account with your Clerk dev instance.
3. You land on onboarding. Enter your `SIGNUP_INVITE_CODE`, choose Owner or
   Provider (or set up both), and complete the profile.
4. As an owner, add a property with an Airbnb iCal URL, then Sync calendar.
   Checkouts become cleaning jobs.

If sign-in fails, recheck the two Clerk keys in `.env.local`. If the page loads
but data calls fail, recheck `DATABASE_URL` and that step 3 migrate succeeded.

## 5. The edit loop

Edit a file, save, and the page hot-reloads. When a change is good:

```powershell
git add -A
git commit -m "your change"
git push origin dev
```

## 6. Deploy dev to Vercel

1. Go to vercel.com, Add New, Project, and import your fork
   (`Mfernandes86/lakeview`). Vercel auto-detects Next.js. No build settings to
   change: the `build` script already runs `prisma generate && next build`.
2. Before the first deploy, expand Environment Variables and add every key from
   your `.env.local` (same names, same values). Add them for Production and
   Preview.
3. Click Deploy. The first build uses `main` by default.
4. To make the live URL track `dev`: Project Settings, Git, set Production
   Branch to `dev`, then redeploy. Now every push to `dev` rebuilds the main
   project URL. That is your push-and-see-it-live loop.

If you leave Production as `main`, pushes to `dev` still deploy automatically as
Preview URLs, with a stable `...-git-dev-...vercel.app` alias.

## 7. Clerk on the Vercel domain

No Clerk domain configuration is needed for testing. Development keys
(`pk_test_` / `sk_test_`) work on `localhost` and on any `*.vercel.app` URL as
long as those keys are set in your Vercel environment variables (step 6). You
cannot, and do not need to, add a domain to a Clerk development instance.

You only configure a domain later if you move to a Clerk Production instance on
a custom domain. A `*.vercel.app` URL cannot be a Clerk production domain, so
the development instance is the right choice for this pilot. For the full
account-by-account walkthrough, see docs/SERVICES-SETUP.md.

The deployed app uses the same Neon database you migrated in step 3, so it
shares that schema and data. If you later point Vercel at a different database,
run `npx prisma migrate deploy` against it once.

## 8. Scheduled calendar sync

`vercel.json` already defines a daily cron at 06:00 that calls `/api/cron/sync`.
That endpoint requires your `CRON_SECRET`. To trigger it manually:

```powershell
curl "https://YOUR-VERCEL-DOMAIN/api/cron/sync?secret=YOUR_CRON_SECRET"
```

Note: Vercel Cron runs on Production deployments. It will not fire on Preview
URLs, so set Production Branch to `dev` (step 6) if you want the cron to run.

## 9. Pulling upstream updates later

Your fork already has the upstream remote configured. To bring in your friend's
latest changes:

```powershell
git fetch upstream
git checkout dev
git merge upstream/dev
```

Resolve any conflicts, test locally, then `git push origin dev`.

## Notes

- GitHub Actions are disabled by default on forks. The repo's Azure deploy
  workflow and the sync-cron workflow will not run unless you enable Actions and
  add matching secrets. On Vercel you can leave the Azure workflow disabled.
- Fully local database (optional): run Postgres in Docker and point
  `DATABASE_URL` at it.

  ```powershell
  docker run --name lakeview-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
  # DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
  ```

  Clerk still needs network even with a local database.
- Pooling: the Neon non-pooled string works now. If you later hit connection
  limits on Vercel's serverless runtime, switch `DATABASE_URL` to the pooled
  Neon string and add a Prisma `directUrl` (non-pooled) for migrations. This is
  an optimization, not a blocker for testing.
