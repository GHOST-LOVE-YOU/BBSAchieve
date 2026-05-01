import { describe, expect, it } from "vitest";

import {
  InMemoryBoardRepository,
  InMemoryReplyRepository,
  InMemoryThreadRepository,
  InMemoryUserRepository,
  createForumFixture,
} from "@bbs/test-utils";

async function getBoardSummaries(deps: {
  boards: InMemoryBoardRepository;
  replies: InMemoryReplyRepository;
  threads: InMemoryThreadRepository;
  users: InMemoryUserRepository;
}) {
  const boards = await deps.boards.list();

  return Promise.all(
    boards.map(async (board) => {
      const threads = await deps.threads.listByBoard(board.id);
      const replies = await Promise.all(
        threads.map((thread) => deps.replies.listByThread(thread.id)),
      );
      const replyCount = replies.reduce((total, items) => total + items.length, 0);
      const latestThread = threads[threads.length - 1] ?? null;
      const latestAuthor = latestThread
        ? await deps.users.findById(latestThread.authorUserId)
        : null;

      return {
        boardId: board.id,
        boardName: board.name,
        description: board.description,
        threadCount: threads.length,
        replyCount,
        latestThreadTitle: latestThread?.title ?? null,
        latestThreadAuthorName: latestAuthor?.displayName ?? null,
      };
    }),
  );
}

describe("getBoardSummaries", () => {
  it("reads board, thread, reply, and user data from shared fixtures", async () => {
    const fixture = createForumFixture();
    const boards = new InMemoryBoardRepository(fixture.boards);
    const replies = new InMemoryReplyRepository(fixture.replies);
    const threads = new InMemoryThreadRepository(fixture.threads);
    const users = new InMemoryUserRepository(fixture.users);

    const summaries = await getBoardSummaries({
      boards,
      replies,
      threads,
      users,
    });

    expect(summaries).toEqual([
      {
        boardId: "board-1",
        boardName: "Tech",
        description: "Development and tooling discussion",
        threadCount: 2,
        replyCount: 3,
        latestThreadTitle: "Frontend Sync Flow",
        latestThreadAuthorName: "Alice",
      },
      {
        boardId: "board-2",
        boardName: "Life",
        description: "Daily chat and sharing",
        threadCount: 1,
        replyCount: 0,
        latestThreadTitle: "What to Eat Today",
        latestThreadAuthorName: "Robot 2",
      },
    ]);
  });
});
