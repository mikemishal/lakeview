-- CreateTable
CREATE TABLE "OwnerProviderTeamMember" (
    "id" TEXT NOT NULL,
    "ownerProfileId" TEXT NOT NULL,
    "serviceProviderId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "cleaningFlatRateCents" INTEGER,
    "cleaningHourlyRateCents" INTEGER,
    "pricingNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerProviderTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OwnerProviderTeamMember_ownerProfileId_idx" ON "OwnerProviderTeamMember"("ownerProfileId");

-- CreateIndex
CREATE INDEX "OwnerProviderTeamMember_serviceProviderId_idx" ON "OwnerProviderTeamMember"("serviceProviderId");

-- CreateIndex
CREATE INDEX "OwnerProviderTeamMember_isActive_idx" ON "OwnerProviderTeamMember"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerProviderTeamMember_ownerProfileId_serviceProviderId_key" ON "OwnerProviderTeamMember"("ownerProfileId", "serviceProviderId");

-- AddForeignKey
ALTER TABLE "OwnerProviderTeamMember" ADD CONSTRAINT "OwnerProviderTeamMember_ownerProfileId_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "OwnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerProviderTeamMember" ADD CONSTRAINT "OwnerProviderTeamMember_serviceProviderId_fkey" FOREIGN KEY ("serviceProviderId") REFERENCES "ServiceProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
