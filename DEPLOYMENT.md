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
- CALENDAR_SYNC_SECRET

For the current test environment, set SIGNUP_INVITE_CODE to GCMIKE.
In Azure App Service, configure SIGNUP_INVITE_CODE under Application Settings.

For scheduled calendar sync, configure CALENDAR_SYNC_SECRET in Azure App Service Application Settings.

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

## Scheduled Calendar Sync (Every 6 Hours)

This project includes a protected endpoint for background calendar sync:

- `POST /api/properties/sync-scheduled`
- Requires header: `x-calendar-sync-secret: <CALENDAR_SYNC_SECRET>`

Behavior:

- Syncs calendars for active owned properties.
- Updates `calendarLastSyncedAt` only when a property sync succeeds.
- Returns per-property success/error results.

GitHub Actions scheduler:

- Workflow: `.github/workflows/calendar-sync-6h.yml`
- Schedule: every 6 hours (`0 */6 * * *`)

Required GitHub repository secrets:

- `APP_BASE_URL` (for example, `https://your-app.azurewebsites.net`)
- `CALENDAR_SYNC_SECRET` (must match the app setting)
