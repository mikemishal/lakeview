-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CleaningJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "calendarEventId" TEXT,
    "assignedProviderId" TEXT,
    "title" TEXT NOT NULL,
    "scheduledDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'needs_assignment',
    "sourcePlatform" TEXT NOT NULL DEFAULT 'airbnb',
    "cleaningType" TEXT NOT NULL DEFAULT 'checkout_cleaning',
    "ownerSelfAssigned" BOOLEAN NOT NULL DEFAULT false,
    "acceptedAt" DATETIME,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "cancelledAt" DATETIME,
    "maintenanceNeeded" BOOLEAN NOT NULL DEFAULT false,
    "restockNeeded" BOOLEAN NOT NULL DEFAULT false,
    "damageFound" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CleaningJob_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CleaningJob_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CleaningJob_assignedProviderId_fkey" FOREIGN KEY ("assignedProviderId") REFERENCES "ServiceProvider" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CleaningJob" ("acceptedAt", "assignedProviderId", "calendarEventId", "cancelledAt", "cleaningType", "completedAt", "createdAt", "damageFound", "id", "maintenanceNeeded", "notes", "propertyId", "restockNeeded", "scheduledDate", "sourcePlatform", "startedAt", "status", "title", "updatedAt") SELECT "acceptedAt", "assignedProviderId", "calendarEventId", "cancelledAt", "cleaningType", "completedAt", "createdAt", "damageFound", "id", "maintenanceNeeded", "notes", "propertyId", "restockNeeded", "scheduledDate", "sourcePlatform", "startedAt", "status", "title", "updatedAt" FROM "CleaningJob";
DROP TABLE "CleaningJob";
ALTER TABLE "new_CleaningJob" RENAME TO "CleaningJob";
CREATE UNIQUE INDEX "CleaningJob_calendarEventId_key" ON "CleaningJob"("calendarEventId");
CREATE INDEX "CleaningJob_propertyId_idx" ON "CleaningJob"("propertyId");
CREATE INDEX "CleaningJob_assignedProviderId_idx" ON "CleaningJob"("assignedProviderId");
CREATE INDEX "CleaningJob_scheduledDate_idx" ON "CleaningJob"("scheduledDate");
CREATE INDEX "CleaningJob_status_idx" ON "CleaningJob"("status");
CREATE INDEX "CleaningJob_maintenanceNeeded_idx" ON "CleaningJob"("maintenanceNeeded");
CREATE INDEX "CleaningJob_restockNeeded_idx" ON "CleaningJob"("restockNeeded");
CREATE INDEX "CleaningJob_damageFound_idx" ON "CleaningJob"("damageFound");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
