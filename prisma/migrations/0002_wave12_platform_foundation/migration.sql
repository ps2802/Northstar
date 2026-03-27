-- CreateEnum
CREATE TYPE "SessionRole" AS ENUM ('FOUNDER', 'MEMBER');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ProviderSetupStatus" AS ENUM ('NOT_CONFIGURED', 'CONFIGURED', 'ERROR');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('DISCONNECTED', 'PENDING', 'CONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "RevisionStatus" AS ENUM ('REQUESTED', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ExecutionJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELED');

-- AlterTable
ALTER TABLE "Approval"
ADD COLUMN "decidedAt" TIMESTAMP(3),
ADD COLUMN "decidedBy" TEXT;

-- AlterTable
ALTER TABLE "Task"
ADD COLUMN "priorityContextBoost" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "FounderIntake" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "founderName" TEXT,
    "founderEmail" TEXT,
    "businessDescription" TEXT,
    "currentGoalsJson" TEXT,
    "initiativesJson" TEXT,
    "answersJson" TEXT,
    "planningContext" TEXT,
    "lastSubmittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FounderIntake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceSession" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "founderIntakeId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "SessionRole" NOT NULL,
    "status" "SessionStatus" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionProviderConfig" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "authType" TEXT NOT NULL,
    "status" "ProviderSetupStatus" NOT NULL,
    "baseUrl" TEXT,
    "defaultModel" TEXT,
    "scopesJson" TEXT,
    "configJson" TEXT,
    "lastValidatedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecutionProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationConnection" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "providerKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "authType" TEXT NOT NULL,
    "status" "ConnectionStatus" NOT NULL,
    "externalAccountId" TEXT,
    "metadataJson" TEXT,
    "syncStateJson" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtifactRevision" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "artifactId" TEXT NOT NULL,
    "approvalId" TEXT,
    "requestedBy" TEXT NOT NULL,
    "status" "RevisionStatus" NOT NULL,
    "instruction" TEXT NOT NULL,
    "submittedContent" TEXT,
    "changeSummary" TEXT,
    "submittedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtifactRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT,
    "artifactId" TEXT,
    "revisionId" TEXT,
    "providerConfigId" TEXT,
    "runType" TEXT NOT NULL,
    "queueName" TEXT NOT NULL,
    "status" "ExecutionJobStatus" NOT NULL,
    "dedupeKey" TEXT,
    "inputJson" TEXT,
    "outputJson" TEXT,
    "errorMessage" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecutionJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FounderIntake_projectId_key" ON "FounderIntake"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceSession_tokenHash_key" ON "WorkspaceSession"("tokenHash");

-- CreateIndex
CREATE INDEX "WorkspaceSession_workspaceId_status_idx" ON "WorkspaceSession"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionProviderConfig_workspaceId_providerKey_key" ON "ExecutionProviderConfig"("workspaceId", "providerKey");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConnection_workspaceId_providerKey_key" ON "IntegrationConnection"("workspaceId", "providerKey");

-- CreateIndex
CREATE UNIQUE INDEX "ArtifactRevision_approvalId_key" ON "ArtifactRevision"("approvalId");

-- CreateIndex
CREATE INDEX "ArtifactRevision_projectId_status_createdAt_idx" ON "ArtifactRevision"("projectId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ExecutionJob_projectId_status_queuedAt_idx" ON "ExecutionJob"("projectId", "status", "queuedAt");

-- AddForeignKey
ALTER TABLE "FounderIntake" ADD CONSTRAINT "FounderIntake_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceSession" ADD CONSTRAINT "WorkspaceSession_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceSession" ADD CONSTRAINT "WorkspaceSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceSession" ADD CONSTRAINT "WorkspaceSession_founderIntakeId_fkey" FOREIGN KEY ("founderIntakeId") REFERENCES "FounderIntake"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionProviderConfig" ADD CONSTRAINT "ExecutionProviderConfig_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtifactRevision" ADD CONSTRAINT "ArtifactRevision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtifactRevision" ADD CONSTRAINT "ArtifactRevision_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "Artifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtifactRevision" ADD CONSTRAINT "ArtifactRevision_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "Approval"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionJob" ADD CONSTRAINT "ExecutionJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionJob" ADD CONSTRAINT "ExecutionJob_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionJob" ADD CONSTRAINT "ExecutionJob_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "Artifact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionJob" ADD CONSTRAINT "ExecutionJob_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "ArtifactRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionJob" ADD CONSTRAINT "ExecutionJob_providerConfigId_fkey" FOREIGN KEY ("providerConfigId") REFERENCES "ExecutionProviderConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
