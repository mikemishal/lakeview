# Deployment

## Required Environment Variables

Set the following variables in your deployment platform:

- DATABASE_URL
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- CLERK_SECRET_KEY
- NEXT_PUBLIC_CLERK_SIGN_IN_URL
- NEXT_PUBLIC_CLERK_SIGN_UP_URL
- NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
- NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL
- SIGNUP_INVITE_CODE

- CRON_SECRET - shared secret required to call the scheduled sync endpoint
  (`/api/cron/sync`). Set the same value as the GitHub Actions `CRON_SECRET`
  secret used by the scheduled-sync workflow.

Optional:

- LAKEVIEW_CALENDAR_HOST_ALLOWLIST - comma separated extra calendar host domains
  allowed for fetching (Airbnb is always allowed). Example:
  `vrbo.com,calendar.google.com`.

In Azure App Service, configure these under Application Settings. Set
SIGNUP_INVITE_CODE to your chosen invite code (do not commit it to the repo).

## Secrets

Never commit deployment secrets. The Azure publish profile is consumed in CI via
the `AZURE_WEBAPP_PUBLISH_PROFILE` GitHub Actions secret, not a file in the repo.
If a publish profile or password is ever committed, rotate it in the Azure portal
(App Service, Deployment Center, Manage publish profile) and remove it from git
history.

## Database Migrations

Migrations run automatically in CI during deploy (`prisma migrate deploy` in the
GitHub Actions workflow). For a manual or first-time setup:

## Database Setup

1. Create a hosted PostgreSQL database.
2. Set DATABASE_URL to your hosted PostgreSQL connection string.
3. Run:

```bash
npx prisma migrate deploy
npx prisma generate
```

## Local Development Note

After switching the Prisma provider to PostgreSQL, local development also needs a PostgreSQL DATABASE_URL.
If keeping SQLite locally is desired later, use separate schema/config setups. This is not implemented in the current setup.

## Vercel Deployment Note

1. Add all required environment variables in the deployment provider settings.
2. Install command:

```bash
npm install
```

3. Build command:

```bash
npm run build
```
