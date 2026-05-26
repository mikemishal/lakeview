-- CreateTable
CREATE TABLE "ProviderCapability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProviderCapability_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ServiceProvider" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ServiceProvider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authUserId" TEXT,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "serviceType" TEXT NOT NULL,
    "primaryServiceType" TEXT,
    "notes" TEXT,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "baseAddress" TEXT,
    "baseCity" TEXT,
    "baseState" TEXT,
    "baseZipCode" TEXT,
    "serviceRadiusMiles" INTEGER,
    "serviceAreaNotes" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "ratingAverage" REAL,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "baseRateCents" INTEGER,
    "hourlyRateCents" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ServiceProvider" ("active", "companyName", "createdAt", "email", "id", "name", "notes", "phone", "serviceType", "updatedAt") SELECT "active", "companyName", "createdAt", "email", "id", "name", "notes", "phone", "serviceType", "updatedAt" FROM "ServiceProvider";
DROP TABLE "ServiceProvider";
ALTER TABLE "new_ServiceProvider" RENAME TO "ServiceProvider";
CREATE UNIQUE INDEX "ServiceProvider_authUserId_key" ON "ServiceProvider"("authUserId");
CREATE INDEX "ServiceProvider_serviceType_idx" ON "ServiceProvider"("serviceType");
CREATE INDEX "ServiceProvider_active_idx" ON "ServiceProvider"("active");
CREATE INDEX "ServiceProvider_name_idx" ON "ServiceProvider"("name");
CREATE INDEX "ServiceProvider_primaryServiceType_idx" ON "ServiceProvider"("primaryServiceType");
CREATE INDEX "ServiceProvider_baseZipCode_idx" ON "ServiceProvider"("baseZipCode");
CREATE INDEX "ServiceProvider_baseCity_idx" ON "ServiceProvider"("baseCity");
CREATE INDEX "ServiceProvider_baseState_idx" ON "ServiceProvider"("baseState");
CREATE INDEX "ServiceProvider_ratingAverage_idx" ON "ServiceProvider"("ratingAverage");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ProviderCapability_providerId_idx" ON "ProviderCapability"("providerId");

-- CreateIndex
CREATE INDEX "ProviderCapability_serviceType_idx" ON "ProviderCapability"("serviceType");

-- CreateIndex
CREATE INDEX "ProviderCapability_active_idx" ON "ProviderCapability"("active");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderCapability_providerId_serviceType_key" ON "ProviderCapability"("providerId", "serviceType");
