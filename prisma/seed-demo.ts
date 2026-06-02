/**
 * Demo data seed for a showcase deployment.
 *
 * Creates a self-contained, realistic dataset: one owner with three properties,
 * three service providers, synced calendar events (including a same-day turnover),
 * cleaning jobs across every status, and notifications for both audiences.
 *
 * Linking to login accounts:
 *   The dashboards show data for the signed-in Clerk user, matched by authUserId.
 *   To see the seeded data after logging in, set these before running:
 *     DEMO_OWNER_CLERK_ID    - Clerk user id for the demo owner login
 *     DEMO_PROVIDER_CLERK_ID - Clerk user id for the demo cleaner login (optional)
 *   If unset, the owner/provider are created unlinked and you will need to attach
 *   them to a login (for example via onboarding) to view the data.
 *
 * This seed is destructive for demo records only: it removes rows whose email is
 * on the demo domain (@lakeview-demo.local) plus their related data, then rebuilds.
 *
 * Usage (PowerShell):
 *   $env:DATABASE_URL = "postgresql://...demo db..."
 *   $env:DEMO_OWNER_CLERK_ID = "user_xxx"
 *   $env:DEMO_PROVIDER_CLERK_ID = "user_yyy"
 *   npx tsx prisma/seed-demo.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_EMAIL_DOMAIN = "lakeview-demo.local";

// Date helpers. Calendar dates are stored at UTC midnight.
function dateOnlyUtc(daysFromToday: number): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysFromToday)
  );
}

const dateLabelFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function nights(checkIn: Date, checkOut: Date): number {
  return Math.round((checkOut.getTime() - checkIn.getTime()) / (24 * 60 * 60 * 1000));
}

function jobTitle(
  cleaningType: "checkout_cleaning" | "turnover_cleaning",
  propertyName: string,
  scheduledDate: Date
): string {
  const prefix = cleaningType === "turnover_cleaning" ? "Turnover cleaning" : "Checkout cleaning";
  return `${prefix} - ${propertyName} - ${dateLabelFormatter.format(scheduledDate)}`;
}

async function clearDemoData() {
  // Find demo owners/providers by email domain so we only remove demo data.
  const demoOwners = await prisma.ownerProfile.findMany({
    where: { email: { endsWith: `@${DEMO_EMAIL_DOMAIN}` } },
    select: { id: true },
  });
  const demoOwnerIds = demoOwners.map((owner) => owner.id);

  const demoProperties = await prisma.property.findMany({
    where: { ownerProfileId: { in: demoOwnerIds } },
    select: { id: true },
  });
  const demoPropertyIds = demoProperties.map((property) => property.id);

  // Notifications -> cleaning jobs -> calendar events -> properties.
  await prisma.notification.deleteMany({
    where: {
      OR: [
        { ownerProfileId: { in: demoOwnerIds } },
        { propertyId: { in: demoPropertyIds } },
      ],
    },
  });
  await prisma.cleaningJob.deleteMany({ where: { propertyId: { in: demoPropertyIds } } });
  await prisma.calendarEvent.deleteMany({ where: { propertyId: { in: demoPropertyIds } } });
  await prisma.property.deleteMany({ where: { id: { in: demoPropertyIds } } });

  await prisma.serviceProvider.deleteMany({
    where: { email: { endsWith: `@${DEMO_EMAIL_DOMAIN}` } },
  });
  await prisma.ownerProfile.deleteMany({ where: { id: { in: demoOwnerIds } } });
  await prisma.accountProfile.deleteMany({
    where: { email: { endsWith: `@${DEMO_EMAIL_DOMAIN}` } },
  });
}

async function main() {
  console.log("Seeding demo data...");
  await clearDemoData();

  const ownerClerkId = process.env.DEMO_OWNER_CLERK_ID?.trim() || null;
  const providerClerkId = process.env.DEMO_PROVIDER_CLERK_ID?.trim() || null;
  const now = new Date();

  // Account + owner profile.
  if (ownerClerkId) {
    await prisma.accountProfile.create({
      data: {
        authUserId: ownerClerkId,
        name: "Jordan Lake",
        email: `owner@${DEMO_EMAIL_DOMAIN}`,
        companyName: "Lakeview Rentals",
        phone: "+1 555 0100",
        onboardingComplete: true,
        inviteCodeVerified: true,
        inviteCodeVerifiedAt: now,
      },
    });
  }

  const owner = await prisma.ownerProfile.create({
    data: {
      authUserId: ownerClerkId,
      name: "Jordan Lake",
      companyName: "Lakeview Rentals",
      email: `owner@${DEMO_EMAIL_DOMAIN}`,
      phone: "+1 555 0100",
      onboardingComplete: true,
      active: true,
    },
  });

  // Providers. The primary cleaner is linked to the demo provider login if given.
  if (providerClerkId) {
    await prisma.accountProfile.create({
      data: {
        authUserId: providerClerkId,
        name: "Sam Rivera",
        email: `cleaner@${DEMO_EMAIL_DOMAIN}`,
        companyName: "Sparkle Clean Co",
        phone: "+1 555 0111",
        onboardingComplete: true,
        inviteCodeVerified: true,
        inviteCodeVerifiedAt: now,
      },
    });
  }

  const sparkle = await prisma.serviceProvider.create({
    data: {
      authUserId: providerClerkId,
      name: "Sam Rivera",
      companyName: "Sparkle Clean Co",
      email: `cleaner@${DEMO_EMAIL_DOMAIN}`,
      phone: "+1 555 0111",
      serviceType: "cleaning",
      primaryServiceType: "cleaning",
      onboardingComplete: true,
      active: true,
      baseCity: "Burlington",
      baseState: "VT",
      baseZipCode: "05401",
      serviceRadiusMiles: 25,
      ratingAverage: 4.9,
      ratingCount: 64,
      baseRateCents: 9000,
      hourlyRateCents: 4500,
      capabilities: { create: [{ serviceType: "cleaning", active: true }] },
    },
  });

  const freshStart = await prisma.serviceProvider.create({
    data: {
      name: "Fresh Start Cleaning",
      companyName: "Fresh Start Cleaning",
      email: `freshstart@${DEMO_EMAIL_DOMAIN}`,
      phone: "+1 555 0122",
      serviceType: "cleaning",
      primaryServiceType: "cleaning",
      onboardingComplete: true,
      active: true,
      baseCity: "Burlington",
      baseState: "VT",
      baseZipCode: "05408",
      serviceRadiusMiles: 20,
      ratingAverage: 4.7,
      ratingCount: 38,
      baseRateCents: 8500,
      capabilities: { create: [{ serviceType: "cleaning", active: true }] },
    },
  });

  await prisma.serviceProvider.create({
    data: {
      name: "FixIt Maintenance",
      companyName: "FixIt Maintenance",
      email: `fixit@${DEMO_EMAIL_DOMAIN}`,
      phone: "+1 555 0133",
      serviceType: "maintenance",
      primaryServiceType: "maintenance",
      onboardingComplete: true,
      active: true,
      baseCity: "Burlington",
      baseState: "VT",
      baseZipCode: "05401",
      serviceRadiusMiles: 30,
      ratingAverage: 4.8,
      ratingCount: 21,
      capabilities: { create: [{ serviceType: "maintenance", active: true }] },
    },
  });

  // Properties.
  const birch = await prisma.property.create({
    data: {
      ownerProfileId: owner.id,
      name: "Birch Cabin",
      address: "12 Birch Trail, Stowe, VT",
      airbnbCalendarUrl: "https://www.airbnb.com/calendar/ical/demo-birch.ics?s=demo",
      propertyType: "Cabin",
      bedrooms: 2,
      bathrooms: 1,
      maxGuests: 4,
      defaultCheckInTime: "16:00",
      defaultCheckOutTime: "11:00",
      parkingInfo: "Driveway fits two cars.",
      accessNotes: "Lockbox by the front door, code 4417.",
      cleaningNotes: "Wood floors, use the felt pads under furniture.",
      supplyLocation: "Hall closet, top shelf.",
      laundryLocation: "Stacked washer/dryer in the mudroom.",
      trashInstructions: "Bins to the road on Tuesday morning.",
    },
  });

  const loft = await prisma.property.create({
    data: {
      ownerProfileId: owner.id,
      name: "Lakeside Loft",
      address: "8 Harbor View, Burlington, VT",
      airbnbCalendarUrl: "https://www.airbnb.com/calendar/ical/demo-loft.ics?s=demo",
      propertyType: "Loft",
      bedrooms: 1,
      bathrooms: 1,
      maxGuests: 2,
      floorNumber: "3",
      hasElevator: true,
      defaultCheckInTime: "15:00",
      defaultCheckOutTime: "10:00",
      accessNotes: "Smart lock, code sent day of check-in.",
      cleaningNotes: "Glass shower, squeegee on the hook.",
    },
  });

  const pine = await prisma.property.create({
    data: {
      ownerProfileId: owner.id,
      name: "Pine Cottage",
      address: "44 Pinewood Rd, Shelburne, VT",
      airbnbCalendarUrl: "https://www.airbnb.com/calendar/ical/demo-pine.ics?s=demo",
      propertyType: "Cottage",
      bedrooms: 3,
      bathrooms: 2,
      maxGuests: 6,
      petInfo: "Dog friendly, check for hair on the couches.",
      cleaningNotes: "Two floors, vacuum upstairs last.",
    },
  });

  // Calendar events: [property, checkInOffset, checkOutOffset].
  // Birch has a same-day turnover on day +3 (one checks out as another checks in).
  type EventSpec = {
    property: { id: string; name: string };
    externalId: string;
    checkInOffset: number;
    checkOutOffset: number;
  };

  const eventSpecs: EventSpec[] = [
    { property: birch, externalId: "birch-past", checkInOffset: -5, checkOutOffset: -2 },
    { property: birch, externalId: "birch-soon", checkInOffset: 0, checkOutOffset: 3 },
    { property: birch, externalId: "birch-turn", checkInOffset: 3, checkOutOffset: 7 },
    { property: loft, externalId: "loft-now", checkInOffset: -1, checkOutOffset: 2 },
    { property: loft, externalId: "loft-next", checkInOffset: 6, checkOutOffset: 9 },
    { property: pine, externalId: "pine-week", checkInOffset: 4, checkOutOffset: 8 },
    { property: pine, externalId: "pine-later", checkInOffset: 18, checkOutOffset: 22 },
  ];

  const createdEvents = new Map<string, { id: string; checkOut: Date; property: { id: string; name: string } }>();

  for (const spec of eventSpecs) {
    const checkIn = dateOnlyUtc(spec.checkInOffset);
    const checkOut = dateOnlyUtc(spec.checkOutOffset);
    const event = await prisma.calendarEvent.create({
      data: {
        propertyId: spec.property.id,
        externalId: spec.externalId,
        summary: "Reserved",
        checkInDate: checkIn,
        checkOutDate: checkOut,
        nights: nights(checkIn, checkOut),
        source: "airbnb",
      },
    });
    createdEvents.set(spec.externalId, { id: event.id, checkOut, property: spec.property });
  }

  // Cleaning jobs across statuses. The day +3 Birch checkout is a turnover.
  type JobSpec = {
    eventKey: string;
    cleaningType: "checkout_cleaning" | "turnover_cleaning";
    status: string;
    providerId?: string;
    flags?: { maintenanceNeeded?: boolean; restockNeeded?: boolean; damageFound?: boolean };
    notes?: string;
  };

  const jobSpecs: JobSpec[] = [
    {
      eventKey: "birch-past",
      cleaningType: "checkout_cleaning",
      status: "completed",
      providerId: sparkle.id,
      flags: { restockNeeded: true },
      notes: "All done. Low on coffee pods and hand soap.",
    },
    {
      eventKey: "birch-soon",
      cleaningType: "turnover_cleaning",
      status: "accepted",
      providerId: sparkle.id,
    },
    { eventKey: "loft-now", cleaningType: "checkout_cleaning", status: "in_progress", providerId: sparkle.id },
    { eventKey: "loft-next", cleaningType: "checkout_cleaning", status: "needs_assignment" },
    { eventKey: "pine-week", cleaningType: "checkout_cleaning", status: "assigned", providerId: freshStart.id },
    { eventKey: "pine-later", cleaningType: "checkout_cleaning", status: "needs_assignment" },
  ];

  const statusTimestamps = (
    status: string
  ): { acceptedAt?: Date; startedAt?: Date; completedAt?: Date } => {
    const data: { acceptedAt?: Date; startedAt?: Date; completedAt?: Date } = {};
    if (["accepted", "in_progress", "completed"].includes(status)) data.acceptedAt = now;
    if (["in_progress", "completed"].includes(status)) data.startedAt = now;
    if (status === "completed") data.completedAt = now;
    return data;
  };

  for (const spec of jobSpecs) {
    const event = createdEvents.get(spec.eventKey);
    if (!event) continue;

    await prisma.cleaningJob.create({
      data: {
        propertyId: event.property.id,
        calendarEventId: event.id,
        assignedProviderId: spec.providerId ?? null,
        title: jobTitle(spec.cleaningType, event.property.name, event.checkOut),
        scheduledDate: event.checkOut,
        status: spec.status,
        sourcePlatform: "airbnb",
        cleaningType: spec.cleaningType,
        maintenanceNeeded: spec.flags?.maintenanceNeeded ?? false,
        restockNeeded: spec.flags?.restockNeeded ?? false,
        damageFound: spec.flags?.damageFound ?? false,
        notes: spec.notes ?? null,
        ...statusTimestamps(spec.status),
      },
    });
  }

  // An ad-hoc maintenance job not tied to a reservation.
  await prisma.cleaningJob.create({
    data: {
      propertyId: pine.id,
      title: "Fix dripping kitchen faucet - Pine Cottage",
      scheduledDate: dateOnlyUtc(2),
      status: "needs_assignment",
      jobSource: "ad_hoc",
      requestedServiceType: "maintenance",
      priority: "high",
      cleaningType: "checkout_cleaning",
      sourcePlatform: "manual",
      ownerInstructions: "Guest reported a slow drip under the sink.",
    },
  });

  // Notifications for both audiences.
  await prisma.notification.createMany({
    data: [
      {
        audienceType: "owner",
        ownerProfileId: owner.id,
        propertyId: birch.id,
        type: "job_completed",
        title: "Job completed",
        message: "Sam Rivera completed the Birch Cabin checkout cleaning.",
        readAt: null,
      },
      {
        audienceType: "owner",
        ownerProfileId: owner.id,
        propertyId: loft.id,
        type: "job_started",
        title: "Job started",
        message: "Sam Rivera started the Lakeside Loft cleaning.",
        readAt: null,
      },
      {
        audienceType: "provider",
        providerId: sparkle.id,
        propertyId: birch.id,
        type: "job_assigned",
        title: "New job assigned",
        message: "Birch Cabin: turnover cleaning is ready to accept.",
        readAt: null,
      },
    ],
  });

  console.log("Demo data seeded.");
  console.log(`Owner: ${owner.name} (${owner.email})`);
  console.log(`Owner login linked: ${ownerClerkId ? "yes" : "no (set DEMO_OWNER_CLERK_ID)"}`);
  console.log(`Cleaner login linked: ${providerClerkId ? "yes" : "no (set DEMO_PROVIDER_CLERK_ID)"}`);
  console.log("Properties: Birch Cabin, Lakeside Loft, Pine Cottage");
}

main()
  .catch((error) => {
    console.error("Demo seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
