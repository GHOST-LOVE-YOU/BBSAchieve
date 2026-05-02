import type { PrismaClient, ImportStatus, ImportSourceType } from "@prisma/client";

import type { NormalizedImportBatch } from "./syncTypes";

type ImportDelegate = PrismaClient["import"];
type BoardDelegate = PrismaClient["board"];
type UserDelegate = PrismaClient["user"];
type BotProfileDelegate = PrismaClient["botProfile"];
type ThreadDelegate = PrismaClient["thread"];
type ReplyDelegate = PrismaClient["reply"];

export type ImportSyncPrisma = {
  import: Pick<ImportDelegate, "create" | "update">;
  board: Pick<BoardDelegate, "upsert">;
  user: Pick<UserDelegate, "findFirst" | "create" | "update">;
  botProfile: Pick<BotProfileDelegate, "upsert">;
  thread: Pick<ThreadDelegate, "findUnique" | "upsert">;
  reply: Pick<ReplyDelegate, "findUnique" | "create">;
};

export type ImportSyncResult = {
  importId: string;
  importedThreads: number;
  importedReplies: number;
  skippedReplies: number;
};

type SyncAuthor = {
  username: string;
  displayName?: string;
  mailboxKey?: string | null;
};

type ExistingThreadRecord = {
  id: string;
  authorUserId: string;
  body: string;
  publishedAt: Date;
  replyCount: number;
  lastReplyAt: Date | null;
};

async function ensureBotUser(
  prisma: ImportSyncPrisma,
  sourceLabel: string,
  author: SyncAuthor,
) {
  const existing = await prisma.user.findFirst({
    where: {
      username: author.username,
      userType: "bot",
    },
  });

  const user =
    existing ??
    (await prisma.user.create({
      data: {
        username: author.username,
        displayName: author.displayName ?? author.username,
        avatarUrl: null,
        bio: null,
        userType: "bot",
        status: "active",
        mailboxKey: author.mailboxKey ?? null,
      },
    }));

  await prisma.botProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      sourceLabel,
      mailboxKey: author.mailboxKey ?? null,
      canPost: true,
      profileStatus: "active",
    },
    update: {
      sourceLabel,
      mailboxKey: author.mailboxKey ?? null,
      canPost: true,
      profileStatus: "active",
    },
  });

  return user;
}

function resolveThreadAuthorId(
  thread: NormalizedImportBatch["threads"][number],
  existingThread: ExistingThreadRecord | null,
  botUserRecords: Map<string, { id: string }>,
): string {
  if (thread.authorUsername) {
    const author = botUserRecords.get(thread.authorUsername);
    if (!author) {
      throw new Error(`missing author ${thread.authorUsername}`);
    }

    return author.id;
  }

  if (existingThread) {
    return existingThread.authorUserId;
  }

  throw new Error(`missing author for thread ${thread.sourceBoardSlug}:${thread.sourceThreadId}`);
}

