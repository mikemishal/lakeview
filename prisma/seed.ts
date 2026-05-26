import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function dateOnlyUtc(daysFromToday: number): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysFromToday)
  );
}

function addDays(date: Date, days: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days)
  );
}

function toDateOnly(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;
}

const dateLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function formatDateLabel(date: Date): string {
  return dateLabelFormatter.format(date);
}

type EventTemplate = {
  key: "past" | "today" | "3-days" | "10-days" | "35-days" | "70-days";
  checkoutOffset: number;
  nights: number;
  summary: string;
};

type CreatedEvent = {
  id: string;
  key: EventTemplate["key"];
  checkOutDate: Date;
};

function buildJobTitle(cleaningType: "checkout_cleaning" | "turnover_cleaning", propertyName: string, scheduledDate: Date): string {
  const prefix = cleaningType === "checkout_cleaning" ? "Checkout cleaning" : "Turnover cleaning";
  return `${prefix} - ${propertyName} - ${formatDateLabel(scheduledDate)}`;
}

async function createCalendarEventsForProperty(
  propertyId: string,
  externalIdPrefix: string
): Promise<Record<EventTemplate["key"], CreatedEvent>> {
  const templates: EventTemplate[] = [
    { key: "past", checkoutOffset: -5, nights: 3, summary: "Reserved" },
    { key: "today", checkoutOffset: 0, nights: 2, summary: "Airbnb (Not available)" },
    { key: "3-days", checkoutOffset: 3, nights: 4, summary: "Reserved" },
    { key: "10-days", checkoutOffset: 10, nights: 3, summary: "Airbnb (Not available)" },
    { key: "35-days", checkoutOffset: 35, nights: 2, summary: "Reserved" },
    { key: "70-days", checkoutOffset: 70, nights: 5, summary: "Airbnb (Not available)" },
  ];

  const result = {} as Record<EventTemplate["key"], CreatedEvent>;

  for (const template of templates) {
    const checkOutDate = dateOnlyUtc(template.checkoutOffset);
    const checkInDate = addDays(checkOutDate, -template.nights);

    const event = await prisma.calendarEvent.create({
      data: {
        propertyId,
        externalId: `demo-${externalIdPrefix}-${template.key}`,
        summary: template.summary,
        checkInDate,
        checkOutDate,
        nights: template.nights,
        source: "airbnb",
      },
    });

    result[template.key] = {
      id: event.id,
      key: template.key,
      checkOutDate,
    };
  }

  return result;
}

