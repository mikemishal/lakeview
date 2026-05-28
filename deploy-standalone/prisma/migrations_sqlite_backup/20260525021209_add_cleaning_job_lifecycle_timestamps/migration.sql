-- AlterTable
ALTER TABLE "CleaningJob" ADD COLUMN "acceptedAt" DATETIME;
ALTER TABLE "CleaningJob" ADD COLUMN "cancelledAt" DATETIME;
ALTER TABLE "CleaningJob" ADD COLUMN "completedAt" DATETIME;
ALTER TABLE "CleaningJob" ADD COLUMN "startedAt" DATETIME;
