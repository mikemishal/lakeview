# Lakeview Technical Reference (dev branch)

Full technical documentation of the Lakeview application as it stands on the
forked `dev` branch. Covers every subsystem, the data model, all API routes,
shared libraries, components, scripts, build/CI, and configuration. Each item is
tagged to show whether this fork added it, changed it, or inherited it unchanged
from `main`.

- Repository: `Mfernandes86/lakeview` (fork), branch `dev`
- Upstream baseline: `mikemishal/lakeview`, branch `main` (merge-base `276a413`)
- Target HEAD: `4c75372`
- Delta from main: 53 files, +2845 / -413, 9 commits (02-06-2026 to 03-06-2026)
- Dates use `dd-MM-yyyy`. No file paths from build tooling are exposed.

## How to read the tags

Every documented file carries one tag:

- [NEW] - the file does not exist on `main`; this fork added it.
- [CHANGED] - the file exists on `main` and this fork modified it. The specific
  change is described.
- [INHERITED] - the file exists on `main` and this fork did not touch it. It is
  documented because it is part of the running application, but it is not part of
  this fork's work.

A consolidated list of every fork change (security patches, bug fixes, features,
refactors) with commits and dates is in section 14 at the end.

## 1. What the application is

Lakeview coordinates short-term-rental turnovers. A property owner connects an
Airbnb iCal calendar; Lakeview turns each checkout into a cleaning job that a
service provider can accept, start, and complete from a phone. Owners assign jobs
or self-assign, both sides get in-app notifications scoped to their own account,
providers can flag maintenance, restock, or damage, and same-day checkout and
check-in pairs are flagged as turnovers. The app is installable as a PWA.

Target user: owners with 1 to 10 listings who want turnover scheduling without a
full property-management suite.

## 2. Tech stack

- Next.js 15 (App Router) and React 19
- Prisma 6 with PostgreSQL (Neon in cloud)
- Clerk for authentication
- Leaflet 1.9 and react-leaflet 5 for maps
- Zod 3.25.76 for input validation ([NEW] dependency in this fork)
- node-ical for iCal parsing
- Playwright for end-to-end tests
- Deployed to Azure App Service via GitHub Actions; Vercel cron supported

## 3. Data model (prisma/schema.prisma) [INHERITED]

The schema is unchanged in this fork. CUID primary keys, `createdAt` and
`updatedAt` on every model. Summary of each model:

AccountProfile - the Clerk-backed user account. Key fields: `authUserId` (unique
Clerk id), `name`, `email`, `phone`, `companyName`, `onboardingComplete`,
`inviteCodeVerified`, `inviteCodeVerifiedAt`. This is the invite gate flag that
several fork changes now check.

OwnerProfile - a property owner. `authUserId` (optional, unique), contact fields,
and a full set of property-location fields including `propertyLatitude` and
`propertyLongitude` (populated by the geocoding feature). Has many Property and
Notification. Indexed on `authUserId`, `active`, `email`.

Property - a rental listing. `ownerProfileId` (optional, `onDelete: SetNull`),
`name`, `address`, `airbnbCalendarUrl` (required), plus optional descriptive
fields (bedrooms, bathrooms, squareFeet, maxGuests, check-in/out times, floor,
elevator, parking, access notes, cleaning notes, supply and laundry locations,
trash instructions, pet info, provider instructions). Has many CalendarEvent,
CleaningJob, Notification. Indexed on `ownerProfileId`.

CalendarEvent - one synced iCal entry. `propertyId`, `externalId` (iCal UID),
`summary`, `checkInDate`, `checkOutDate` (both stored at UTC midnight), `nights`,
`source`. Unique on `(propertyId, externalId)`. Optional one-to-one to a
CleaningJob. Indexed on `propertyId` and `checkInDate`.

CleaningJob - a unit of work. Links to Property (`onDelete: Cascade`), optional
CalendarEvent (`onDelete: SetNull`, unique), optional assigned ServiceProvider
(`onDelete: SetNull`). Carries `title`, `scheduledDate`, `jobSource`,
`requestedServiceType`, `priority`, `dueTime`, `estimatedDurationMinutes`,
`ownerInstructions`, `status`, `sourcePlatform`, `cleaningType`,
`ownerSelfAssigned`, lifecycle timestamps (`acceptedAt`, `startedAt`,
`completedAt`, `cancelledAt`), and issue flags (`maintenanceNeeded`,
`restockNeeded`, `damageFound`), plus free-text `notes`. Heavily indexed
(status, priority, scheduledDate, the three flags, etc.).

