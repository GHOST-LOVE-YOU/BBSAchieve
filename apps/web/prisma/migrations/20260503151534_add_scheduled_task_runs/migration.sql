-- CreateEnum
CREATE TYPE "ScheduledTaskRunStatus" AS ENUM ('running', 'succeeded', 'failed', 'skipped');

-- CreateEnum
CREATE TYPE "ScheduledTaskTriggerSource" AS ENUM ('scheduled', 'manual');

-- CreateTable
CREATE TABLE "scheduled_task_runs" (
    "id" TEXT NOT NULL,
    "taskKey" TEXT NOT NULL,
    "taskTitle" TEXT NOT NULL,
    "triggerSource" "ScheduledTaskTriggerSource" NOT NULL,
    "status" "ScheduledTaskRunStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "intervalMinutes" INTEGER NOT NULL,
    "windowMinutes" INTEGER NOT NULL,
    "boardName" TEXT NOT NULL,
    "importedThreads" INTEGER NOT NULL DEFAULT 0,
    "importedReplies" INTEGER NOT NULL DEFAULT 0,
    "skippedReason" TEXT,
    "errorMessage" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_task_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduled_task_runs_taskKey_startedAt_idx" ON "scheduled_task_runs"("taskKey", "startedAt");

-- CreateIndex
CREATE INDEX "scheduled_task_runs_status_startedAt_idx" ON "scheduled_task_runs"("status", "startedAt");
