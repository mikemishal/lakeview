-- AlterTable
ALTER TABLE "CleaningJob"
ADD COLUMN "quotedPrice" DECIMAL(10,2),
ADD COLUMN "quotedPriceNotes" TEXT,
ADD COLUMN "quotedPriceSource" TEXT;
