-- CreateTable
CREATE TABLE "AccountProfile" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "companyName" TEXT,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "ownerProfileId" TEXT,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "airbnbCalendarUrl" TEXT NOT NULL,
    "listingUrl" TEXT,
    "propertyType" TEXT,
    "bedrooms" DOUBLE PRECISION,
    "bathrooms" DOUBLE PRECISION,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerProfile" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "checkInDate" TIMESTAMP(3) NOT NULL,
    "checkOutDate" TIMESTAMP(3) NOT NULL,
    "nights" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleaningJob" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "calendarEventId" TEXT,
    "assignedProviderId" TEXT,
    "title" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "jobSource" TEXT NOT NULL DEFAULT 'calendar_sync',
    "requestedServiceType" TEXT NOT NULL DEFAULT 'cleaning',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "dueTime" TEXT,
    "estimatedDurationMinutes" INTEGER,
    "ownerInstructions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'needs_assignment',
    "sourcePlatform" TEXT NOT NULL DEFAULT 'airbnb',
    "cleaningType" TEXT NOT NULL DEFAULT 'checkout_cleaning',
    "ownerSelfAssigned" BOOLEAN NOT NULL DEFAULT false,
    "acceptedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "maintenanceNeeded" BOOLEAN NOT NULL DEFAULT false,
    "restockNeeded" BOOLEAN NOT NULL DEFAULT false,
    "damageFound" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleaningJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceProvider" (
    "id" TEXT NOT NULL,
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
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "ratingAverage" DOUBLE PRECISION,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "baseRateCents" INTEGER,
    "hourlyRateCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderCapability" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderCapability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "audienceType" TEXT NOT NULL,
    "ownerProfileId" TEXT,
    "providerId" TEXT,
    "propertyId" TEXT,
    "cleaningJobId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountProfile_authUserId_key" ON "AccountProfile"("authUserId");

-- CreateIndex
CREATE INDEX "AccountProfile_authUserId_idx" ON "AccountProfile"("authUserId");

-- CreateIndex
CREATE INDEX "AccountProfile_email_idx" ON "AccountProfile"("email");

-- CreateIndex
CREATE INDEX "Property_ownerProfileId_idx" ON "Property"("ownerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerProfile_authUserId_key" ON "OwnerProfile"("authUserId");

-- CreateIndex
CREATE INDEX "OwnerProfile_authUserId_idx" ON "OwnerProfile"("authUserId");

-- CreateIndex
CREATE INDEX "OwnerProfile_active_idx" ON "OwnerProfile"("active");

-- CreateIndex
CREATE INDEX "OwnerProfile_email_idx" ON "OwnerProfile"("email");

-- CreateIndex
CREATE INDEX "CalendarEvent_propertyId_idx" ON "CalendarEvent"("propertyId");

-- CreateIndex
CREATE INDEX "CalendarEvent_checkInDate_idx" ON "CalendarEvent"("checkInDate");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEvent_propertyId_externalId_key" ON "CalendarEvent"("propertyId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "CleaningJob_calendarEventId_key" ON "CleaningJob"("calendarEventId");

-- CreateIndex
CREATE INDEX "CleaningJob_propertyId_idx" ON "CleaningJob"("propertyId");

-- CreateIndex
CREATE INDEX "CleaningJob_assignedProviderId_idx" ON "CleaningJob"("assignedProviderId");

-- CreateIndex
CREATE INDEX "CleaningJob_scheduledDate_idx" ON "CleaningJob"("scheduledDate");

-- CreateIndex
CREATE INDEX "CleaningJob_jobSource_idx" ON "CleaningJob"("jobSource");

-- CreateIndex
CREATE INDEX "CleaningJob_requestedServiceType_idx" ON "CleaningJob"("requestedServiceType");

-- CreateIndex
CREATE INDEX "CleaningJob_priority_idx" ON "CleaningJob"("priority");

-- CreateIndex
CREATE INDEX "CleaningJob_status_idx" ON "CleaningJob"("status");

-- CreateIndex
CREATE INDEX "CleaningJob_maintenanceNeeded_idx" ON "CleaningJob"("maintenanceNeeded");

-- CreateIndex
CREATE INDEX "CleaningJob_restockNeeded_idx" ON "CleaningJob"("restockNeeded");

-- CreateIndex
CREATE INDEX "CleaningJob_damageFound_idx" ON "CleaningJob"("damageFound");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceProvider_authUserId_key" ON "ServiceProvider"("authUserId");

-- CreateIndex
CREATE INDEX "ServiceProvider_serviceType_idx" ON "ServiceProvider"("serviceType");

-- CreateIndex
CREATE INDEX "ServiceProvider_active_idx" ON "ServiceProvider"("active");

-- CreateIndex
CREATE INDEX "ServiceProvider_name_idx" ON "ServiceProvider"("name");

-- CreateIndex
CREATE INDEX "ServiceProvider_primaryServiceType_idx" ON "ServiceProvider"("primaryServiceType");

-- CreateIndex
CREATE INDEX "ServiceProvider_baseZipCode_idx" ON "ServiceProvider"("baseZipCode");

-- CreateIndex
CREATE INDEX "ServiceProvider_baseCity_idx" ON "ServiceProvider"("baseCity");

-- CreateIndex
CREATE INDEX "ServiceProvider_baseState_idx" ON "ServiceProvider"("baseState");

-- CreateIndex
CREATE INDEX "ServiceProvider_ratingAverage_idx" ON "ServiceProvider"("ratingAverage");

-- CreateIndex
CREATE INDEX "ProviderCapability_providerId_idx" ON "ProviderCapability"("providerId");

-- CreateIndex
CREATE INDEX "ProviderCapability_serviceType_idx" ON "ProviderCapability"("serviceType");

-- CreateIndex
CREATE INDEX "ProviderCapability_active_idx" ON "ProviderCapability"("active");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderCapability_providerId_serviceType_key" ON "ProviderCapability"("providerId", "serviceType");

-- CreateIndex
CREATE INDEX "Notification_audienceType_idx" ON "Notification"("audienceType");

-- CreateIndex
CREATE INDEX "Notification_ownerProfileId_idx" ON "Notification"("ownerProfileId");

-- CreateIndex
CREATE INDEX "Notification_providerId_idx" ON "Notification"("providerId");

-- CreateIndex
CREATE INDEX "Notification_propertyId_idx" ON "Notification"("propertyId");

-- CreateIndex
CREATE INDEX "Notification_cleaningJobId_idx" ON "Notification"("cleaningJobId");

-- CreateIndex
CREATE INDEX "Notification_readAt_idx" ON "Notification"("readAt");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_ownerProfileId_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "OwnerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningJob" ADD CONSTRAINT "CleaningJob_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningJob" ADD CONSTRAINT "CleaningJob_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningJob" ADD CONSTRAINT "CleaningJob_assignedProviderId_fkey" FOREIGN KEY ("assignedProviderId") REFERENCES "ServiceProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCapability" ADD CONSTRAINT "ProviderCapability_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ServiceProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_ownerProfileId_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "OwnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ServiceProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_cleaningJobId_fkey" FOREIGN KEY ("cleaningJobId") REFERENCES "CleaningJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
