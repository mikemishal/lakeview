-- CreateTable
CREATE TABLE "ServiceProvider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "serviceType" TEXT NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ServiceProvider_serviceType_idx" ON "ServiceProvider"("serviceType");

-- CreateIndex
CREATE INDEX "ServiceProvider_active_idx" ON "ServiceProvider"("active");

-- CreateIndex
CREATE INDEX "ServiceProvider_name_idx" ON "ServiceProvider"("name");
