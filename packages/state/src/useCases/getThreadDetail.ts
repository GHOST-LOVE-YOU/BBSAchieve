import type {
  BoardRepository,
  ReplyRepository,
  ThreadRepository,
  UserRepository,
} from "@bbs/domain";

export async function getThreadDetail(
  threadId: string,
  deps: {
    boards: BoardRepository;
    users: UserRepository;
    threads: ThreadRepository;
    replies: ReplyRepository;
  },
): Promise<
  | {
      status: "success";
      board: { id: string; slug: string; name: string };
      thread: {
        id: string;
        title: string;
        body: string;
        authorName: string;
        publishedAt: string;
      };
      replies: Array<{
        id: string;
        body: string;
        authorName: string;
        publishedAt: string;
      }>;
    }
  | { status: "notFound" }
  | { status: "error"; message: string }
> {
  try {
    const normalizedThreadId = threadId.startsWith("thread:") ? threadId : `thread:${threadId}`;
    const thread = await deps.threads.findById(normalizedThreadId);
    if (!thread) {
      return { status: "notFound" };
    }

    const board = await deps.boards.findById(thread.boardId);
    if (!board) {
      return {
        status: "error",
        message: `board not found for thread ${thread.id}`,
      };
    }

    const author = await deps.users.findById(thread.authorUserId);
    const replies = await deps.replies.listByThread(thread.id);
    const replyItems = await Promise.all(
      replies.map(async (reply) => {
        const replyAuthor = await deps.users.findById(reply.authorUserId);
        return {
          id: reply.id,
          body: reply.body,
          authorName: replyAuthor?.displayName ?? "未知作者",
          publishedAt: reply.publishedAt,
        };
      }),
    );

    return {
      status: "success",
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
      },
      replies: replyItems.sort(
        (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime(),
      ),
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "unknown error",
    };
  }
}
