-- CreateTable
CREATE TABLE "thread_bookmarks" (
    "id" TEXT NOT NULL,
    "humanUserId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thread_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "thread_bookmarks_humanUserId_createdAt_idx" ON "thread_bookmarks"("humanUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "thread_bookmarks_humanUserId_threadId_key" ON "thread_bookmarks"("humanUserId", "threadId");

-- AddForeignKey
ALTER TABLE "thread_bookmarks" ADD CONSTRAINT "thread_bookmarks_humanUserId_fkey" FOREIGN KEY ("humanUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_bookmarks" ADD CONSTRAINT "thread_bookmarks_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
