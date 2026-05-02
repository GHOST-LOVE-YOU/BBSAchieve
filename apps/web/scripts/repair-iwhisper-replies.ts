import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SyncBackfillPost = {
  post_id: string;
  floor_label: string;
  author_display_name: string;
  body: string;
};

type SyncBackfillPayload = {
  article_id: string;
  start_floor: number;
  posts: SyncBackfillPost[];
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function isOriginalPostFloor(floorLabel: string): boolean {
  const normalized = floorLabel.trim();
  return normalized === "楼主" || normalized === "0楼";
}

function parseReplyIndex(floorLabel: string): number | null {
  const normalized = floorLabel.trim();

  if (isOriginalPostFloor(normalized)) {
    return 0;
  }
  if (normalized === "沙发") {
    return 1;
  }
  if (normalized === "板凳") {
    return 2;
  }
  if (normalized === "地板") {
    return 3;
  }

  const match = normalized.match(/^(?:第)?(\d+)\s*楼$/);
  if (!match) {
    return null;
  }

  return Number.parseInt(match[1] ?? "", 10);
}

async function fetchBackfill(
  sourceThreadId: string,
): Promise<SyncBackfillPayload> {
  const baseUrl = getRequiredEnv("BYR_SYNC_API_BASE_URL").replace(/\/$/, "");
  const token = getRequiredEnv("BYR_SYNC_API_TOKEN");
  const response = await fetch(
    `${baseUrl}/api/sync/backfill?board_name=IWhisper&article_id=${encodeURIComponent(sourceThreadId)}&start_floor=1`,
    {
      method: "GET",
      headers: {
        "X-Sync-Token": token,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Backfill request failed for ${sourceThreadId}: ${response.status}`);
  }

  return (await response.json()) as SyncBackfillPayload;
}

async function findOrCreateBotUser(authorDisplayName: string, sourceLabel: string) {
  const existing = await prisma.user.findFirst({
    where: {
      username: authorDisplayName,
      userType: "bot",
    },
  });

  if (existing) {
    await prisma.botProfile.upsert({
      where: { userId: existing.id },
      create: {
        userId: existing.id,
        sourceLabel,
        mailboxKey: null,
        canPost: true,
        profileStatus: "active",
      },
      update: {
        sourceLabel,
        canPost: true,
        profileStatus: "active",
      },
    });
    return existing;
  }

  const created = await prisma.user.create({
    data: {
      username: authorDisplayName,
      displayName: authorDisplayName,
      avatarUrl: null,
      bio: null,
      userType: "bot",
      status: "active",
      mailboxKey: null,
    },
  });

  await prisma.botProfile.upsert({
    where: { userId: created.id },
    create: {
      userId: created.id,
      sourceLabel,
      mailboxKey: null,
      canPost: true,
      profileStatus: "active",
    },
    update: {
      sourceLabel,
      canPost: true,
      profileStatus: "active",
    },
  });

  return created;
}

async function repairThread(thread: {
  id: string;
  title: string;
  body: string;
  replyCount: number;
  sourceThreadId: string;
  sourceBoardSlug: string;
  publishedAt: Date;
}) {
  const payload = await fetchBackfill(thread.sourceThreadId);
  const originalPost = payload.posts.find((post) => isOriginalPostFloor(post.floor_label)) ?? null;
  const replyPosts = payload.posts
    .map((post) => ({
      post,
      replyIndex: parseReplyIndex(post.floor_label),
    }))
    .filter(
      (
        item,
      ): item is {
        post: SyncBackfillPost;
        replyIndex: number;
      } => item.replyIndex !== null && item.replyIndex > 0,
    )
    .sort((a, b) => a.replyIndex - b.replyIndex);

  const sourceLabel = "IWhisper";
  const authorsByName = new Map<string, { id: string }>();
  const authorNames = new Set<string>();

  if (originalPost) {
    authorNames.add(originalPost.author_display_name);
  }
  for (const { post } of replyPosts) {
    authorNames.add(post.author_display_name);
  }

  for (const authorName of authorNames) {
    const author = await findOrCreateBotUser(authorName, sourceLabel);
    authorsByName.set(authorName, { id: author.id });
  }

  await prisma.$transaction(async (tx) => {
    if (originalPost) {
      const author = authorsByName.get(originalPost.author_display_name);
      if (!author) {
        throw new Error(`missing thread author ${originalPost.author_display_name}`);
      }
      await tx.thread.update({
        where: { id: thread.id },
        data: {
          authorUserId: author.id,
          body: originalPost.body,
          replyCount: replyPosts.length,
          lastReplyAt: replyPosts.length > 0 ? new Date() : null,
        },
      });
    } else {
      await tx.thread.update({
        where: { id: thread.id },
        data: {
          replyCount: replyPosts.length,
          lastReplyAt: replyPosts.length > 0 ? new Date() : null,
        },
      });
    }

    await tx.reply.deleteMany({
      where: { threadId: thread.id },
    });

    for (const { post, replyIndex } of replyPosts) {
      const author = authorsByName.get(post.author_display_name);
      if (!author) {
        throw new Error(`missing reply author ${post.author_display_name}`);
      }
      await tx.reply.create({
        data: {
          threadId: thread.id,
          replyIndex,
          authorUserId: author.id,
          body: post.body,
          publishedAt: thread.publishedAt,
        },
      });
    }
  });

  return {
    threadId: thread.id,
    sourceThreadId: thread.sourceThreadId,
    originalBodyLength: thread.body.length,
    repairedReplyCount: replyPosts.length,
  };
}

async function main() {
  const targetThreads = await prisma.thread.findMany({
    where: {
      sourceBoardSlug: "iwhisper",
    },
    select: {
      id: true,
      title: true,
      body: true,
      replyCount: true,
      sourceThreadId: true,
      sourceBoardSlug: true,
      publishedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const results = [];
  for (const thread of targetThreads) {
    const repaired = await repairThread(thread);
    results.push(repaired);
  }

  console.log(
    JSON.stringify(
      {
        repairedCount: results.length,
        results,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
