-- CreateTable
CREATE TABLE "Homeless" (
    "id" TEXT NOT NULL,
    "nombre" TEXT,
    "apellido" TEXT,
    "apodo" TEXT,
    "edad" INTEGER,
    "estadoFisico" TEXT,
    "adicciones" TEXT,
    "estadoMental" TEXT,
    "atencionMedicaUrgente" BOOLEAN NOT NULL DEFAULT false,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "ultimaVezVisto" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fotoUrl" TEXT,
    "consentimientoVerbal" BOOLEAN NOT NULL DEFAULT false,
    "registradoPor" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Homeless_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Homeless_organizationId_idx" ON "Homeless"("organizationId");

-- CreateIndex
CREATE INDEX "Homeless_lat_lng_idx" ON "Homeless"("lat", "lng");

-- CreateIndex
CREATE INDEX "Homeless_ultimaVezVisto_idx" ON "Homeless"("ultimaVezVisto");

-- CreateIndex
CREATE INDEX "Homeless_registradoPor_idx" ON "Homeless"("registradoPor");

-- AddForeignKey
ALTER TABLE "Homeless" ADD CONSTRAINT "Homeless_registradoPor_fkey" FOREIGN KEY ("registradoPor") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homeless" ADD CONSTRAINT "Homeless_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
