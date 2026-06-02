-- AlterTable
ALTER TABLE "OwnerProfile" ADD COLUMN     "propertyCity" TEXT,
ADD COLUMN     "propertyCountry" TEXT,
ADD COLUMN     "propertyLatitude" DOUBLE PRECISION,
ADD COLUMN     "propertyLongitude" DOUBLE PRECISION,
ADD COLUMN     "propertyNeighborhood" TEXT,
ADD COLUMN     "propertyPostalCode" TEXT,
ADD COLUMN     "propertyState" TEXT,
ADD COLUMN     "propertyStreetAddress" TEXT,
ADD COLUMN     "propertyUnit" TEXT;

-- AlterTable
ALTER TABLE "ServiceProvider" ADD COLUMN     "serviceCountry" TEXT,
ADD COLUMN     "serviceNeighborhood" TEXT;
