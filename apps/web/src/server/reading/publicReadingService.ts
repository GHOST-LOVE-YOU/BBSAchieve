import {
  decodeBoardFeedCursor,
  encodeBoardFeedCursor,
} from "./boardFeedCursor";
import type {
  PublicBoardDetailDto,
  PublicBoardSummaryDto,
  PublicBoardThreadItemDto,
  PublicReplyItemDto,
  PublicThreadDetailDto,
} from "./publicReadingDtos";
import {
  createReadingRepository,
  type ReadingRepository,
} from "./readingRepository";

function normalizeLimit(limit: number | undefined) {
  if (limit == null) {
    return 20;
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
    throw new Error("Invalid limit");
  }
  return limit;
}

export function createPublicReadingService(
  input: { repository?: ReadingRepository } = {},
) {
  const repository = input.repository ?? createReadingRepository();

  return {
    async listBoards(): Promise<{ boards: PublicBoardSummaryDto[] }> {
      const boards = await repository.listBoards();
      const boardSummaries = await Promise.all(
        boards.map(async (board) => {
          const threads = await repository.listThreadsByBoard(board.id);
          const latestThread =
            [...threads].sort(
              (a, b) =>
                new Date(b.publishedAt).getTime() -
                new Date(a.publishedAt).getTime(),
            )[0] ?? null;

          return {
            id: board.id,
            slug: board.slug,
            name: board.name,
            description: board.description,
            threadCount: threads.length,
            latestThreadTitle: latestThread?.title ?? null,
          };
        }),
      );

      return { boards: boardSummaries };
    },

    async getBoard(boardIdOrSlug: string): Promise<PublicBoardDetailDto | null> {
      const board =
        (await repository.findBoardById(boardIdOrSlug)) ??
        (await repository.findBoardBySlug(boardIdOrSlug));
      if (!board) {
        return null;
      }
      return {
        id: board.id,
        slug: board.slug,
        name: board.name,
        description: board.description,
      };
    },

    async getBoardThreadsFeed(input: {
      boardIdOrSlug: string;
      limit?: number;
      cursor?: string;
    }): Promise<{
      items: PublicBoardThreadItemDto[];
      page: {
        limit: number;
        nextCursor: string | null;
        hasMore: boolean;
      };
    } | null> {
      const board = await this.getBoard(input.boardIdOrSlug);
      if (!board) {
        return null;
      }

      const limit = normalizeLimit(input.limit);
      const rows = await repository.listThreadsPageByBoard({
        boardId: board.id,
        limit: limit + 1,
        cursor: input.cursor ? decodeBoardFeedCursor(input.cursor) : undefined,
      });
      const hasMore = rows.length > limit;
      const items = rows.slice(0, limit);
      const authors = await repository.findUsersByIds(
        items.map((item) => item.authorUserId),
      );
      const lastItem = items.at(-1);

      return {
        items: items.map((item) => ({
          id: item.id,
          title: item.title,
          authorName: authors.get(item.authorUserId)?.displayName ?? "未知作者",
          publishedAt: item.publishedAt,
          replyCount: item.replyCount ?? 0,
          lastReplyAt: item.lastReplyAt ?? null,
        })),
        page: {
          limit,
          nextCursor:
            hasMore && lastItem
              ? encodeBoardFeedCursor({
                  lastReplyAt: lastItem.lastReplyAt ?? null,
                  id: lastItem.id,
                })
              : null,
          hasMore,
        },
      };
    },

    async getThread(threadId: string): Promise<PublicThreadDetailDto | null> {
      const thread = await repository.findThreadByRouteId(threadId);
      if (!thread) {
        return null;
      }

      const board = await repository.findBoardById(thread.boardId);
      const author = await repository.findUserById(thread.authorUserId);
      if (!board) {
        throw new Error(`Missing board for thread ${thread.id}`);
      }

      return {
        board: {
          id: board.id,
          slug: board.slug,
          name: board.name,
        },
        thread: {
          id: thread.id,
          title: thread.title,
          body: thread.body,
          authorName: author?.displayName ?? "未知作者",
          publishedAt: thread.publishedAt,
          replyCount: thread.replyCount ?? 0,
        },
      };
    },

    async getThreadRepliesFeed(input: {
      threadId: string;
      limit?: number;
      cursor?: string;
    }): Promise<{
      items: PublicReplyItemDto[];
      page: {
        limit: number;
        nextCursor: string | null;
        hasMore: boolean;
      };
    } | null> {
      const thread = await repository.findThreadByRouteId(input.threadId);
      if (!thread) {
        return null;
      }

      const limit = normalizeLimit(input.limit);
      const hasReplyCursor = input.cursor != null;
      if (hasReplyCursor && !/^\d+$/.test(input.cursor)) {
        throw new Error("Invalid reply cursor");
      }
      const replyCursor = hasReplyCursor ? Number(input.cursor) : undefined;

      const rows = await repository.listRepliesPageByThread({
        threadId: thread.id,
        limit: limit + 1,
        cursor: replyCursor,
      });
      const hasMore = rows.length > limit;
      const items = rows.slice(0, limit);
      const authors = await repository.findUsersByIds(
        items.map((item) => item.authorUserId),
      );
      const lastItem = items.at(-1);

      return {
        items: items.map((item) => ({
          id: item.id,
          body: item.body,
          authorName: authors.get(item.authorUserId)?.displayName ?? "未知作者",
          publishedAt: item.publishedAt,
          replyIndex: item.replyIndex ?? 0,
        })),
        page: {
          limit,
          nextCursor: hasMore && lastItem ? String(lastItem.replyIndex ?? 0) : null,
          hasMore,
        },
      };
    },
  };
}
