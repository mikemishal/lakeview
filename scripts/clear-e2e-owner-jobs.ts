/**
 * clear-e2e-owner-jobs.ts
 *
 * Deletes ALL cleaning jobs, calendar events, and properties that belong to
 * the E2E test owner account (E2E_OWNER_EMAIL).  Owner / provider profiles
 * and team memberships are left untouched.
 *
 * Usage:
 *   npx tsx scripts/clear-e2e-owner-jobs.ts
 */
import * as dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const ownerEmail = process.env.E2E_OWNER_EMAIL?.trim();
  if (!ownerEmail) {
    throw new Error("E2E_OWNER_EMAIL is not set in .env");
  }

  console.log(`\nClearing E2E data for owner: ${ownerEmail}\n`);

  // Resolve OwnerProfile by email (set during onboarding)
  const ownerProfile = await prisma.ownerProfile.findFirst({
    where: { email: ownerEmail },
    select: { id: true, name: true, email: true },
  });

  if (!ownerProfile) {
    // Try matching via authUserId -> AccountProfile
    const account = await prisma.accountProfile.findFirst({
      where: { email: ownerEmail },
      select: { authUserId: true },
    });

    if (!account?.authUserId) {
      console.log(`No OwnerProfile or AccountProfile found for ${ownerEmail}. Nothing to clear.`);
      return;
    }

    const profileByAuth = await prisma.ownerProfile.findFirst({
      where: { authUserId: account.authUserId },
      select: { id: true, name: true },
    });

    if (!profileByAuth) {
      console.log(`No OwnerProfile found via authUserId for ${ownerEmail}. Nothing to clear.`);
      return;
    }

    await clearForOwner(profileByAuth.id, profileByAuth.name ?? ownerEmail);
    return;
  }

  await clearForOwner(ownerProfile.id, ownerProfile.name ?? ownerEmail);
}

async function clearForOwner(ownerProfileId: string, label: string) {
  // Fetch all property IDs owned by this profile
  const properties = await prisma.property.findMany({
    where: { ownerProfileId },
    select: { id: true, name: true },
  });

  if (properties.length === 0) {
    console.log(`Owner "${label}" has no properties. Nothing to clear.`);
    return;
  }

  const propertyIds = properties.map((p) => p.id);
  console.log(`Found ${properties.length} propert${properties.length === 1 ? "y" : "ies"} for "${label}":`);
  for (const p of properties) {
    console.log(`  - ${p.name} (${p.id})`);
  }

  // Delete in dependency order
  const jobsDeleted = await prisma.cleaningJob.deleteMany({
    where: { propertyId: { in: propertyIds } },
  });
  console.log(`\nDeleted ${jobsDeleted.count} cleaning job(s).`);

  const eventsDeleted = await prisma.calendarEvent.deleteMany({
    where: { propertyId: { in: propertyIds } },
  });
  console.log(`Deleted ${eventsDeleted.count} calendar event(s).`);

  const propertiesDeleted = await prisma.property.deleteMany({
    where: { id: { in: propertyIds } },
  });
  console.log(`Deleted ${propertiesDeleted.count} propert${propertiesDeleted.count === 1 ? "y" : "ies"}.\n`);

  console.log("Done. Owner profile, team memberships, and service providers were kept.\n");
}

main()
  .catch((error) => {
    console.error("Failed to clear E2E owner data:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
