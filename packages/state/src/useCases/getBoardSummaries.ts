import type { BoardRepository, ThreadRepository } from "@bbs/domain";

export async function getBoardSummaries(
  deps: {
    boards: BoardRepository;
    threads: ThreadRepository;
  },
): Promise<
  | {
      status: "success";
      boards: Array<{
        id: string;
        slug: string;
        name: string;
        description: string;
        threadCount: number;
        latestThreadTitle: string | null;
      }>;
    }
  | { status: "error"; message: string }
> {
  try {
    const boards = await deps.boards.list();

    const items = await Promise.all(
      boards.map(async (board) => {
        const threads = await deps.threads.listByBoard(board.id);
        const latestThread =
          [...threads].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))[0] ?? null;

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

    return { status: "success", boards: items };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "unknown error",
    };
  }
}
