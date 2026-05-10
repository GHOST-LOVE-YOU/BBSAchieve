-- Add advisory metadata column to bot profiles. The product brief explicitly
-- states a single bot may map to multiple upstream BYR users, so this hint is
-- pure metadata used by admin tooling — never used to drive notifications.
ALTER TABLE "bot_profiles" ADD COLUMN "sourceUserHints" TEXT;

-- New enum + table for in-app notifications. Matches the design's notification
-- center: typed messages, read state, denormalized body so we can render
-- entries even after the upstream source is pruned.
CREATE TYPE "NotificationType" AS ENUM (
    'thread_reply',
    'reply_quote',
    'mirror_source_stale',
    'bot_rotated',
    'system'
);

CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "subscriptionId" TEXT,
    "threadId" TEXT,
    "replyId" TEXT,
    "body" TEXT NOT NULL,
    "sourceLabel" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_recipientUserId_readAt_idx"
    ON "notifications"("recipientUserId", "readAt");
CREATE INDEX "notifications_recipientUserId_occurredAt_idx"
    ON "notifications"("recipientUserId", "occurredAt");
CREATE INDEX "notifications_type_occurredAt_idx"
    ON "notifications"("type", "occurredAt");

ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_recipientUserId_fkey"
    FOREIGN KEY ("recipientUserId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "content_subscriptions"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "threads"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_replyId_fkey"
    FOREIGN KEY ("replyId") REFERENCES "replies"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
