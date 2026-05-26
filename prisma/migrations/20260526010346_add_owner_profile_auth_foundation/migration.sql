-- CreateTable
CREATE TABLE "OwnerProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authUserId" TEXT,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "audienceType" TEXT NOT NULL,
    "ownerProfileId" TEXT,
    "providerId" TEXT,
    "propertyId" TEXT,
    "cleaningJobId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_ownerProfileId_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "OwnerProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ServiceProvider" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_cleaningJobId_fkey" FOREIGN KEY ("cleaningJobId") REFERENCES "CleaningJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Notification" ("audienceType", "cleaningJobId", "createdAt", "id", "message", "propertyId", "providerId", "readAt", "title", "type") SELECT "audienceType", "cleaningJobId", "createdAt", "id", "message", "propertyId", "providerId", "readAt", "title", "type" FROM "Notification";
DROP TABLE "Notification";
ALTER TABLE "new_Notification" RENAME TO "Notification";
CREATE INDEX "Notification_audienceType_idx" ON "Notification"("audienceType");
CREATE INDEX "Notification_ownerProfileId_idx" ON "Notification"("ownerProfileId");
CREATE INDEX "Notification_providerId_idx" ON "Notification"("providerId");
CREATE INDEX "Notification_propertyId_idx" ON "Notification"("propertyId");
CREATE INDEX "Notification_cleaningJobId_idx" ON "Notification"("cleaningJobId");
CREATE INDEX "Notification_readAt_idx" ON "Notification"("readAt");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");
CREATE INDEX "Notification_type_idx" ON "Notification"("type");
CREATE TABLE "new_Property" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerProfileId" TEXT,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "airbnbCalendarUrl" TEXT NOT NULL,
    "listingUrl" TEXT,
    "propertyType" TEXT,
    "bedrooms" REAL,
    "bathrooms" REAL,
    "squareFeet" INTEGER,
    "maxGuests" INTEGER,
    "defaultCheckInTime" TEXT,
    "defaultCheckOutTime" TEXT,
    "floorNumber" TEXT,
    "hasElevator" BOOLEAN NOT NULL DEFAULT false,
    "parkingInfo" TEXT,
    "accessNotes" TEXT,
    "cleaningNotes" TEXT,
    "supplyLocation" TEXT,
    "laundryLocation" TEXT,
    "trashInstructions" TEXT,
    "petInfo" TEXT,
    "providerInstructions" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Property_ownerProfileId_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "OwnerProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Property" ("accessNotes", "address", "airbnbCalendarUrl", "bathrooms", "bedrooms", "cleaningNotes", "createdAt", "defaultCheckInTime", "defaultCheckOutTime", "floorNumber", "hasElevator", "id", "laundryLocation", "listingUrl", "maxGuests", "name", "parkingInfo", "petInfo", "propertyType", "providerInstructions", "squareFeet", "supplyLocation", "trashInstructions", "updatedAt") SELECT "accessNotes", "address", "airbnbCalendarUrl", "bathrooms", "bedrooms", "cleaningNotes", "createdAt", "defaultCheckInTime", "defaultCheckOutTime", "floorNumber", "hasElevator", "id", "laundryLocation", "listingUrl", "maxGuests", "name", "parkingInfo", "petInfo", "propertyType", "providerInstructions", "squareFeet", "supplyLocation", "trashInstructions", "updatedAt" FROM "Property";
DROP TABLE "Property";
ALTER TABLE "new_Property" RENAME TO "Property";
CREATE INDEX "Property_ownerProfileId_idx" ON "Property"("ownerProfileId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "OwnerProfile_authUserId_key" ON "OwnerProfile"("authUserId");

-- CreateIndex
CREATE INDEX "OwnerProfile_authUserId_idx" ON "OwnerProfile"("authUserId");

-- CreateIndex
CREATE INDEX "OwnerProfile_active_idx" ON "OwnerProfile"("active");

-- CreateIndex
CREATE INDEX "OwnerProfile_email_idx" ON "OwnerProfile"("email");
