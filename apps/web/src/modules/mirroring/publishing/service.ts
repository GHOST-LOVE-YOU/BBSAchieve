import { createHash } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { actionPayloadSchema } from "../planning/actions";
import { getMirrorBoard } from "../config";

export class PublicationError extends Error {}

export async function publishAtomicAction(db: PrismaClient, actionId: string) {
  return db.$transaction(
    async (tx) => {
      // 同一源站主题的所有原子任务串行，含重复 HTTP 请求和多个实例。
      const initial = await tx.mirrorAction.findUniqueOrThrow({
        where: { id: actionId },
      });
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${initial.boardName + ":" + initial.sourceThreadId}))`;
      const task = await tx.mirrorAction.findUniqueOrThrow({
        where: { id: actionId },
      });
      if (task.status === "published")
        return { id: task.resultId, duplicate: true };
      if (task.status !== "pending" && task.status !== "retrying")
      throw new PublicationError("任务当前不可发布");
      const payload = actionPayloadSchema.parse(task.payload);
      const board = getMirrorBoard(payload.boardName);
      const sourceWhere = {
        sourceBoardSlug: board.slug,
        sourceThreadId: payload.sourceThreadId,
      };
      let thread = await tx.thread.findUnique({
        where: { sourceBoardSlug_sourceThreadId: sourceWhere },
      });
      if (!thread && payload.kind === "reply")
        throw new PublicationError("主帖尚未发布，等待主帖任务完成后重试");
      const finish = async (id: string, duplicate: boolean) => {
        await tx.mirrorAction.update({
          where: { id: task.id },
          data: {
            status: "published",
            resultId: id,
            publishedAt: new Date(),
            errorMessage: null,
          },
        });
        return { id, duplicate };
      };
      if (payload.kind === "thread" && thread) return finish(thread.id, true);
      // 旧镜像没有源站回复 ID：只在楼层、正文、作者一致时建立回执，绝不覆盖历史内容。
      if (thread && payload.kind === "reply") {
        const legacy = await tx.reply.findUnique({
          where: {
            threadId_replyIndex: {
              threadId: thread.id,
              replyIndex: payload.sourceFloor,
            },
          },
          include: { author: true },
        });
        if (
          legacy &&
          legacy.body.trim() === payload.body.trim() &&
          legacy.author.username === payload.author
        )
          return finish(legacy.id, true);
      }
      const botId =
        "mirror-bot:" +
        createHash("sha256").update(payload.author).digest("hex").slice(0, 32);
      let bot = await tx.user.findFirst({
        where: { username: payload.author, userType: "bot" },
        orderBy: { id: "asc" },
      });
      if (!bot)
        bot = await tx.user.upsert({
          where: { id: botId },
          create: {
            id: botId,
            username: payload.author,
            displayName: payload.author,
            userType: "bot",
            status: "active",
          },
          update: {},
        });
      await tx.botProfile.upsert({
        where: { userId: bot.id },
        create: {
          userId: bot.id,
          sourceLabel: payload.boardName,
          canPost: true,
          profileStatus: "active",
        },
        update: {},
      });
      if (bot.status !== "active") throw new PublicationError("机器人已停用");
      const profile = await tx.botProfile.findUniqueOrThrow({
        where: { userId: bot.id },
      });
      if (!profile.canPost || profile.profileStatus !== "active")
        throw new PublicationError("机器人没有发帖权限");
      if (payload.kind === "thread") {
        const boardRecord = await tx.board.upsert({
          where: { slug: board.slug },
          create: { slug: board.slug, name: board.title, description: "" },
          update: {},
        });
        thread = await tx.thread.create({
          data: {
            ...sourceWhere,
            boardId: boardRecord.id,
            authorUserId: bot.id,
            title: payload.title,
            body: payload.body,
            publishedAt: new Date(payload.publishedAt),
          },
        });
        return finish(thread.id, false);
      }
      const existingThread = thread!;
      const last = await tx.reply.findFirst({
        where: { threadId: existingThread.id },
        orderBy: { replyIndex: "desc" },
        select: { replyIndex: true },
      });
      const occupied = await tx.reply.findUnique({
        where: {
          threadId_replyIndex: {
            threadId: existingThread.id,
            replyIndex: payload.sourceFloor,
          },
        },
        select: { id: true },
      });
      const replyIndex =
        occupied || payload.sourceFloor === 0
          ? (last?.replyIndex ?? 0) + 1
          : payload.sourceFloor;
      const reply = await tx.reply.create({
        data: {
          threadId: existingThread.id,
          replyIndex,
          authorUserId: bot.id,
          body: payload.body,
          publishedAt: new Date(payload.publishedAt),
        },
      });
      await tx.thread.update({
        where: { id: existingThread.id },
        data: {
          replyCount: await tx.reply.count({
            where: { threadId: existingThread.id },
          }),
          lastReplyAt:
            !existingThread.lastReplyAt ||
            reply.publishedAt > existingThread.lastReplyAt
              ? reply.publishedAt
              : existingThread.lastReplyAt,
        },
      });
      const quoted = await tx.mirrorAction.findMany({
        where: {
          boardName: payload.boardName,
          sourceThreadId: payload.sourceThreadId,
          sourcePostId: { in: payload.quotedSourcePostIds },
          kind: "reply",
          status: "published",
          resultId: { not: null },
        },
        select: { resultId: true },
      });
      const subscriptions = await tx.contentSubscription.findMany({
        where: {
          subscriptionStatus: "active",
          createdAt: { lte: reply.publishedAt },
          OR: [
            { targetType: "thread", threadId: existingThread.id },
            {
              targetType: "reply",
              replyId: { in: quoted.map((q) => q.resultId!) },
            },
          ],
        },
      });
      // 事务内创建消息与发布回执，重试/响应丢失不会重复通知。
      const byRecipient = new Map(subscriptions.map((s) => [s.humanUserId, s]));
      if (byRecipient.size)
        await tx.notification.createMany({
          data: [...byRecipient.values()].map((s) => ({
            recipientUserId: s.humanUserId,
            subscriptionId: s.id,
            type:
              s.targetType === "reply"
                ? ("reply_quote" as const)
                : ("thread_reply" as const),
            threadId: existingThread.id,
            replyId: reply.id,
            body: `${payload.author} 回复了「${existingThread.title}」`,
            sourceLabel: payload.author,
            occurredAt: reply.publishedAt,
          })),
        });
      return finish(reply.id, false);
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      timeout: 15_000,
    },
  );
}
