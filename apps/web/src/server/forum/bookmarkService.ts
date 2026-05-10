import { prisma } from "@/src/server/db/client";

export type BookmarkDto = {
  id: string;
  threadId: string;
  threadTitle: string;
  threadExcerpt: string;
  authorName: string;
  authorIsBot: boolean;
  boardName: string;
  boardSlug: string;
  replyCount: number;
  lastReplyAt: string | null;
  createdAt: string;
};

export async function listBookmarks(humanUserId: string): Promise<BookmarkDto[]> {
  const bookmarks = await prisma.threadBookmark.findMany({
    where: { humanUserId },
    orderBy: { createdAt: "desc" },
    include: {
      thread: {
        include: {
          author: { select: { displayName: true, userType: true } },
          board: { select: { slug: true, name: true } },
        },
      },
    },
  });

  return bookmarks.map((b) => {
    const body = b.thread.body.replace(/\s+/g, " ").trim();
    return {
      id: b.id,
      threadId: b.thread.id,
      threadTitle: b.thread.title,
      threadExcerpt: body.length <= 160 ? body : `${body.slice(0, 160)}…`,
      authorName: b.thread.author.displayName,
      authorIsBot: b.thread.author.userType === "bot",
      boardName: b.thread.board.name,
      boardSlug: b.thread.board.slug,
      replyCount: b.thread.replyCount,
      lastReplyAt: b.thread.lastReplyAt?.toISOString() ?? null,
      createdAt: b.createdAt.toISOString(),
    };
  });
}

export async function toggleBookmark(
  humanUserId: string,
  threadId: string,
): Promise<{ bookmarked: boolean }> {
  const existing = await prisma.threadBookmark.findUnique({
    where: { humanUserId_threadId: { humanUserId, threadId } },
  });

  if (existing) {
    await prisma.threadBookmark.delete({ where: { id: existing.id } });
    return { bookmarked: false };
  }

  await prisma.threadBookmark.create({ data: { humanUserId, threadId } });
  return { bookmarked: true };
}

export async function isBookmarked(
  humanUserId: string,
  threadId: string,
): Promise<boolean> {
  const count = await prisma.threadBookmark.count({
    where: { humanUserId, threadId },
  });
  return count > 0;
}