async function main() {
  await prisma.cleaningJob.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.serviceProvider.deleteMany();
  await prisma.property.deleteMany();

  const westTownProperty = await prisma.property.create({
    data: {
      name: "West Town Unit 1",
      address: "2002 W Huron St, Chicago, IL",
      airbnbCalendarUrl: "https://example.com/demo-airbnb-west-town.ics",
    },
  });

  const ukrainianVillageProperty = await prisma.property.create({
    data: {
      name: "Ukrainian Village Unit 2",
      address: "2100 W Augusta Blvd, Chicago, IL",
      airbnbCalendarUrl: "https://example.com/demo-airbnb-ukrainian-village.ics",
    },
  });

  const testCleaner = await prisma.serviceProvider.create({
    data: {
      name: "Test Cleaner",
      companyName: "Test Cleaning Co",
      email: "cleaner@example.com",
      phone: "312-555-0101",
      serviceType: "cleaner",
      notes: "Primary demo cleaner",
      active: true,
    },
  });

  const backupCleaner = await prisma.serviceProvider.create({
    data: {
      name: "Backup Cleaner",
      companyName: "Backup Cleaning Team",
      email: "backup-cleaner@example.com",
      phone: "312-555-0102",
      serviceType: "cleaner",
      notes: "Backup demo cleaner",
      active: true,
    },
  });

  await prisma.serviceProvider.create({
    data: {
      name: "Demo Handyman",
      companyName: "Lakeview Repairs",
      email: "handyman@example.com",
      phone: "312-555-0199",
      serviceType: "handyman",
      notes: "Demo maintenance provider",
      active: true,
    },
  });

  const westTownEvents = await createCalendarEventsForProperty(westTownProperty.id, "west-town");
  const ukrainianVillageEvents = await createCalendarEventsForProperty(
    ukrainianVillageProperty.id,
    "ukrainian-village"
  );

  const westToday = westTownEvents["today"].checkOutDate;
  const westPast = westTownEvents["past"].checkOutDate;
  const ukrainianToday = ukrainianVillageEvents["today"].checkOutDate;
  const ukrainianPast = ukrainianVillageEvents["past"].checkOutDate;

  const cleaningJobs = [
    {
      propertyId: westTownProperty.id,
      calendarEventId: westTownEvents["past"].id,
      title: buildJobTitle("checkout_cleaning", westTownProperty.name, westPast),
      scheduledDate: westPast,
      status: "completed",
      notes: "Demo completed cleaning.",
      assignedProviderId: testCleaner.id,
      sourcePlatform: "airbnb",
      cleaningType: "checkout_cleaning",
      acceptedAt: addDays(westPast, -2),
      startedAt: addDays(westPast, -1),
      completedAt: westPast,
      cancelledAt: null,
      maintenanceNeeded: false,
      restockNeeded: false,
      damageFound: false,
    },
    {
      propertyId: westTownProperty.id,
      calendarEventId: westTownEvents["today"].id,
      title: buildJobTitle("turnover_cleaning", westTownProperty.name, westToday),
      scheduledDate: westToday,
      status: "assigned",
      notes: null,
      assignedProviderId: testCleaner.id,
      sourcePlatform: "airbnb",
      cleaningType: "turnover_cleaning",
      acceptedAt: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      maintenanceNeeded: false,
      restockNeeded: false,
      damageFound: false,
    },
    {
      propertyId: westTownProperty.id,
      calendarEventId: westTownEvents["3-days"].id,
      title: buildJobTitle("checkout_cleaning", westTownProperty.name, westTownEvents["3-days"].checkOutDate),
      scheduledDate: westTownEvents["3-days"].checkOutDate,
      status: "accepted",
      notes: null,
      assignedProviderId: testCleaner.id,
      sourcePlatform: "airbnb",
      cleaningType: "checkout_cleaning",
      acceptedAt: dateOnlyUtc(0),
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      maintenanceNeeded: false,
      restockNeeded: false,
      damageFound: false,
    },
    {
      propertyId: westTownProperty.id,
      calendarEventId: westTownEvents["10-days"].id,
      title: buildJobTitle("turnover_cleaning", westTownProperty.name, westTownEvents["10-days"].checkOutDate),
      scheduledDate: westTownEvents["10-days"].checkOutDate,
      status: "needs_assignment",
      notes: null,
      assignedProviderId: null,
      sourcePlatform: "airbnb",
      cleaningType: "turnover_cleaning",
      acceptedAt: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      maintenanceNeeded: false,
      restockNeeded: false,
      damageFound: false,
    },
    {
      propertyId: westTownProperty.id,
      calendarEventId: westTownEvents["35-days"].id,
      title: buildJobTitle("checkout_cleaning", westTownProperty.name, westTownEvents["35-days"].checkOutDate),
      scheduledDate: westTownEvents["35-days"].checkOutDate,
      status: "declined",
      notes: "Provider declined. Needs reassignment.",
      assignedProviderId: null,
      sourcePlatform: "airbnb",
      cleaningType: "checkout_cleaning",
      acceptedAt: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      maintenanceNeeded: false,
      restockNeeded: false,
      damageFound: false,
    },
    {
      propertyId: westTownProperty.id,
      calendarEventId: westTownEvents["70-days"].id,
      title: buildJobTitle("turnover_cleaning", westTownProperty.name, westTownEvents["70-days"].checkOutDate),
      scheduledDate: westTownEvents["70-days"].checkOutDate,
      status: "assigned",
      notes: null,
      assignedProviderId: backupCleaner.id,
      sourcePlatform: "airbnb",
      cleaningType: "turnover_cleaning",
      acceptedAt: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      maintenanceNeeded: false,
      restockNeeded: false,
      damageFound: false,
    },
    {
      propertyId: ukrainianVillageProperty.id,
      calendarEventId: ukrainianVillageEvents["past"].id,
      title: buildJobTitle("checkout_cleaning", ukrainianVillageProperty.name, ukrainianPast),
      scheduledDate: ukrainianPast,
      status: "completed",
      notes: "Missing two towels.",
      assignedProviderId: backupCleaner.id,
      sourcePlatform: "airbnb",
      cleaningType: "checkout_cleaning",
      acceptedAt: addDays(ukrainianPast, -2),
      startedAt: addDays(ukrainianPast, -1),
      completedAt: ukrainianPast,
      cancelledAt: null,
      maintenanceNeeded: false,
      restockNeeded: true,
      damageFound: false,
    },
    {
      propertyId: ukrainianVillageProperty.id,
      calendarEventId: ukrainianVillageEvents["today"].id,
      title: buildJobTitle("turnover_cleaning", ukrainianVillageProperty.name, ukrainianToday),
      scheduledDate: ukrainianToday,
      status: "in_progress",
      notes: null,
      assignedProviderId: testCleaner.id,
      sourcePlatform: "airbnb",
      cleaningType: "turnover_cleaning",
      acceptedAt: addDays(ukrainianToday, -1),
      startedAt: ukrainianToday,
      completedAt: null,
      cancelledAt: null,
      maintenanceNeeded: false,
      restockNeeded: false,
      damageFound: false,
    },
    {
      propertyId: ukrainianVillageProperty.id,
      calendarEventId: ukrainianVillageEvents["3-days"].id,
      title: buildJobTitle("checkout_cleaning", ukrainianVillageProperty.name, ukrainianVillageEvents["3-days"].checkOutDate),
      scheduledDate: ukrainianVillageEvents["3-days"].checkOutDate,
      status: "assigned",
      notes: "Sink draining slowly.",
      assignedProviderId: testCleaner.id,
      sourcePlatform: "airbnb",
      cleaningType: "checkout_cleaning",
      acceptedAt: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      maintenanceNeeded: true,
      restockNeeded: false,
      damageFound: false,
    },
    {
      propertyId: ukrainianVillageProperty.id,
      calendarEventId: ukrainianVillageEvents["10-days"].id,
      title: buildJobTitle("turnover_cleaning", ukrainianVillageProperty.name, ukrainianVillageEvents["10-days"].checkOutDate),
      scheduledDate: ukrainianVillageEvents["10-days"].checkOutDate,
      status: "needs_assignment",
      notes: null,
      assignedProviderId: null,
      sourcePlatform: "airbnb",
      cleaningType: "turnover_cleaning",
      acceptedAt: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      maintenanceNeeded: false,
      restockNeeded: false,
      damageFound: false,
    },
    {
      propertyId: ukrainianVillageProperty.id,
      calendarEventId: ukrainianVillageEvents["35-days"].id,
      title: buildJobTitle("checkout_cleaning", ukrainianVillageProperty.name, ukrainianVillageEvents["35-days"].checkOutDate),
      scheduledDate: ukrainianVillageEvents["35-days"].checkOutDate,
      status: "cancelled",
      notes: null,
      assignedProviderId: null,
      sourcePlatform: "airbnb",
      cleaningType: "checkout_cleaning",
      acceptedAt: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: dateOnlyUtc(0),
      maintenanceNeeded: false,
      restockNeeded: false,
      damageFound: false,
    },
    {
      propertyId: ukrainianVillageProperty.id,
      calendarEventId: ukrainianVillageEvents["70-days"].id,
      title: buildJobTitle("turnover_cleaning", ukrainianVillageProperty.name, ukrainianVillageEvents["70-days"].checkOutDate),
      scheduledDate: ukrainianVillageEvents["70-days"].checkOutDate,
      status: "assigned",
      notes: "Demo damage flag.",
      assignedProviderId: backupCleaner.id,
      sourcePlatform: "airbnb",
      cleaningType: "turnover_cleaning",
      acceptedAt: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      maintenanceNeeded: false,
      restockNeeded: false,
      damageFound: true,
    },
  ];

  const createdJobs = await prisma.cleaningJob.createMany({
    data: cleaningJobs,
  });

  console.log("Demo seed complete.");
  console.log(`Properties created: 2`);
  console.log(`Service providers created: 3`);
  console.log(`Calendar events created: 12`);
  console.log(`Cleaning jobs created: ${createdJobs.count}`);
  console.log(`Today (UTC): ${toDateOnly(dateOnlyUtc(0))}`);
}

main()
  .catch((error) => {
    console.error("Seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
