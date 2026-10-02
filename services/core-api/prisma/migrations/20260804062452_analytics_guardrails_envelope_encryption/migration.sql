-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "autoApplyOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "encryptedDataKey" TEXT;

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "properties" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsEvent_organizationId_name_createdAt_idx" ON "AnalyticsEvent"("organizationId", "name", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_name_createdAt_idx" ON "AnalyticsEvent"("name", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_organizationId_threadRef_occurredAt_idx" ON "Activity"("organizationId", "threadRef", "occurredAt");

-- CreateIndex
CREATE INDEX "Activity_externalCallId_idx" ON "Activity"("externalCallId");

-- CreateIndex
CREATE INDEX "ActivityLink_activityId_idx" ON "ActivityLink"("activityId");

-- CreateIndex
CREATE INDEX "Deal_organizationId_pipelineId_status_updatedAt_idx" ON "Deal"("organizationId", "pipelineId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "Deal_organizationId_status_lastActivityAt_idx" ON "Deal"("organizationId", "status", "lastActivityAt");

-- CreateIndex
CREATE INDEX "Deal_organizationId_stallingSince_idx" ON "Deal"("organizationId", "stallingSince");

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