ServiceProvider - a cleaner or other provider. `authUserId` (optional, unique),
contact and company fields, `serviceType`, `primaryServiceType`, service-area
fields (`baseCity`, `baseState`, `baseZipCode`, `serviceRadiusMiles`,
`latitude`, `longitude`), rating fields, and rate fields in cents. Has many
CleaningJob, Notification, and ProviderCapability.

ProviderCapability - a service type a provider can perform. `(providerId,
serviceType)` unique, `active` flag.

Notification - an in-app message. `audienceType` ("owner" or "provider"),
optional `ownerProfileId`, `providerId`, `propertyId`, `cleaningJobId`, plus
`type`, `title`, `message`, `readAt`. All relations cascade-delete. Indexed on
audience, each foreign key, `readAt`, `createdAt`, `type`.

## 4. Authentication and access control

### lib/auth-access.ts [CHANGED]

Central auth helpers used by every owner- or provider-scoped route.

- `AuthAccessError` - error class carrying an HTTP status (401 or 403) so routes
  can map auth failures to the right response.
- `getRequiredAuthUserId()` - calls Clerk `auth()`, throws `AuthAccessError(401)`
  if not signed in, otherwise returns the Clerk user id.
- `getCurrentOwnerProfile()` / `getCurrentProviderProfile()` - look up the
  profile for the signed-in user; return null if none. Provider lookup includes
  capabilities.
- `requireOwnerProfile()` / `requireProviderProfile()` - wrap the getters and
  throw `AuthAccessError(403)` if the profile is missing.
- `canOwnerAccessProperty(ownerProfileId, propertyId)` - returns true only when
  `property.ownerProfileId === ownerProfileId`.
- `canOwnerAccessCleaningJob(ownerProfileId, jobId)` - same exact-match rule via
  the job's property.
- `canProviderAccessCleaningJob(providerId, jobId)` - true only when the job's
  `assignedProviderId` matches.

Fork change (`eba4dff`, 02-06-2026): removed the `ownerProfileId === null`
fallback that previously returned true in `canOwnerAccessProperty` and
`canOwnerAccessCleaningJob`. On `main`, any owner could access any unowned
(null-owner) property or job. Access now requires an exact owner match. This is
the change that requires the legacy backfill (section 12) to be run, or
null-owner records become inaccessible.

## 5. Onboarding and profiles

### app/api/onboarding/profile/route.ts [CHANGED]

GET - requires a signed-in user; returns the account, owner, and provider
profiles (any may be null) so the client can render the right onboarding state.

POST - creates or updates profiles in one call. Body carries `accountType`
("account", "owner", "provider", or "both"), `name`, optional `inviteCode`, and
conditional owner-location and provider fields. Behavior: reads the Clerk email,
validates name, enforces the invite code unless already verified, upserts the
AccountProfile with `onboardingComplete` and `inviteCodeVerified` true, then
upserts an OwnerProfile and/or ServiceProvider as requested. Provider creation
normalizes service-type aliases (for example "cleaner" to "cleaning"), requires
at least one capability, validates the primary service is among the
capabilities, and replaces capability rows. Returns all three profiles.

Fork change (`a155acc`, 03-06-2026): added error logging on POST failure so
onboarding errors are observable.

### app/api/current-owner/route.ts [INHERITED]

GET - returns the signed-in user's OwnerProfile or null. Used by dashboards to
decide whether the owner role is available.

### app/api/current-provider/route.ts [INHERITED]

GET - returns the signed-in user's ServiceProvider (with capabilities) or null.

### app/api/current-owner/claim-legacy-properties/route.ts [CHANGED]

PATCH - on `main` this bulk-assigned every null-owner Property to the calling
owner. That let any owner attach all orphaned properties to themselves
(cross-tenant data risk). Fork change (`eba4dff`): the endpoint is now a no-op
that still requires auth but returns `updatedCount: 0` and a message directing to
the server-side backfill. It is kept so the existing client call does not error.

### app/api/current-provider/claim-legacy-provider/route.ts [CHANGED]

PATCH - lets an onboarded user attach themselves to an unclaimed (null
`authUserId`) ServiceProvider record by `providerId`, setting `authUserId`,
`onboardingComplete`, and `active`. Fork change (`eba4dff`, +16 lines): added an
invite-verification gate at the top. Without it, any signed-in user could claim
any unclaimed provider profile (account takeover). It now returns 403 unless the
caller's AccountProfile has `inviteCodeVerified`. The code comments note a
per-provider claim token would be stronger; the invite gate is the pilot
mitigation.

## 6. Address and map geocoding (autofill)

This feature lets a user type an address or click a map to auto-fill the
property or service-area location fields. It is INHERITED from `main` (added
upstream in `359825e`); this fork only added error logging to the API route. It
is documented here in full because it was specifically asked about.

