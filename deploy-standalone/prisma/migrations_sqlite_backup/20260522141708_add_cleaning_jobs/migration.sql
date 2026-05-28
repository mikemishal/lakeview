-- CreateTable
CREATE TABLE "CleaningJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "calendarEventId" TEXT,
    "title" TEXT NOT NULL,
    "scheduledDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'needs_assignment',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CleaningJob_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CleaningJob_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CleaningJob_calendarEventId_key" ON "CleaningJob"("calendarEventId");

-- CreateIndex
CREATE INDEX "CleaningJob_propertyId_idx" ON "CleaningJob"("propertyId");

-- CreateIndex
CREATE INDEX "CleaningJob_scheduledDate_idx" ON "CleaningJob"("scheduledDate");

-- CreateIndex
CREATE INDEX "CleaningJob_status_idx" ON "CleaningJob"("status");
