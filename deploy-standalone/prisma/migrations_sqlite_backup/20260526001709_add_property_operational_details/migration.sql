-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Property" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Property" ("address", "airbnbCalendarUrl", "createdAt", "id", "name", "updatedAt") SELECT "address", "airbnbCalendarUrl", "createdAt", "id", "name", "updatedAt" FROM "Property";
DROP TABLE "Property";
ALTER TABLE "new_Property" RENAME TO "Property";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
