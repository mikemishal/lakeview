# Lakeview E2E Testing (Owner/Provider)

This project includes Playwright E2E coverage for the owner/provider workflow using dedicated Clerk test accounts.

## Safety Rules

- Use dedicated E2E Clerk accounts only.
- Never use personal production accounts.
- Never commit real secrets or `.env`.
- Never commit Playwright auth state files (`playwright/.auth/*`).
- Tests are fail-fast: when a critical step fails, the test throws and stops.
- Tests do not auto-rollback or auto-clean non-E2E data.

## Clerk Account Prerequisites

- Use dedicated Clerk E2E users only.
- Ensure password sign-in is enabled for these users.
- Disable 2FA for unattended setup runs (`npm run test:e2e:setup`) unless you implement a deterministic second-factor automation path.

## Required Environment Variables

Set in `.env`:

- `E2E_OWNER_EMAIL`
- `E2E_OWNER_PASSWORD`
- `E2E_PROVIDER_EMAIL`
- `E2E_PROVIDER_PASSWORD`
- `E2E_AIRBNB_ICAL_URL`

Optional:

- `E2E_BASE_URL` (default: `http://localhost:3100`)

Playwright uses a dedicated E2E dev server command that clears `.next` before startup to avoid stale chunk/module errors during auth/setup runs.

## Run Commands

- Setup auth state only:
  - `npm run test:e2e:setup`
- Full E2E suite:
  - `npm run test:e2e`
- Headed:
  - `npm run test:e2e:headed`
- Playwright UI mode:
  - `npm run test:e2e:ui`

## Projects

Playwright projects are configured as:

- `setup` (creates auth state files)
- `owner` (owner-focused flow tests)
- `provider` (provider-focused flow tests)

## Artifacts and Diagnostics

On failure:

- screenshot: `only-on-failure`
- trace: `retain-on-failure`
- video: `retain-on-failure`

Artifacts are written to Playwright output directories and can be inspected with Playwright UI.

## Test Data Strategy

E2E uses prefixed records where possible:

- `E2E Lakeview Test Property`
- `E2E Cleaning Job`
- `E2E Provider Note`
- `E2E Test Issue`

Behavior:

- Reuse existing E2E records where possible
- Avoid modifying non-E2E records
- No automatic cleanup by default

## Authentication Notes

- Tests sign in through real Clerk UI (`/sign-in`)
- No auth bypass is added to app code
- Route protection remains unchanged
