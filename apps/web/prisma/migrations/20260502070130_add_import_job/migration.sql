-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('pending', 'running', 'paused', 'failed', 'succeeded', 'cancelled');

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'ImportSourceType'
          AND n.nspname = CURRENT_SCHEMA()
    ) THEN
        CREATE TYPE "ImportSourceType" AS ENUM ('byr_sync_api', 'legacy_postgres');
    END IF;
END
$$;

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "sourceType" "ImportSourceType" NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'pending',
    "cursorThreadKey" TEXT,
    "lastProcessedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "processedThreads" INTEGER NOT NULL DEFAULT 0,
    "processedReplies" INTEGER NOT NULL DEFAULT 0,
    "skippedThreads" INTEGER NOT NULL DEFAULT 0,
    "skippedReplies" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "progressNote" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_jobs_sourceType_sourceLabel_idx" ON "import_jobs"("sourceType", "sourceLabel");

-- CreateIndex
CREATE INDEX "import_jobs_status_startedAt_idx" ON "import_jobs"("status", "startedAt");