### app/api/geocode/route.ts [CHANGED]

GET - requires a signed-in user. Two modes:

- Forward search (`?q=<text>`): calls OpenStreetMap Nominatim `/search` with
  `format=jsonv2`, `addressdetails=1`, `limit=5`, maps each hit through
  `buildLocation`, drops any with non-finite coordinates, and returns
  `{ results }`.
- Reverse lookup (`?lat=&lng=`): calls Nominatim `/reverse`, maps the single
  result through `buildLocation`, returns `{ result }`.
- With neither parameter: returns 400.

`buildLocation(result)` - the core mapper. Converts a Nominatim row into the
app's location shape: `label` (display name), numeric `latitude`/`longitude`,
`country`, `state`, `city` (city or town or village fallback), `neighborhood`
(neighbourhood or suburb), `streetAddress` (house number plus road), and
`postalCode`. All requests send a `User-Agent` header as Nominatim requires.
Nominatim is a free service and needs no API key.

Fork change (`5e029ea`, 03-06-2026): added `log.error` with route context in the
catch block. Behavior is otherwise unchanged.

### components/onboarding/LocationPickerMap.tsx [INHERITED]

Leaflet map component. Props: `center`, `markerPosition`, optional `radiusMiles`,
and `onPickLocation(lat, lng)`. Renders an OpenStreetMap tile layer, a click
handler that fires `onPickLocation`, a marker at `markerPosition`, and (for
providers) a circle sized `radiusMiles * 1609.34` meters to visualize the
service radius. Zoom is 12 when a marker is set, otherwise 5.

### End-to-end autofill flow

1. User types an address and clicks find, or clicks a point on the map.
2. The onboarding page (`app/onboarding/page.tsx`, [INHERITED]) calls a forward
   geocode (`/api/geocode?q=`) or, on a map click, a reverse geocode
   (`/api/geocode?lat=&lng=`).
3. The route queries Nominatim and returns normalized location objects.
4. The page applies the result to the owner or provider location fields
   (country, state, city, neighborhood, street, postal code, latitude,
   longitude) and drops a marker. The user can edit before saving.

The same location fields exist on OwnerProfile and ServiceProvider in the schema,
which is where the autofilled values persist.

## 7. Properties

### app/api/properties/route.ts [CHANGED]

GET - requires an owner; returns that owner's properties ordered newest first.

POST - requires an owner; validates the body against the shared Zod
`createPropertySchema`, then passes `airbnbCalendarUrl` through
`normalizeCalendarUrl` for the SSRF guard, then creates the Property under the
owner.

Fork changes (`eba4dff`): (1) GET dropped the `OR ownerProfileId = null` clause,
so an owner no longer sees unowned properties; (2) POST replaced the hand-rolled
`parseNullableFloat` / `parseNullableInt` / `toNullableTrimmed` parsers with the
Zod schema; (3) added `log.error` on failure.

### app/api/properties/[propertyId]/route.ts [INHERITED]

GET - returns a single property after `requireOwnerProfile` and
`canOwnerAccessProperty` (404 if missing, 403 if not owned).

PATCH - partial update of any provided field with per-field parsing and
null-normalization; same access checks.

## 8. Calendar sync

The sync pipeline: validate the URL, fetch the iCal safely, parse it, store and
reconcile events, then generate jobs. The validation, fetch, and shared service
layers are the heart of the fork's calendar work.

### lib/calendar/validateCalendarUrl.ts [CHANGED]

`normalizeCalendarUrl(rawUrl)` - trims, converts `webcal://` to `https://`,
parses the URL, allows only http/https, rejects the host unless it passes the
allowlist, and returns the normalized string. Throws on any failure.

Private helpers: `getAllowedHostSuffixes()` (default provider list plus the
`LAKEVIEW_CALENDAR_HOST_ALLOWLIST` env var), `isAirbnbHost()` (regex matching
Airbnb and country variants like airbnb.co.uk), `isIpLiteralHost()` (rejects
IPv4 and IPv6 literals), and `isAllowedHost()` (combines the checks).

Fork change (`eba4dff`): this is the SSRF fix. On `main` the function accepted
any http/https URL. The default allowlist is Airbnb plus vrbo.com, homeaway.com,
booking.com, calendar.google.com, hospitable.com, hostaway.com, ownerrez.com,
lodgify.com, guesty.com.

### lib/calendar/fetchCalendar.ts [NEW]

`fetchCalendarIcs(rawUrl)` - the single safe fetch path. Normalizes the URL,
fetches with `cache: "no-store"`, `redirect: "error"`, a 10-second abort
timeout, and a custom User-Agent, rejects non-OK responses and bodies over 5 MB,
and returns `{ calendarUrl, text }`. Created (`eba4dff`) so both the preview
route and the per-property sync route share one set of SSRF protections.
`redirect: "error"` is what stops an allowed host from redirecting the server to
an internal address.

