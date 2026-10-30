-- AlterTable
ALTER TABLE "mirror_thread_states" ADD COLUMN     "collectedThroughFloor" INTEGER NOT NULL DEFAULT -1,
ADD COLUMN     "progressInitialized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publishedThroughFloor" INTEGER NOT NULL DEFAULT -1;

-- CreateTable
CREATE TABLE "mirror_anomalies" (
    "id" TEXT NOT NULL,
    "boardName" TEXT NOT NULL,
    "sourceThreadId" TEXT NOT NULL,
    "actionId" TEXT,
    "stage" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mirror_anomalies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mirror_anomalies_boardName_sourceThreadId_createdAt_idx" ON "mirror_anomalies"("boardName", "sourceThreadId", "createdAt");

-- 旧版本按时间窗口倒序扫描，不能沿用其半途页码。
-- 已保存原子任务不删除；活动扫描重新发现主题并按新进度定位。
UPDATE "mirror_runs" SET "status"='queued', "nextBoardPage"=1, "nextThreadPage"=1,
"pendingThreads"='[]'::jsonb, "boardComplete"=false, "updatedAt"=CURRENT_TIMESTAMP
WHERE "status" IN ('queued','collecting');
