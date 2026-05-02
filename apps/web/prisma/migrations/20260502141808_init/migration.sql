-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('human', 'bot');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('running', 'succeeded', 'failed', 'partial', 'pending');

-- CreateEnum
CREATE TYPE "ImportSourceType" AS ENUM ('byr_sync_api', 'legacy_postgres');

-- CreateEnum
CREATE TYPE "ProfileStatus" AS ENUM ('pending', 'active', 'disabled');

-- CreateEnum
CREATE TYPE "BindingStatus" AS ENUM ('pending', 'active', 'revoked');

-- CreateTable
CREATE TABLE "boards" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "threads" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "sourceBoardSlug" TEXT NOT NULL,
    "sourceThreadId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "lastReplyAt" TIMESTAMP(3),
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "replies" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "replyIndex" INTEGER NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "userType" "UserType" NOT NULL,
    "status" TEXT NOT NULL,
    "mailboxKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "human_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authProvider" TEXT NOT NULL,
    "authSubject" TEXT NOT NULL,
    "email" TEXT,
    "profileStatus" "ProfileStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "human_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mailboxKey" TEXT,
    "sourceLabel" TEXT NOT NULL,
    "canPost" BOOLEAN NOT NULL DEFAULT false,
    "personaSummary" TEXT,
    "profileStatus" "ProfileStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_bot_bindings" (
    "id" TEXT NOT NULL,
    "humanUserId" TEXT NOT NULL,
    "botUserId" TEXT NOT NULL,
    "bindingStatus" "BindingStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_bot_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imports" (
    "id" TEXT NOT NULL,
    "sourceType" "ImportSourceType" NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "importedThreads" INTEGER NOT NULL DEFAULT 0,
    "importedReplies" INTEGER NOT NULL DEFAULT 0,
    "skippedReplies" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "boards_slug_key" ON "boards"("slug");

-- CreateIndex
CREATE INDEX "threads_boardId_lastReplyAt_idx" ON "threads"("boardId", "lastReplyAt");

-- CreateIndex
CREATE INDEX "threads_boardId_publishedAt_idx" ON "threads"("boardId", "publishedAt");

-- CreateIndex
CREATE INDEX "threads_authorUserId_idx" ON "threads"("authorUserId");

-- CreateIndex
CREATE UNIQUE INDEX "threads_sourceBoardSlug_sourceThreadId_key" ON "threads"("sourceBoardSlug", "sourceThreadId");

-- CreateIndex
CREATE INDEX "replies_threadId_publishedAt_idx" ON "replies"("threadId", "publishedAt");

-- CreateIndex
CREATE INDEX "replies_authorUserId_idx" ON "replies"("authorUserId");

-- CreateIndex
CREATE UNIQUE INDEX "replies_threadId_replyIndex_key" ON "replies"("threadId", "replyIndex");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "human_profiles_userId_key" ON "human_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "bot_profiles_userId_key" ON "bot_profiles"("userId");

-- CreateIndex
CREATE INDEX "user_bot_bindings_botUserId_idx" ON "user_bot_bindings"("botUserId");

-- CreateIndex
CREATE UNIQUE INDEX "user_bot_bindings_humanUserId_botUserId_key" ON "user_bot_bindings"("humanUserId", "botUserId");

-- CreateIndex
CREATE INDEX "imports_sourceType_sourceLabel_idx" ON "imports"("sourceType", "sourceLabel");

-- CreateIndex
CREATE INDEX "imports_status_startedAt_idx" ON "imports"("status", "startedAt");

-- AddForeignKey
ALTER TABLE "threads" ADD CONSTRAINT "threads_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threads" ADD CONSTRAINT "threads_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replies" ADD CONSTRAINT "replies_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replies" ADD CONSTRAINT "replies_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "human_profiles" ADD CONSTRAINT "human_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_profiles" ADD CONSTRAINT "bot_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bot_bindings" ADD CONSTRAINT "user_bot_bindings_humanUserId_fkey" FOREIGN KEY ("humanUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bot_bindings" ADD CONSTRAINT "user_bot_bindings_botUserId_fkey" FOREIGN KEY ("botUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