### lib/calendar/parseIcal.ts [CHANGED]

`parseIcalEvents(icsText)` - parses iCal text with node-ical, keeps VEVENTs with
valid dates, converts dates to YYYY-MM-DD, computes nights, filters out blocked
and past events, and sorts by check-in date. Returns `CalendarEventItem[]`.

Private helpers: `isValidDate()` and `isBlockedSummary()`.

Fork change (`eba4dff`): added `isBlockedSummary` (regex matching "not
available", "unavailable", "blocked") and a filter step so owner blocks and
maintenance holds never become cleaning jobs. Also changed the default summary
for an entry with no title from "Reserved / Blocked" to "Reserved", so a
missing summary is treated as a real reservation rather than filtered out.

### lib/calendar/calendarTypes.ts [INHERITED]

Shared types: `CalendarEventItem`, `CalendarSyncResponse`, `CalendarSyncError`.

### lib/calendar/syncService.ts [NEW]

The shared sync and job-generation logic, created (`eba4dff`) so the per-property
routes and the cron route behave identically.

`syncPropertyCalendar(property)` - fetches and parses the feed, then in a Prisma
transaction upserts every feed event by `(propertyId, externalId)`. It then
reconciles cancellations: events stored locally but absent from the feed are
deleted, and any linked job whose status is in `CANCELLABLE_JOB_STATUSES`
(`needs_assignment`, `assigned`, `accepted`, `declined`) is set to `cancelled`
with `cancelledAt`. Jobs that are `in_progress` or `completed` are preserved.
Reconciliation is skipped when the feed is empty, since an empty feed usually
means a transient fetch problem rather than every reservation being cancelled.
Returns `{ events, syncedCount, removedCount, cancelledJobCount }`.

`generateCleaningJobsForProperty(property)` - reads the property's stored events,
indexes them by check-in date to detect same-day turnovers, and for each event
determines the cleaning type (`turnover_cleaning` if another reservation checks
in the same day this one checks out, otherwise `checkout_cleaning`) and a title
of the form "Turnover cleaning - {name} - {checkout date}". If no job is linked
to the event it creates one with status `needs_assignment`; if a job exists but
its title, source platform, or cleaning type drifted it updates it; otherwise it
skips. Returns `{ createdCount, updatedCount, skippedCount }`. Existing
assignments and statuses are preserved.

### app/api/calendar/route.ts [CHANGED]

GET (`?url=`) - preview endpoint that fetches and parses a calendar without
saving it. Fork changes (`eba4dff`): now calls `requireOwnerProfile()` first (it
was open to anonymous callers on `main`, an SSRF exposure) and delegates the
fetch to `fetchCalendarIcs` instead of an inline fetch.

### app/api/properties/[propertyId]/sync/route.ts [CHANGED]

POST - owner-triggered sync of one property. Fork change (`eba4dff`): replaced
the inline fetch and upsert loop with a `syncPropertyCalendar` call and now
returns `syncedCount`, `removedCount`, and `cancelledJobCount`.

### app/api/properties/[propertyId]/events/route.ts [INHERITED]

GET - lists a property's stored events for the owner.

### app/api/properties/[propertyId]/cleaning-jobs/generate/route.ts [CHANGED]

POST - regenerates jobs from a property's events. Fork change (`eba4dff`):
refactored to call `generateCleaningJobsForProperty` from the shared service
instead of inlining the generation logic.

### app/api/cron/sync/route.ts [NEW]

Scheduled sync endpoint, created (`eba4dff`). Exposes both GET and POST. Auth is
a shared secret in `CRON_SECRET`, accepted as `Authorization: Bearer` or
`?secret=`, compared with `crypto.timingSafeEqual` (constant time, no length
leak). `runSync()` loads all properties and, for each one independently (so one
bad calendar does not abort the run), calls `syncPropertyCalendar` then
`generateCleaningJobsForProperty`, accumulating per-property results and ok and
failure counts. Runs on the Node runtime and is `force-dynamic`.

## 9. Cleaning jobs

Job lifecycle statuses: `needs_assignment`, `assigned`, `accepted`, `declined`,
`in_progress`, `completed`, `cancelled`. Cleaning types: `checkout_cleaning`,
`turnover_cleaning`, `ad_hoc_cleaning`, `ad_hoc_service`. All job-mutating routes
below are [INHERITED] except where noted; they are documented because they define
the running behavior.

### app/api/cleaning-jobs/[jobId]/route.ts [INHERITED]

GET - returns one job with property, calendar event, and provider, accessible to
the owning owner or the assigned provider.

### app/api/cleaning-jobs/[jobId]/status/route.ts [INHERITED]

PATCH - the lifecycle state machine. Validates the requested status, determines
the actor (owner or provider) and gates which transitions each may make (owner:
needs_assignment, assigned, cancelled always, plus in_progress and completed on
self-assigned jobs; provider: accepted, declined, in_progress, completed). Sets
the matching timestamp, clears assignment on decline or cancel, and creates a
notification to the counterpart (job accepted, declined, started, completed, or
cancelled).

### app/api/cleaning-jobs/[jobId]/assign-provider/route.ts [INHERITED]

PATCH (owner only) - assigns or unassigns a provider. When assigning it verifies
the provider is active and capable of the requested service, sets status to
`assigned`, and notifies the provider. Unassigning resets to `needs_assignment`.

### app/api/cleaning-jobs/[jobId]/self-assign/route.ts [INHERITED]

PATCH (owner only) - the owner takes the job themselves: `ownerSelfAssigned` true,
provider cleared, status `accepted`. No notification.

### app/api/cleaning-jobs/[jobId]/notes/route.ts [INHERITED]

PATCH (owner or provider) - trims and stores `notes`, notifies the owner when the
text actually changed.

### app/api/cleaning-jobs/[jobId]/issue-flags/route.ts [INHERITED]

PATCH (owner or provider) - sets any of `maintenanceNeeded`, `restockNeeded`,
`damageFound`. For flags newly turned on it notifies the owner with a formatted
label list ("Maintenance, Restock, and Damage").

### app/api/jobs/ad-hoc/route.ts [CHANGED]

POST - creates a one-off job not tied to a calendar event. Validates service type
and priority against fixed sets, parses the date and duration, optionally
validates an assigned provider, derives status (assigned, accepted if
self-assigned, else needs_assignment) and cleaning type (`ad_hoc_cleaning` or
`ad_hoc_service`), creates the job with `jobSource`/`sourcePlatform` "manual",
and notifies an assigned provider. Fork change (`eba4dff`): added `log.error`
with route context on failure.

### app/api/properties/[propertyId]/cleaning-jobs/route.ts [INHERITED]

GET - lists a property's jobs for the owner.

### app/api/service-providers/[providerId]/cleaning-jobs/route.ts [INHERITED]

GET (provider only, must match the path id and be active) - the provider's
assigned job queue, ordered by scheduled date.

## 10. Service providers and notifications

### app/api/service-providers/route.ts [CHANGED]

GET (`?serviceType=`) - lists providers, matching either direct service type or a
capability, with the "cleaner" to "cleaning" alias. POST - creates a provider and
its capability rows from a validated body, dedupes capabilities, and derives a
primary service. Fork change (`eba4dff`): added `log.error` to both GET and POST
failure paths; behavior is otherwise unchanged.

### app/api/service-providers/unclaimed/route.ts [CHANGED]

GET - lists active, unclaimed (null `authUserId`) providers for the claim UI.
Fork change (`eba4dff`): now requires the caller's account to be
`inviteCodeVerified` (returns an empty list otherwise) and selects only
non-sensitive fields (id, name, companyName, serviceType, primaryServiceType,
capabilities) instead of full provider records that included contact details.

### lib/notifications.ts [CHANGED]

`createNotification(input)` - writes one Notification row. Fork change
(`eba4dff`): for owner-audience notifications without an explicit
`ownerProfileId`, it now derives the owner from the related property
(`propertyId` to `property.ownerProfileId`). On `main` such a notification was
silently dropped, so owners could miss notifications; this both fixes that bug
and keeps every notification scoped to a single owner. Failures are caught and
logged rather than thrown.

### app/api/notifications/route.ts [CHANGED]

GET (`?audienceType=`, optional `unreadOnly`) - returns the signed-in user's
notifications, newest first, limited to 25, with related job/property/provider.
Fork change (`eba4dff`): removed the branch that allowed a caller to request
another owner's notifications via an `ownerId` parameter; results are now always
scoped to the signed-in owner. Added `log.error` on failure.

### app/api/notifications/[notificationId]/read/route.ts [INHERITED]

PATCH - marks one notification read after verifying the caller (owner or
provider) is its audience.

### app/api/notifications/read-all/route.ts [INHERITED]

PATCH - marks all of the caller's unread notifications read via `updateMany`.

## 11. Dashboards, UI components, PWA, and demo

### app/owner/OwnerDashboardClient.tsx [CHANGED]

The owner workspace: tabs for overview, jobs, calendar, properties, providers,
and a developer area; property and provider CRUD; ad-hoc job creation; a
notification-driven job queue with future/past/issue filters; and 10-second
polling. Fork change (`eba4dff`): cosmetic only - the eyebrow label changed from
"Project Lakeview" to "Owner workspace" in blue. The functional behavior is
inherited.

### app/provider/ProviderDashboardClient.tsx [CHANGED]

The provider workspace: assigned-job queue, calendar and list views, issue
flagging, notes, notification feed, legacy-provider claim, and 10-second polling.
Fork change (`eba4dff`): cosmetic only - eyebrow label changed to "Provider
workspace" in green.

### components/AppHeader.tsx [CHANGED]

Global header with role badge, navigation, and Clerk user button. Fork change
(`eba4dff`): added role-based accent coloring - a blue bottom border and chip for
owner, green for provider, neutral otherwise.

### components/PropertyForm.tsx [CHANGED]

Property create/edit form. Fork change (`eba4dff`): the optional fields are now
collapsed behind an "Add details (optional)" toggle (expanded by default when
editing), and the default check-in/check-out inputs changed from free text to
`type="time"` pickers.

### components/CleaningJobCard.tsx, JobDetailsPanel.tsx, CleanerSchedule.tsx [CHANGED]

Job display and provider schedule components. Fork change (`eba4dff`): activity
timestamps now format in the viewer's local timezone via `getBrowserTimeZone()`
instead of a hardcoded zone.

### components/NotificationPanel.tsx [CHANGED]

Notification feed with mark-read and mark-all-read. Fork change (`eba4dff`):
timestamp formatting aligned to the browser timezone helper.

### components/Toast.tsx [NEW]

A lightweight global toast system created (`eba4dff`). Exports `ToastProvider`
(mounted once in the root layout) and `useToast()`, which returns `notify(type,
message)`. Toasts render success (emerald), error (rose), or info (slate) and
auto-dismiss after 5 seconds. Used for non-blocking form feedback.

### app/layout.tsx [CHANGED]

Root layout. Fork change (`eba4dff`): wrapped children in `ToastProvider` (inside
`ClerkProvider`) so toasts are available app-wide. PWA registration and metadata
were already present on `main`.

### app/page.tsx [CHANGED]

Landing page. Fork change (`eba4dff`): rebranded from "Project Lakeview /
Short-term rental operations dashboard" to the "Never miss a turnover" value
proposition, and added a signed-out three-step explainer (Connect, Jobs appear,
Done).

### Inherited UI and PWA pieces [INHERITED]

`components/RoleSwitcher.tsx`, `MobileBottomNav.tsx`, `ServiceProviderForm.tsx`,
`EmptyState.tsx`, `CalendarSyncForm.tsx`, `CalendarEventCard.tsx`,
`CleaningJobCalendar.tsx`, `AdHocJobForm.tsx`, `ProviderJobCalendar.tsx`,
`app/manifest.ts` (PWA web manifest: standalone display, theme color #0f2742,
icon set), and `components/PwaRegistration.tsx` (registers `/sw.js`) are all
unchanged. PWA install support is a pre-existing feature, not a fork addition.

### app/demo/page.tsx [NEW]

A public, no-auth demo page created (`eba4dff`). It toggles between owner and
provider views over hardcoded sample data (three properties, three providers,
five jobs), shows KPI cards and job lists, and lets the visitor advance a job
through its statuses with toast feedback. Dates render `dd-MM-yyyy`. It uses
local state only; nothing persists.

### prisma/seed-demo.ts [NEW]

A destructive demo seed created (`eba4dff`) that targets the
`@lakeview-demo.local` domain so it only clears and rebuilds demo records. It
creates a demo owner (Lakeview Rentals), three providers (one claimed, two
unclaimed, with ratings and rates), three properties, seven calendar events
including a same-day turnover, six calendar-linked jobs spanning all statuses
plus one ad-hoc maintenance job, and three unread notifications. Optional
`DEMO_OWNER_CLERK_ID` and `DEMO_PROVIDER_CLERK_ID` link the demo records to real
Clerk users. Run with `npm run db:seed:demo`.

## 12. Shared libraries

### lib/logger.ts [NEW]

Minimal structured logger created (`eba4dff`). `log.info/warn/error(message,
context?)` each emit one JSON line (`level`, `message`, ISO `time`, plus
context) to the matching console method, so the sink can later be swapped for
pino or Azure Monitor without touching call sites.

### lib/validation/enums.ts [NEW]

Closed Zod enums (`eba4dff`): `serviceTypeEnum`, `priorityEnum`, `jobStatusEnum`,
`cleaningTypeEnum`, with inferred TypeScript types. They mirror the strings the
routes already accept, rejecting out-of-set values at the boundary without
changing behavior.

### lib/validation/property.ts [NEW]

Shared property Zod schema (`eba4dff`). `optionalText` trims and blanks to null;
`optionalNumber` accepts numbers or numeric strings, blanks to null, and rejects
non-numeric input. `createPropertySchema` requires `name` and
`airbnbCalendarUrl` and treats the rest as optional. Used by the properties route
so client and server validate identically. The calendar URL still passes through
`normalizeCalendarUrl` afterward for the SSRF guard.

### lib/date/dateUtils.ts [CHANGED]

Date helpers. `toDateOnly(date)` (UTC YYYY-MM-DD), `daysBetween(start, end)`
(nights, clamped at 0), `formatDate(isoDate)` (human-readable). Fork changes
(`eba4dff`): the formatter switched to `en-GB` with an explicit `timeZone: "UTC"`
to stop calendar dates rendering a day early for users in negative offsets, and a
new `getBrowserTimeZone()` returns the viewer's IANA zone (fallback UTC) for
formatting real activity timestamps locally.

### lib/prisma.ts [INHERITED]

Singleton PrismaClient reused via `globalThis` to avoid connection churn on hot
reload; verbose logging in development, errors only in production.

## 13. Scripts, build, CI, and configuration

### scripts/backfill-owner-ids.ts [NEW]

Legacy data migration (`eba4dff`). Assigns every null-owner Property to a target
owner and backfills owner Notification ownership from the related property. Dry
run by default; `--apply` writes. The target must be given explicitly with
`--owner-id` or `--owner-email` so records are never assigned to the wrong
account. Run with `npm run db:backfill-owner-ids`. PowerShell usage is in the
script header.

### scripts/clear-operational-data.ts [INHERITED]

Deletes jobs, events, and properties while keeping providers and accounts, for a
clean test reset.

### prisma/seed.ts [INHERITED]

Development seed: two Chicago properties, three providers, calendar events at
several offsets, and twelve jobs across all statuses.

### package.json [CHANGED]

Fork changes: the `build` script now runs `prisma generate && prisma migrate
deploy && next build` (`6f62fb8`, 03-06-2026), so migrations apply during the
build. New scripts `typecheck` (`tsc --noEmit`), `db:backfill-owner-ids`, and
`db:seed:demo`. Added `zod` as a dependency, pinned to `3.25.76` (`4c75372`,
03-06-2026).

### .github/workflows/deploy-azure.yml [CHANGED]

Fork change (`eba4dff`): added a `verify` job (install, prisma generate, lint,
`tsc --noEmit`) and an `e2e` job (depends on verify, installs Playwright
Chromium, runs the e2e suite against test secrets, uploads the report). Deploy
depends on the gate. The e2e job is wired to become a required check once a test
database and Clerk test instance exist.

### .github/workflows/sync-cron.yml [NEW]

Created (`eba4dff`). Calls `POST /api/cron/sync` on the production URL every 3
hours (UTC) with the `CRON_SECRET` bearer token; also supports manual dispatch.
GitHub schedules are best-effort; an Azure WebJob or external cron can call the
same endpoint for tighter timing.

### vercel.json [NEW]

Created (`6f62fb8`). A Vercel cron hitting `/api/cron/sync` daily at 06:00.

### .env.local.example [NEW]

Created (`eba4dff`). Template of all required variables.

### .gitignore and .gitattributes [CHANGED / NEW]

Fork change (`eba4dff`): ignore rules added for env files, deployment zips, and
Azure publish profiles (the committed publish profile was removed at the baseline
boundary); `.gitattributes` normalizes line endings to LF and marks binaries.

### Documentation files

`README.md` [CHANGED] rewritten to describe the full product, calendar URL
safety, scheduled sync, and scripts. `DEPLOYMENT.md` [CHANGED] updated for the
new variables and migration step. `LOCAL-TESTING.md`, `DEMO.md`, and `docs/`
(`PRODUCT-OVERVIEW.md`, `OWNER-GUIDE.md`, `PROVIDER-GUIDE.md`, `QUICKSTART.md`,
`SERVICES-SETUP.md`) are all [NEW] (`eba4dff`, `be51f8a`).

### Environment variables (complete list)

| Variable | Purpose | Required | Introduced |
| --- | --- | --- | --- |
| DATABASE_URL | PostgreSQL connection | Yes | inherited |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Clerk public key | Yes | inherited |
| CLERK_SECRET_KEY | Clerk secret key | Yes | inherited |
| NEXT_PUBLIC_CLERK_SIGN_IN_URL | Sign-in route | Yes | inherited |
| NEXT_PUBLIC_CLERK_SIGN_UP_URL | Sign-up route | Yes | inherited |
| NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL | Post sign-in redirect | Yes | inherited |
| NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL | Post sign-up redirect | Yes | inherited |
| SIGNUP_INVITE_CODE | Onboarding invite gate | Yes | inherited |
| CRON_SECRET | Authenticates the cron sync endpoint | Yes for scheduled sync | fork (`eba4dff`) |
| LAKEVIEW_CALENDAR_HOST_ALLOWLIST | Extra allowed calendar hosts, comma separated | Optional | fork (`eba4dff`) |

## 14. Consolidated change log (this fork only)

### Security patches

1. SSRF fix on calendar fetch - host allowlist, IP-literal rejection,
   webcal normalization (`lib/calendar/validateCalendarUrl.ts`), plus
   redirect-error, timeout, and size cap (`lib/calendar/fetchCalendar.ts`).
   `eba4dff`, 02-06-2026.
2. Calendar preview route now requires a signed-in owner
   (`app/api/calendar/route.ts`). `eba4dff`.
3. Owner-scoped access - removed the null-owner access fallback
   (`lib/auth-access.ts`, `app/api/properties/route.ts`). `eba4dff`.
4. Owner-scoped notifications - removed cross-owner read path
   (`app/api/notifications/route.ts`). `eba4dff`.
5. Bulk legacy property claim disabled (`claim-legacy-properties`). `eba4dff`.
6. Provider claim gated behind invite verification
   (`claim-legacy-provider`); unclaimed list gated and field-limited
   (`service-providers/unclaimed`). `eba4dff`.
7. Cron endpoint authenticated with constant-time secret compare
   (`app/api/cron/sync/route.ts`). `eba4dff`.
8. Azure publish profile removed; ignore rules added. `eba4dff`.

### Bug fixes

1. Owner blocks no longer become cleaning jobs - blocked-summary filter and
   "Reserved" default (`lib/calendar/parseIcal.ts`). `eba4dff`.
2. Cancelled reservations reconciled - stale events removed and not-yet-started
   jobs cancelled (`lib/calendar/syncService.ts`). `eba4dff`.
3. Off-by-one-day dates fixed by UTC formatting (`lib/date/dateUtils.ts`).
   `eba4dff`.
4. Owner notifications no longer dropped - owner derived from property
   (`lib/notifications.ts`). `eba4dff`.

### Features added

1. Scheduled sync - `POST /api/cron/sync` plus the shared
   `lib/calendar/syncService.ts`, the GitHub Actions `sync-cron.yml`, and the
   Vercel cron in `vercel.json`. `eba4dff`, `6f62fb8`.
2. Zod validation layer (`lib/validation/property.ts`,
   `lib/validation/enums.ts`). `eba4dff`, `4c75372`.
3. Structured logging (`lib/logger.ts`) and onboarding/geocode/properties/ad-hoc
   error logging. `eba4dff`, `a155acc`, `5e029ea`.
4. Global toast system (`components/Toast.tsx`, wired in `app/layout.tsx`).
   `eba4dff`.
5. Public demo page and demo seed (`app/demo/page.tsx`, `prisma/seed-demo.ts`).
   `eba4dff`.
6. Owner-id backfill script (`scripts/backfill-owner-ids.ts`). `eba4dff`.
7. CI quality gate - verify and e2e jobs (`deploy-azure.yml`). `eba4dff`.
8. Migrations run during build (`package.json`, `vercel.json`). `6f62fb8`.

### UX and refactor changes

1. Local-timezone activity timestamps via `getBrowserTimeZone()`
   (CleaningJobCard, JobDetailsPanel, CleanerSchedule, NotificationPanel).
   `eba4dff`.
2. Collapsible optional fields and time pickers in PropertyForm. `eba4dff`.
3. Role-based color accents in AppHeader; "workspace" rebrand on both
   dashboards; "Never miss a turnover" landing page with a three-step
   explainer. `eba4dff`.
4. Properties route and generate route refactored onto the shared validation and
   sync layers. `eba4dff`.
5. README and docs set rewritten/added. `eba4dff`, `bd90509`, `be51f8a`.

### Commit reference

| Commit | Date (dd-MM-yyyy) | Summary |
| --- | --- | --- |
| 4c75372 | 03-06-2026 | zod version update to 3.25.76 |
| 6f62fb8 | 03-06-2026 | Run migrations during Vercel build |
| a155acc | 03-06-2026 | add onboarding error logging |
| be51f8a | 03-06-2026 | updated quickstart files |
| 5e029ea | 03-06-2026 | push changes |
| eba4dff | 02-06-2026 | Harden security and calendar sync (main change set) |
| bd90509 | 02-06-2026 | Updated README |
| d00dc5d, 43b618b | 02-06-2026 | merge commits |
