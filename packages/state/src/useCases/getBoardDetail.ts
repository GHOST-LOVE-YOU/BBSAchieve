import type {
  BoardRepository,
  ReplyRepository,
  ThreadRepository,
  UserRepository,
} from "@bbs/domain";

export async function getBoardDetail(
  boardIdOrSlug: string,
  deps: {
    boards: BoardRepository;
    threads: ThreadRepository;
    replies: ReplyRepository;
    users: UserRepository;
  },
): Promise<
  | {
      status: "success";
      board: {
        id: string;
        slug: string;
        name: string;
        description: string;
      };
      threads: Array<{
        id: string;
        title: string;
        authorName: string;
        publishedAt: string;
        replyCount: number;
      }>;
    }
  | { status: "notFound" }
  | { status: "error"; message: string }
> {
  try {
    const board =
      (await deps.boards.findById(boardIdOrSlug)) ?? (await deps.boards.findBySlug(boardIdOrSlug));

    if (!board) {
      return { status: "notFound" };
    }

    const threads = await deps.threads.listByBoard(board.id);
    const threadItems = await Promise.all(
      threads.map(async (thread) => {
        const author = await deps.users.findById(thread.authorUserId);
        const replies = await deps.replies.listByThread(thread.id);

        return {
          id: thread.id,
          title: thread.title,
          authorName: author?.displayName ?? "未知作者",
          publishedAt: thread.publishedAt,
          replyCount: replies.length,
        };
      }),
    );

    return {
      status: "success",
      board: {
        id: board.id,
        slug: board.slug,
        name: board.name,
        description: board.description,
      },
      threads: threadItems.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "unknown error",
    };
  }
}
