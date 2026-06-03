# Changelog

All notable changes added to the forked `dev` branch (origin: `Mfernandes86/lakeview`)
on top of `main`. Format loosely follows Keep a Changelog. Dates use `dd-MM-yyyy`.

Baseline: `main` (merge-base `276a413`). Target: `dev` (HEAD `4c75372`).
Net change: 54 files, +2845 / -413 lines.

## [dev] - 03-06-2026

### Security

- Fix SSRF on calendar fetch. External calendar URLs are now validated against a
  host allowlist (Airbnb plus configurable providers), IP-literal hosts are
  rejected, and `webcal://` is normalised to `https://`. (`eba4dff`)
- Block host-to-internal redirects. The shared fetch helper uses `redirect: "error"`,
  a 10s abort timeout, and a 5 MB response cap. (`eba4dff`)
- Require a signed-in owner on the calendar preview route `GET /api/calendar`.
  It was previously open to anonymous callers. (`eba4dff`)
- Scope properties to the owner. Removed the `ownerProfileId = null` fallback that
  let any owner read or access unowned properties and jobs. (`eba4dff`)
- Scope notifications to the owner. Removed cross-owner read path on
  `GET /api/notifications`; owner notifications are derived from the related
  property's owner when not passed explicitly. (`eba4dff`)
- Disable bulk legacy property claim. `PATCH /api/current-owner/claim-legacy-properties`
  no longer reassigns properties (it was a cross-tenant data risk). Legacy data is
  now migrated server-side by a script. (`eba4dff`)
- Gate the unclaimed provider list behind invite verification and return only
  non-sensitive fields. (`eba4dff`)
- Remove the committed Azure publish profile from the repo and add `.gitignore` /
  `.gitattributes` rules to prevent re-committing secrets. (`eba4dff`, `276a413`)
- Authenticate the cron sync endpoint with a constant-time secret comparison
  (`timingSafeEqual`). (`eba4dff`)

### Added

- Shared calendar sync service (`lib/calendar/syncService.ts`) used by both the
  per-property routes and the scheduled cron route. (`eba4dff`)
- Scheduled sync endpoint `POST /api/cron/sync` that re-syncs every property and
  regenerates cleaning jobs, guarded by `CRON_SECRET`. (`eba4dff`)
- Scheduled triggers: GitHub Actions workflow `sync-cron.yml` (every 3 hours) and
  `vercel.json` cron (daily 06:00). (`eba4dff`, `6f62fb8`)
- Structured JSON logger (`lib/logger.ts`) and onboarding error logging. (`eba4dff`, `a155acc`)
- Zod validation layer: shared property schema (`lib/validation/property.ts`) and
  closed enums (`lib/validation/enums.ts`). `zod` added as a dependency and later
  pinned to `3.25.76`. (`eba4dff`, `4c75372`)
- Reusable `fetchCalendar.ts` and `validateCalendarUrl.ts` calendar safety helpers. (`eba4dff`)
- Owner-id backfill script (`scripts/backfill-owner-ids.ts`), dry-run by default,
  `--apply` to write. (`eba4dff`)
- Demo data seed (`prisma/seed-demo.ts`), demo page (`app/demo/page.tsx`), and a
  `Toast` component. (`eba4dff`)
- Documentation set: `LOCAL-TESTING.md`, `DEMO.md`, `.env.local.example`, and the
  `docs/` guides (product overview, owner guide, provider guide, quickstart,
  services setup). (`eba4dff`, `be51f8a`)
- CI quality gate in `deploy-azure.yml`: a `verify` job (lint + `tsc --noEmit`) and
  an `e2e` Playwright job that deploy depends on. (`eba4dff`)
- New npm scripts: `typecheck`, `db:backfill-owner-ids`, `db:seed:demo`. (`eba4dff`)

### Changed

- `parseIcal.ts` now filters blocked or unavailable iCal entries
  ("not available", "unavailable", "blocked") so owner holds do not become jobs.
  Unknown summaries default to `Reserved` instead of `Reserved / Blocked`. (`eba4dff`)
- Sync reconciles cancelled reservations: stored events missing from the feed are
  removed and any not-yet-started job is cancelled (skipped when the feed is empty). (`eba4dff`)
- Dates are formatted in UTC (`en-GB`) to avoid off-by-one-day display for negative
  timezone offsets; added `getBrowserTimeZone()` for local activity timestamps. (`eba4dff`)
- `app/api/properties` and related routes refactored to validate input through the
  shared Zod schema instead of hand-rolled parsers. (`eba4dff`)
- Vercel build now runs `prisma migrate deploy` as part of `build`. (`6f62fb8`)
- README rewritten to describe the full turnover-coordination product, calendar
  URL safety, scheduled sync, and scripts. (`bd90509`, `eba4dff`)

### Fixed

- Owner notifications now resolve `ownerProfileId` from the related property so
  owners no longer miss or cross-see notifications. (`eba4dff`)
- Onboarding profile route gains error logging for failed profile creation. (`a155acc`)

## Commit reference

| Commit | Date (dd-MM-yyyy) | Summary |
| --- | --- | --- |
| `4c75372` | 03-06-2026 | zod version update to 3.25.76 |
| `6f62fb8` | 03-06-2026 | Run migrations during Vercel build |
| `a155acc` | 03-06-2026 | add onboarding error logging |
| `be51f8a` | 03-06-2026 | updated quickstart files |
| `5e029ea` | 03-06-2026 | push changes |
| `eba4dff` | 02-06-2026 | Harden security and calendar sync (main change set) |
| `bd90509` | 02-06-2026 | Updated README |
