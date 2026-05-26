import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Counts = {
  properties: number;
  calendarEvents: number;
  cleaningJobs: number;
  serviceProviders: number;
};

async function getCounts(): Promise<Counts> {
  const [properties, calendarEvents, cleaningJobs, serviceProviders] =
    await Promise.all([
      prisma.property.count(),
      prisma.calendarEvent.count(),
      prisma.cleaningJob.count(),
      prisma.serviceProvider.count(),
    ]);

  return {
    properties,
    calendarEvents,
    cleaningJobs,
    serviceProviders,
  };
}

function printCounts(label: string, counts: Counts) {
  console.log(label);
  console.log(`- properties: ${counts.properties}`);
  console.log(`- calendar events: ${counts.calendarEvents}`);
  console.log(`- cleaning jobs: ${counts.cleaningJobs}`);
  console.log(`- service providers: ${counts.serviceProviders}`);
}

async function main() {
  const before = await getCounts();
  printCounts("Before clear:", before);

  await prisma.cleaningJob.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.property.deleteMany();

  const after = await getCounts();
  printCounts("After clear:", after);
  console.log("Service providers were kept.");
}

main()
  .catch((error) => {
    console.error("Failed to clear operational data.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
