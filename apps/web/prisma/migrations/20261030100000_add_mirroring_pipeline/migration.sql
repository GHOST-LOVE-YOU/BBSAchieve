-- CreateTable
CREATE TABLE "mirror_board_states" (
    "boardName" TEXT NOT NULL,
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCompletedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mirror_board_states_pkey" PRIMARY KEY ("boardName")
);

-- CreateTable
CREATE TABLE "mirror_leases" (
    "name" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mirror_leases_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "mirror_runs" (
    "id" TEXT NOT NULL,
    "boardName" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "nextBoardPage" INTEGER NOT NULL DEFAULT 1,
    "nextThreadPage" INTEGER NOT NULL DEFAULT 1,
    "boardComplete" BOOLEAN NOT NULL DEFAULT false,
    "pendingThreads" JSONB NOT NULL DEFAULT '[]',
    "pagesFetched" INTEGER NOT NULL DEFAULT 0,
    "threadsScanned" INTEGER NOT NULL DEFAULT 0,
    "actionsCreated" INTEGER NOT NULL DEFAULT 0,
    "skippedThreads" INTEGER NOT NULL DEFAULT 0,
    "requestsMade" INTEGER NOT NULL DEFAULT 0,
    "cacheHits" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mirror_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mirror_thread_states" (
    "boardName" TEXT NOT NULL,
    "sourceThreadId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mirror_thread_states_pkey" PRIMARY KEY ("boardName","sourceThreadId")
);

-- CreateTable
CREATE TABLE "mirror_actions" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "boardName" TEXT NOT NULL,
    "sourceThreadId" TEXT NOT NULL,
    "sourcePostId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "summary" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resultId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "mirror_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mirror_runs_boardName_startedAt_idx" ON "mirror_runs"("boardName", "startedAt");

-- CreateIndex
CREATE INDEX "mirror_runs_status_startedAt_idx" ON "mirror_runs"("status", "startedAt");

-- CreateIndex
CREATE INDEX "mirror_actions_status_nextAttemptAt_idx" ON "mirror_actions"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "mirror_actions_boardName_createdAt_idx" ON "mirror_actions"("boardName", "createdAt");

-- CreateIndex
CREATE INDEX "mirror_actions_runId_status_idx" ON "mirror_actions"("runId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "mirror_actions_boardName_sourcePostId_key" ON "mirror_actions"("boardName", "sourcePostId");

