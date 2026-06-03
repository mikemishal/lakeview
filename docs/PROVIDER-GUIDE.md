# Provider guide

For service providers (cleaners and maintenance people) using Lakeview to work
turnovers, and for whoever sets up provider access. Part 1 is how to use the
app. Part 2 is the technical setup behind it.

## Part 1: Using Lakeview as a provider

### Sign up and onboarding

1. Open the app and click Sign up. Create your account.
2. At onboarding, enter the invite code the owner gave you. New accounts verify
   this code once.
3. Choose Provider as your account type.
4. Fill in your provider profile: your capabilities (for example cleaning or
   maintenance), your primary service type, and your location. Save.

You now have access to the provider dashboard.

### Get and work jobs

1. Open the provider dashboard. Assigned jobs show the property, the date, and
   the job status.
2. Accept a job to confirm you will do it. The owner sees the status change, so
   you do not need to message them separately.
3. When you arrive and begin, mark the job in progress.
4. When the work is done, mark it completed.

The job status moves needs assignment, assigned, accepted, in progress,
completed. Each change is visible to the owner in real time.

### Flag issues during a job

While working, you can flag:

- Maintenance: something needs a repair.
- Restock: supplies are low and need replacing.
- Damage: something is broken or damaged.

Flagging sends an in-app notification to the owner so it is on record and acted
on, instead of being lost in a text thread.

### Notifications

Your notifications are scoped to your account. Check them for newly assigned
jobs and any updates from the owner.

### Install on your phone

Lakeview is meant to be used in the field, so install it on your phone. On
iPhone, open it in Safari, tap Share, then Add to Home Screen. On Android, open
it in Chrome, open the menu, then Add to Home screen or Install app. After
installing, open it from the home screen icon like any other app.

## Part 2: Technical setup behind provider access

Providers do not deploy anything. Access depends on a few settings the instance
owner controls. Full steps are in LOCAL-TESTING.md; this is the
provider-relevant summary.

- Invite code: a provider needs the same `SIGNUP_INVITE_CODE` the owner uses.
  The owner shares this code so the provider can complete onboarding.
- One account, two roles: a single login can hold both an owner and a provider
  profile. A small operator who sometimes cleans their own units can set up both
  from the same account on the onboarding screen.
- Assignment: owners assign jobs to providers from the owner dashboard. A
  provider sees a job only after it is assigned to them, because the provider
  dashboard at `/provider` is protected and scoped to that user.
- Service type matching: a provider's capabilities and primary service type
  determine which jobs make sense to assign to them (for example a cleaning job
  to a cleaner, a maintenance job to a maintenance provider).

To run or deploy the app, follow LOCAL-TESTING.md. For the full variable list,
see DEPLOYMENT.md.