export async function importSyncBatch(
  prisma: ImportSyncPrisma,
  batch: NormalizedImportBatch,
): Promise<ImportSyncResult> {
  const startedAt = new Date();
  const importRecord = await prisma.import.create({
    data: {
      sourceType: batch.sourceType as ImportSourceType,
      sourceLabel: batch.sourceLabel,
      status: "running" satisfies ImportStatus,
      startedAt,
      importedThreads: 0,
      importedReplies: 0,
      skippedReplies: 0,
      metadataJson: {
        boardCount: batch.boards.length,
        botUserCount: batch.botUsers.length,
        threadCount: batch.threads.length,
        replyCount: batch.replies.length,
      },
    },
  });

  try {
    const boardRecords = new Map<string, { id: string }>();
    for (const board of batch.boards) {
      const record = await prisma.board.upsert({
        where: { slug: board.slug },
        create: {
          slug: board.slug,
          name: board.name,
          description: board.description,
        },
        update: {
          name: board.name,
          description: board.description,
        },
      });
      boardRecords.set(board.slug, { id: record.id });
    }

    const botUsersByUsername = new Map<string, (typeof batch.botUsers)[number]>();
    for (const botUser of batch.botUsers) {
      botUsersByUsername.set(botUser.username, botUser);
    }

    const referencedAuthors = new Map<string, SyncAuthor>();
    for (const thread of batch.threads) {
      if (!thread.authorUsername) {
        continue;
      }
      referencedAuthors.set(thread.authorUsername, {
        username: thread.authorUsername,
        displayName: botUsersByUsername.get(thread.authorUsername)?.displayName,
        mailboxKey: botUsersByUsername.get(thread.authorUsername)?.mailboxKey,
      });
    }
    for (const reply of batch.replies) {
      referencedAuthors.set(reply.authorUsername, {
        username: reply.authorUsername,
        displayName: botUsersByUsername.get(reply.authorUsername)?.displayName,
        mailboxKey: botUsersByUsername.get(reply.authorUsername)?.mailboxKey,
      });
    }

    const botUserRecords = new Map<string, { id: string }>();
    for (const botUser of batch.botUsers) {
      const record = await ensureBotUser(prisma, batch.sourceLabel, botUser);
      botUserRecords.set(botUser.username, { id: record.id });
    }
    for (const author of referencedAuthors.values()) {
      if (!botUserRecords.has(author.username)) {
        const record = await ensureBotUser(prisma, batch.sourceLabel, author);
        botUserRecords.set(author.username, { id: record.id });
      }
    }

    const threadRecords = new Map<string, { id: string }>();
    for (const thread of batch.threads) {
      const threadReplies = batch.replies.filter(
        (reply) =>
          reply.sourceBoardSlug === thread.sourceBoardSlug &&
          reply.sourceThreadId === thread.sourceThreadId,
      );
      const existingThread = (await prisma.thread.findUnique({
        where: {
          sourceBoardSlug_sourceThreadId: {
            sourceBoardSlug: thread.sourceBoardSlug,
            sourceThreadId: thread.sourceThreadId,
          },
        },
      })) as ExistingThreadRecord | null;
      const authorUserId = resolveThreadAuthorId(thread, existingThread, botUserRecords);
      const persistedReplyCount = existingThread?.replyCount ?? 0;
      const nextReplyCount = Math.max(persistedReplyCount, thread.replyCount, threadReplies.length);
      const lastReplyAt =
        threadReplies.length > 0
          ? new Date(
              Math.max(
                ...threadReplies.map((reply) => reply.publishedAt.getTime()),
              ),
            )
          : existingThread?.lastReplyAt ?? null;
      const body = thread.body ?? existingThread?.body ?? "";
      const publishedAt =
        existingThread && thread.publishedAt
          ? thread.publishedAt < existingThread.publishedAt
            ? thread.publishedAt
            : existingThread.publishedAt
          : thread.publishedAt ?? existingThread?.publishedAt ?? new Date();

      const record = await prisma.thread.upsert({
        where: {
          sourceBoardSlug_sourceThreadId: {
            sourceBoardSlug: thread.sourceBoardSlug,
            sourceThreadId: thread.sourceThreadId,
          },
        },
        create: {
          boardId:
            boardRecords.get(thread.sourceBoardSlug)?.id ??
            (
              await prisma.board.upsert({
                where: { slug: thread.sourceBoardSlug },
                create: {
                  slug: thread.sourceBoardSlug,
                  name: thread.sourceBoardSlug,
                  description: "",
                },
                update: {},
              })
            ).id,
          sourceBoardSlug: thread.sourceBoardSlug,
          sourceThreadId: thread.sourceThreadId,
          authorUserId,
          title: thread.title,
          body,
          publishedAt,
          lastReplyAt,
          replyCount: nextReplyCount,
        },
        update: {
          authorUserId,
          title: thread.title,
          body,
          publishedAt,
          lastReplyAt,
          replyCount: nextReplyCount,
        },
      });
      threadRecords.set(`${thread.sourceBoardSlug}:${thread.sourceThreadId}`, {
        id: record.id,
      });
    }

    let importedReplies = 0;
    let skippedReplies = 0;
    for (const reply of batch.replies) {
      const threadKey = `${reply.sourceBoardSlug}:${reply.sourceThreadId}`;
      const thread = threadRecords.get(threadKey);
      if (!thread) {
        throw new Error(`missing thread ${threadKey}`);
      }

      const author = botUserRecords.get(reply.authorUsername);
      if (!author) {
        throw new Error(`missing reply author ${reply.authorUsername}`);
      }

      const existing = await prisma.reply.findUnique({
        where: {
          threadId_replyIndex: {
            threadId: thread.id,
            replyIndex: reply.replyIndex,
          },
        },
      });

      if (existing) {
        skippedReplies += 1;
        continue;
      }

      await prisma.reply.create({
        data: {
          threadId: thread.id,
          replyIndex: reply.replyIndex,
          authorUserId: author.id,
          body: reply.body,
          publishedAt: reply.publishedAt,
        },
      });
      importedReplies += 1;
    }

    const importedThreads = batch.threads.length;
    await prisma.import.update({
      where: { id: importRecord.id },
      data: {
        status: "succeeded",
        finishedAt: new Date(),
        importedThreads,
        importedReplies,
        skippedReplies,
      },
    });

    return {
      importId: importRecord.id,
      importedThreads,
      importedReplies,
      skippedReplies,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "unknown import failure";

    await prisma.import.update({
      where: { id: importRecord.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        errorMessage: message,
      },
    });
    throw error;
  }
}
