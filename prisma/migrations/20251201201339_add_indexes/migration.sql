-- CreateIndex
CREATE INDEX "Case_organizationId_status_idx" ON "Case"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Case_organizationId_isEmergency_idx" ON "Case"("organizationId", "isEmergency");

-- CreateIndex
CREATE INDEX "Case_organizationId_zoneId_idx" ON "Case"("organizationId", "zoneId");

-- CreateIndex
CREATE INDEX "Case_organizationId_assignedToTeamId_idx" ON "Case"("organizationId", "assignedToTeamId");

-- CreateIndex
CREATE INDEX "Case_organizationId_createdAt_idx" ON "Case"("organizationId", "createdAt");
