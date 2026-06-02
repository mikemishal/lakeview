/**
 * Backfill ownerProfileId on legacy records.
 *
 * Earlier data was created before properties and owner notifications were scoped
 * to an owner, so some rows have ownerProfileId = null. The app no longer treats
 * null-owner records as accessible to everyone, so those rows must be assigned to
 * a real owner.
 *
 * What it does:
 *   1. Assigns every Property with ownerProfileId = null to a target owner.
 *   2. Backfills owner Notification.ownerProfileId from the related property.
 *
 * Safety:
 *   - Runs as a DRY RUN by default and only reports what would change.
 *   - Pass --apply to write changes.
 *   - The target owner must be given explicitly (by id or email) so properties
 *     are never assigned to the wrong account.
 *
 * Usage (PowerShell):
 *   $env:DATABASE_URL = "postgresql://..."
 *   npx tsx scripts/backfill-owner-ids.ts --owner-email owner@example.com           # dry run
 *   npx tsx scripts/backfill-owner-ids.ts --owner-email owner@example.com --apply   # write
 *   npx tsx scripts/backfill-owner-ids.ts --owner-id <ownerProfileId> --apply
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getArg(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index === process.argv.length - 1) {
    return null;
  }
  return process.argv[index + 1];
}

async function resolveTargetOwner() {
  const ownerId = getArg("--owner-id");
  const ownerEmail = getArg("--owner-email");

  if (ownerId) {
    return prisma.ownerProfile.findUnique({ where: { id: ownerId } });
  }

  if (ownerEmail) {
    return prisma.ownerProfile.findFirst({
      where: { email: ownerEmail },
      orderBy: { createdAt: "asc" },
    });
  }

  return null;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const mode = apply ? "APPLY" : "DRY RUN";
  console.log(`Backfill owner ids - mode: ${mode}`);

  const targetOwner = await resolveTargetOwner();
  if (!targetOwner) {
    console.error(
      "No target owner found. Pass --owner-id <id> or --owner-email <email> for an existing owner."
    );
    process.exitCode = 1;
    return;
  }

  console.log(`Target owner: ${targetOwner.name} (${targetOwner.id})`);

  // 1. Properties with no owner.
  const orphanProperties = await prisma.property.count({
    where: { ownerProfileId: null },
  });
  console.log(`Properties with no owner: ${orphanProperties}`);

  if (apply && orphanProperties > 0) {
    const result = await prisma.property.updateMany({
      where: { ownerProfileId: null },
      data: { ownerProfileId: targetOwner.id },
    });
    console.log(`Assigned ${result.count} properties to ${targetOwner.id}.`);
  }

  // 2. Owner notifications missing ownerProfileId but linked to a property.
  const orphanNotifications = await prisma.notification.findMany({
    where: {
      audienceType: "owner",
      ownerProfileId: null,
      propertyId: { not: null },
    },
    include: { property: { select: { ownerProfileId: true } } },
  });
  console.log(
    `Owner notifications missing ownerProfileId (with a property): ${orphanNotifications.length}`
  );

  if (apply) {
    let updated = 0;
    for (const notification of orphanNotifications) {
      const resolvedOwnerId =
        notification.property?.ownerProfileId ?? targetOwner.id;
      await prisma.notification.update({
        where: { id: notification.id },
        data: { ownerProfileId: resolvedOwnerId },
      });
      updated += 1;
    }
    console.log(`Backfilled ${updated} owner notifications.`);
  }

  if (!apply) {
    console.log("Dry run complete. Re-run with --apply to write changes.");
  }
}

main()
  .catch((error) => {
    console.error("Backfill failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
