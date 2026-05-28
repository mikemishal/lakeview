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
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CleaningJob_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CleaningJob_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CleaningJob_assignedProviderId_fkey" FOREIGN KEY ("assignedProviderId") REFERENCES "ServiceProvider" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CleaningJob" ("calendarEventId", "createdAt", "id", "notes", "propertyId", "scheduledDate", "status", "title", "updatedAt") SELECT "calendarEventId", "createdAt", "id", "notes", "propertyId", "scheduledDate", "status", "title", "updatedAt" FROM "CleaningJob";
DROP TABLE "CleaningJob";
ALTER TABLE "new_CleaningJob" RENAME TO "CleaningJob";
CREATE UNIQUE INDEX "CleaningJob_calendarEventId_key" ON "CleaningJob"("calendarEventId");
CREATE INDEX "CleaningJob_propertyId_idx" ON "CleaningJob"("propertyId");
CREATE INDEX "CleaningJob_assignedProviderId_idx" ON "CleaningJob"("assignedProviderId");
CREATE INDEX "CleaningJob_scheduledDate_idx" ON "CleaningJob"("scheduledDate");
CREATE INDEX "CleaningJob_status_idx" ON "CleaningJob"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
