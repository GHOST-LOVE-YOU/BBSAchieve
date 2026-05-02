-- CreateEnum
CREATE TYPE "ProfileStatus" AS ENUM ('pending', 'active', 'disabled');

-- CreateEnum
CREATE TYPE "BindingStatus" AS ENUM ('pending', 'active', 'revoked');

-- AlterEnum
BEGIN;
CREATE TYPE "ImportSourceType_new" AS ENUM ('byr_sync_api', 'legacy_postgres');
ALTER TABLE "imports" ALTER COLUMN "sourceType" TYPE "ImportSourceType_new" USING ("sourceType"::text::"ImportSourceType_new");
ALTER TYPE "ImportSourceType" RENAME TO "ImportSourceType_old";
ALTER TYPE "ImportSourceType_new" RENAME TO "ImportSourceType";
DROP TYPE "public"."ImportSourceType_old";
COMMIT;

-- AlterEnum
ALTER TYPE "ImportStatus" ADD VALUE 'partial';

-- DropForeignKey
ALTER TABLE "user_bot_bindings" DROP CONSTRAINT "user_bot_bindings_userId_fkey";

-- DropIndex
DROP INDEX "user_bot_bindings_userId_botUserId_key";

-- AlterTable
ALTER TABLE "bot_profiles" ADD COLUMN     "canPost" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mailboxKey" TEXT,
ADD COLUMN     "personaSummary" TEXT,
ADD COLUMN     "profileStatus" "ProfileStatus" NOT NULL,
ADD COLUMN     "sourceLabel" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "human_profiles" ADD COLUMN     "authProvider" TEXT NOT NULL,
ADD COLUMN     "authSubject" TEXT NOT NULL,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "profileStatus" "ProfileStatus" NOT NULL;

-- AlterTable
ALTER TABLE "threads" ADD COLUMN     "replyCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "user_bot_bindings" DROP COLUMN "userId",
ADD COLUMN     "bindingStatus" "BindingStatus" NOT NULL,
ADD COLUMN     "humanUserId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "bio" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "user_bot_bindings_humanUserId_botUserId_key" ON "user_bot_bindings"("humanUserId", "botUserId");

-- AddForeignKey
ALTER TABLE "user_bot_bindings" ADD CONSTRAINT "user_bot_bindings_humanUserId_fkey" FOREIGN KEY ("humanUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
