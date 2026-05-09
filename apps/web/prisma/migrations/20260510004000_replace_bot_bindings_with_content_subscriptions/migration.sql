-- CreateEnum
CREATE TYPE "SubscriptionTargetType" AS ENUM ('thread', 'reply');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'muted', 'revoked');

-- CreateTable
CREATE TABLE "content_subscriptions" (
    "id" TEXT NOT NULL,
    "humanUserId" TEXT NOT NULL,
    "targetType" "SubscriptionTargetType" NOT NULL,
    "threadId" TEXT,
    "replyId" TEXT,
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_subscriptions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "content_subscriptions_target_check" CHECK (
        ("targetType" = 'thread' AND "threadId" IS NOT NULL AND "replyId" IS NULL)
        OR
        ("targetType" = 'reply' AND "replyId" IS NOT NULL AND "threadId" IS NULL)
    )
);

-- CreateIndex
CREATE INDEX "content_subscriptions_humanUserId_subscriptionStatus_idx" ON "content_subscriptions"("humanUserId", "subscriptionStatus");

-- CreateIndex
CREATE INDEX "content_subscriptions_targetType_threadId_idx" ON "content_subscriptions"("targetType", "threadId");

-- CreateIndex
CREATE INDEX "content_subscriptions_targetType_replyId_idx" ON "content_subscriptions"("targetType", "replyId");

-- CreateIndex
CREATE UNIQUE INDEX "content_subscriptions_humanUserId_targetType_threadId_key" ON "content_subscriptions"("humanUserId", "targetType", "threadId");

-- CreateIndex
CREATE UNIQUE INDEX "content_subscriptions_humanUserId_targetType_replyId_key" ON "content_subscriptions"("humanUserId", "targetType", "replyId");

-- AddForeignKey
ALTER TABLE "content_subscriptions" ADD CONSTRAINT "content_subscriptions_humanUserId_fkey" FOREIGN KEY ("humanUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_subscriptions" ADD CONSTRAINT "content_subscriptions_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_subscriptions" ADD CONSTRAINT "content_subscriptions_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "user_bot_bindings" DROP CONSTRAINT "user_bot_bindings_humanUserId_fkey";

-- DropForeignKey
ALTER TABLE "user_bot_bindings" DROP CONSTRAINT "user_bot_bindings_botUserId_fkey";

-- DropTable
DROP TABLE "user_bot_bindings";

-- DropEnum
DROP TYPE "BindingStatus";
