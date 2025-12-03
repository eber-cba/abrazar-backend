-- CreateEnum
CREATE TYPE "ServicePointType" AS ENUM ('HEALTH_CENTER', 'REFUGE', 'SOUP_KITCHEN', 'SHOWER_POINT', 'FOOD_POINT', 'TEMP_SHELTER');

-- CreateTable
CREATE TABLE "ServicePoint" (
    "id" TEXT NOT NULL,
    "type" "ServicePointType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "openingHours" TEXT,
    "capacity" INTEGER,
    "servicesOffered" JSONB,
    "contactPhone" TEXT,
    "email" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "zoneId" TEXT,

    CONSTRAINT "ServicePoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServicePoint_organizationId_idx" ON "ServicePoint"("organizationId");

-- CreateIndex
CREATE INDEX "ServicePoint_type_idx" ON "ServicePoint"("type");

-- CreateIndex
CREATE INDEX "ServicePoint_isPublic_idx" ON "ServicePoint"("isPublic");

-- CreateIndex
CREATE INDEX "ServicePoint_zoneId_idx" ON "ServicePoint"("zoneId");

-- AddForeignKey
ALTER TABLE "ServicePoint" ADD CONSTRAINT "ServicePoint_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePoint" ADD CONSTRAINT "ServicePoint_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
