# Quickstart (owners and providers)

The shortest path for both roles. Part 1 is using the app. Part 2 is the
technical setup to get an instance running.

## Part 1: Use the app

Everyone starts the same way:

1. Click Sign up and create an account.
2. At onboarding, enter the invite code.
3. Choose your role: Owner, Provider, or set up both from the same account.
4. Complete the short profile and save.

Owners then:

1. Add a property and paste its Airbnb iCal calendar URL.
2. Click Sync calendar. Checkouts become cleaning jobs, and same-day turnovers
   are flagged.
3. Assign jobs to a provider (or self-assign) and watch the status change.

Providers then:

1. Open the provider dashboard to see jobs assigned to you.
2. Accept, mark in progress, and mark completed as you work.
3. Flag maintenance, restock, or damage if needed. The owner is notified.

Both roles can install Lakeview on a phone (PWA): iPhone uses Safari, Share, Add
to Home Screen; Android uses Chrome, menu, Add to Home screen.

For more detail, see docs/OWNER-GUIDE.md and docs/PROVIDER-GUIDE.md. For what the
product is and who it serves, see docs/PRODUCT-OVERVIEW.md.

## Part 2: Stand up an instance

This is the minimum to get the `dev` branch running and live. Full steps,
including Vercel and Clerk, are in LOCAL-TESTING.md.

```powershell
cd C:\Users\Mike\Documents\GitHub\lakeviewv2
git checkout dev

Copy-Item .env.local.example .env.local
notepad .env.local   # fill in DATABASE_URL, the two Clerk keys, SIGNUP_INVITE_CODE, CRON_SECRET

npm install
npx prisma migrate deploy
npx prisma generate
npm run dev
```

Open http://localhost:3000.

To deploy: import your fork into Vercel, add the same environment variables, set
Production Branch to `dev`, and add your Vercel domain to your Clerk instance.
See LOCAL-TESTING.md for the full deploy and cron details.
