import { describe, expect, it, vi } from "vitest";

import { decodeBoardFeedCursor } from "@/src/server/reading/boardFeedCursor";
import { createPublicReadingService } from "@/src/server/reading/publicReadingService";
import {
  createReadingRepository,
  type ReadingRepository,
} from "@/src/server/reading/readingRepository";

type PublicReadingRepository = ReadingRepository;

function createRepository(
  overrides: Partial<PublicReadingRepository> = {},
): PublicReadingRepository {
  return {
    findBoardById: async () => null,
    findBoardBySlug: async () => null,
    listBoards: async () => [],
    findThreadById: async () => null,
    listThreadsByBoard: async () => [],
    findReplyById: async () => null,
    listRepliesByThread: async () => [],
    findUserById: async () => null,
    findUserByUsername: async () => null,
    findThreadByRouteId: async () => null,
    listThreadsPageByBoard: async () => [],
    listRepliesPageByThread: async () => [],
    findUsersByIds: async () => new Map(),
    ...overrides,
  };
}

describe("publicReadingService", () => {
  it("returns board summaries with threadCount and latestThreadTitle", async () => {
    const service = createPublicReadingService({
      repository: createRepository({
        listBoards: vi.fn<ReadingRepository["listBoards"]>().mockResolvedValue([
          {
            id: "board:job",
            slug: "job",
            name: "Jobs and Offers",
            description: "Signals for roles, openings, and practical next steps.",
          },
        ]),
        listThreadsByBoard: vi.fn().mockResolvedValue([
          {
            id: "thread:first-offer",
            boardId: "board:job",
            authorUserId: "user:robot-1",
            sourceBoardSlug: "job",
            sourceThreadId: "source-thread-1",
            title: "First offer from the mirror",
            body: "A new listing has been mirrored and is ready to read.",
            publishedAt: "2026-05-01T08:00:00.000Z",
            replyCount: 2,
            lastReplyAt: "2026-05-01T08:10:00.000Z",
          },
        ]),
      }),
    });

    await expect(service.listBoards()).resolves.toEqual({
      boards: [
        {
          id: "board:job",
          slug: "job",
          name: "Jobs and Offers",
          description: "Signals for roles, openings, and practical next steps.",
          threadCount: 1,
          latestThreadTitle: "First offer from the mirror",
        },
      ],
    });
  });

  it("returns board detail", async () => {
    const service = createPublicReadingService({
      repository: createRepository({
        findBoardById: vi.fn<ReadingRepository["findBoardById"]>().mockResolvedValue(null),
        findBoardBySlug: vi.fn<ReadingRepository["findBoardBySlug"]>().mockResolvedValue({
          id: "board:job",
          slug: "job",
          name: "Jobs and Offers",
          description: "Signals for roles, openings, and practical next steps.",
        }),
      }),
    });

    await expect(service.getBoard("job")).resolves.toEqual({
      id: "board:job",
      slug: "job",
      name: "Jobs and Offers",
      description: "Signals for roles, openings, and practical next steps.",
    });
  });

  it("returns board thread feed with cursor pagination", async () => {
    const listThreadsPageByBoard = vi
      .fn<ReadingRepository["listThreadsPageByBoard"]>()
      .mockResolvedValueOnce([
        {
          id: "thread:2",
          boardId: "board:job",
          authorUserId: "user:robot-2",
          sourceBoardSlug: "job",
          sourceThreadId: "source-thread-2",
          title: "Second thread",
          body: "Second body",
          publishedAt: "2026-05-01T09:00:00.000Z",
          replyCount: 1,
          lastReplyAt: "2026-05-01T10:00:00.000Z",
        },
        {
          id: "thread:1",
          boardId: "board:job",
          authorUserId: "user:robot-1",
          sourceBoardSlug: "job",
          sourceThreadId: "source-thread-1",
          title: "First thread",
          body: "First body",
          publishedAt: "2026-05-01T08:00:00.000Z",
          replyCount: 0,
          lastReplyAt: null,
        },
        {
          id: "thread:older",
          boardId: "board:job",
          authorUserId: "user:robot-1",
          sourceBoardSlug: "job",
          sourceThreadId: "source-thread-0",
          title: "Older thread",
          body: "Older body",
          publishedAt: "2026-05-01T07:00:00.000Z",
          replyCount: 0,
          lastReplyAt: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "thread:older",
          boardId: "board:job",
          authorUserId: "user:robot-1",
          sourceBoardSlug: "job",
          sourceThreadId: "source-thread-0",
          title: "Older thread",
          body: "Older body",
          publishedAt: "2026-05-01T07:00:00.000Z",
          replyCount: 0,
          lastReplyAt: null,
        },
      ]);
    const service = createPublicReadingService({
      repository: createRepository({
        findBoardById: vi.fn<ReadingRepository["findBoardById"]>().mockResolvedValue(null),
        findBoardBySlug: vi.fn<ReadingRepository["findBoardBySlug"]>().mockResolvedValue({
          id: "board:job",
          slug: "job",
          name: "Jobs and Offers",
          description: "Signals for roles, openings, and practical next steps.",
        }),
        listThreadsPageByBoard,
        findUsersByIds: vi.fn<ReadingRepository["findUsersByIds"]>().mockResolvedValue(
          new Map([
            [
              "user:robot-1",
              {
                id: "user:robot-1",
                username: "robot-1",
                displayName: "Robot 1",
                userType: "bot",
                status: "active",
              },
            ],
            [
              "user:robot-2",
              {
                id: "user:robot-2",
                username: "robot-2",
                displayName: "Robot 2",
                userType: "bot",
                status: "active",
              },
            ],
          ]),
        ),
      }),
    });

    await expect(service.getBoardThreadsFeed({ boardIdOrSlug: "job", limit: 2 })).resolves.toEqual({
      items: [
        {
          id: "thread:2",
          title: "Second thread",
          authorName: "Robot 2",
          publishedAt: "2026-05-01T09:00:00.000Z",
          replyCount: 1,
          lastReplyAt: "2026-05-01T10:00:00.000Z",
        },
        {
          id: "thread:1",
          title: "First thread",
          authorName: "Robot 1",
          publishedAt: "2026-05-01T08:00:00.000Z",
          replyCount: 0,
          lastReplyAt: null,
        },
      ],
      page: {
        limit: 2,
        nextCursor: "eyJsYXN0UmVwbHlBdCI6bnVsbCwiaWQiOiJ0aHJlYWQ6MSJ9",
        hasMore: true,
      },
    });

    await expect(
      service.getBoardThreadsFeed({
        boardIdOrSlug: "job",
        limit: 2,
        cursor: "eyJsYXN0UmVwbHlBdCI6bnVsbCwiaWQiOiJ0aHJlYWQ6MSJ9",
      }),
    ).resolves.toEqual({
      items: [
        {
          id: "thread:older",
          title: "Older thread",
          authorName: "Robot 1",
          publishedAt: "2026-05-01T07:00:00.000Z",
          replyCount: 0,
          lastReplyAt: null,
        },
      ],
      page: {
        limit: 2,
        nextCursor: null,
        hasMore: false,
      },
    });

    expect(listThreadsPageByBoard).toHaveBeenNthCalledWith(2, {
      boardId: "board:job",
      limit: 3,
      cursor: {
        id: "thread:1",
        lastReplyAt: null,
      },
    });
  });

  it("returns thread detail", async () => {
    const service = createPublicReadingService({
      repository: createRepository({
        findThreadByRouteId: vi.fn<ReadingRepository["findThreadByRouteId"]>().mockResolvedValue({
          id: "thread:first-offer",
          boardId: "board:job",
          authorUserId: "user:robot-1",
          sourceBoardSlug: "job",
          sourceThreadId: "source-thread-1",
          title: "First offer from the mirror",
          body: "A new listing has been mirrored and is ready to read.",
          publishedAt: "2026-05-01T08:00:00.000Z",
          replyCount: 2,
          lastReplyAt: "2026-05-01T08:10:00.000Z",
        }),
        findBoardById: vi.fn<ReadingRepository["findBoardById"]>().mockResolvedValue({
          id: "board:job",
          slug: "job",
          name: "Jobs and Offers",
          description: "Signals for roles, openings, and practical next steps.",
        }),
        findUserById: vi.fn<ReadingRepository["findUserById"]>().mockResolvedValue({
          id: "user:robot-1",
          username: "robot-1",
          displayName: "Robot 1",
          userType: "bot",
          status: "active",
        }),
      }),
    });

    await expect(service.getThread("first-offer")).resolves.toEqual({
      board: {
        id: "board:job",
        slug: "job",
        name: "Jobs and Offers",
      },
      thread: {
        id: "thread:first-offer",
        title: "First offer from the mirror",
        body: "A new listing has been mirrored and is ready to read.",
        authorName: "Robot 1",
        publishedAt: "2026-05-01T08:00:00.000Z",
        replyCount: 2,
      },
    });
  });

  it("returns thread replies feed DTO with pagination metadata", async () => {
    const listRepliesPageByThread = vi
      .fn<ReadingRepository["listRepliesPageByThread"]>()
      .mockResolvedValueOnce([
        {
          id: "reply:1",
          threadId: "thread:first-offer",
          authorUserId: "user:alice",
          replyIndex: 1,
          body: "Reply 1",
          publishedAt: "2026-05-01T08:05:00.000Z",
        },
        {
          id: "reply:2",
          threadId: "thread:first-offer",
          authorUserId: "user:robot-1",
          replyIndex: 2,
          body: "Reply 2",
          publishedAt: "2026-05-01T08:10:00.000Z",
        },
        {
          id: "reply:3",
          threadId: "thread:first-offer",
          authorUserId: "user:alice",
          replyIndex: 3,
          body: "Reply 3",
          publishedAt: "2026-05-01T08:15:00.000Z",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "reply:3",
          threadId: "thread:first-offer",
          authorUserId: "user:alice",
          replyIndex: 3,
          body: "Reply 3",
          publishedAt: "2026-05-01T08:15:00.000Z",
        },
      ]);
    const service = createPublicReadingService({
      repository: createRepository({
        findThreadByRouteId: vi.fn<ReadingRepository["findThreadByRouteId"]>().mockResolvedValue({
          id: "thread:first-offer",
          boardId: "board:job",
          authorUserId: "user:robot-1",
          sourceBoardSlug: "job",
          sourceThreadId: "source-thread-1",
          title: "First offer from the mirror",
          body: "A new listing has been mirrored and is ready to read.",
          publishedAt: "2026-05-01T08:00:00.000Z",
          replyCount: 2,
          lastReplyAt: "2026-05-01T08:10:00.000Z",
        }),
        findBoardById: vi.fn<ReadingRepository["findBoardById"]>().mockResolvedValue({
          id: "board:job",
          slug: "job",
          name: "Jobs and Offers",
          description: "Signals for roles, openings, and practical next steps.",
        }),
        findUserById: vi.fn<ReadingRepository["findUserById"]>().mockResolvedValue({
          id: "user:robot-1",
          username: "robot-1",
          displayName: "Robot 1",
          userType: "bot",
          status: "active",
        }),
        listRepliesPageByThread,
        findUsersByIds: vi.fn<ReadingRepository["findUsersByIds"]>().mockResolvedValue(
          new Map([
            [
              "user:alice",
              {
                id: "user:alice",
                username: "alice",
                displayName: "Alice",
                userType: "human",
                status: "active",
              },
            ],
            [
              "user:robot-1",
              {
                id: "user:robot-1",
                username: "robot-1",
                displayName: "Robot 1",
                userType: "bot",
                status: "active",
              },
            ],
          ]),
        ),
      }),
    });

    await expect(service.getThreadRepliesFeed({ threadId: "first-offer", limit: 2 })).resolves.toEqual({
      items: [
        {
          id: "reply:1",
          body: "Reply 1",
          authorName: "Alice",
          publishedAt: "2026-05-01T08:05:00.000Z",
          replyIndex: 1,
        },
        {
          id: "reply:2",
          body: "Reply 2",
          authorName: "Robot 1",
          publishedAt: "2026-05-01T08:10:00.000Z",
          replyIndex: 2,
        },
      ],
      page: {
        limit: 2,
        nextCursor: "2",
        hasMore: true,
      },
    });

    await expect(
      service.getThreadRepliesFeed({
        threadId: "first-offer",
        limit: 2,
        cursor: "2",
      }),
    ).resolves.toEqual({
      items: [
        {
          id: "reply:3",
          body: "Reply 3",
          authorName: "Alice",
          publishedAt: "2026-05-01T08:15:00.000Z",
          replyIndex: 3,
        },
      ],
      page: {
        limit: 2,
        nextCursor: null,
        hasMore: false,
      },
    });

    expect(listRepliesPageByThread).toHaveBeenNthCalledWith(2, {
      threadId: "thread:first-offer",
      limit: 3,
      cursor: 2,
    });
  });

  it("passes raw thread route param into repository route lookup semantics", async () => {
    const findThreadByRouteId = vi
      .fn<ReadingRepository["findThreadByRouteId"]>()
      .mockResolvedValue({
        id: "thread:first-offer",
        boardId: "board:job",
        authorUserId: "user:robot-1",
        sourceBoardSlug: "job",
        sourceThreadId: "source-thread-1",
        title: "First offer from the mirror",
        body: "A new listing has been mirrored and is ready to read.",
        publishedAt: "2026-05-01T08:00:00.000Z",
        replyCount: 2,
        lastReplyAt: "2026-05-01T08:10:00.000Z",
      });

    const service = createPublicReadingService({
      repository: createRepository({
        findThreadByRouteId,
        findBoardById: vi.fn<ReadingRepository["findBoardById"]>().mockResolvedValue({
          id: "board:job",
          slug: "job",
          name: "Jobs and Offers",
          description: "Signals for roles, openings, and practical next steps.",
        }),
        findUserById: vi.fn<ReadingRepository["findUserById"]>().mockResolvedValue({
          id: "user:robot-1",
          username: "robot-1",
          displayName: "Robot 1",
          userType: "bot",
          status: "active",
        }),
      }),
    });

    await service.getThread("first-offer");

    expect(findThreadByRouteId).toHaveBeenCalledWith("first-offer");
  });

  it("matches thread route ids against thread.id semantics", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const repository = createReadingRepository({
      board: {} as never,
      reply: {} as never,
      thread: {
        findUnique: vi.fn(),
        findFirst,
        findMany: vi.fn(),
      } as never,
      user: {} as never,
    });

    await repository.findThreadByRouteId("first-offer");

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ id: "first-offer" }, { id: "thread:first-offer" }],
        },
      }),
    );
  });

  it("rejects reply cursors that are not strictly numeric", async () => {
    const service = createPublicReadingService({
      repository: createRepository({
        findThreadByRouteId: vi.fn<ReadingRepository["findThreadByRouteId"]>().mockResolvedValue({
          id: "thread:first-offer",
          boardId: "board:job",
          authorUserId: "user:robot-1",
          sourceBoardSlug: "job",
          sourceThreadId: "source-thread-1",
          title: "First offer from the mirror",
          body: "A new listing has been mirrored and is ready to read.",
          publishedAt: "2026-05-01T08:00:00.000Z",
          replyCount: 2,
          lastReplyAt: "2026-05-01T08:10:00.000Z",
        }),
      }),
    });

    await expect(
      service.getThreadRepliesFeed({
        threadId: "first-offer",
        cursor: "2abc",
      }),
    ).rejects.toThrow("Invalid reply cursor");
  });

  it("rejects invalid board cursors with a stable error", () => {
    const invalidCases = [
      "%%%not-base64%%%",
      Buffer.from("{", "utf8").toString("base64url"),
      Buffer.from("null", "utf8").toString("base64url"),
      Buffer.from(JSON.stringify({ lastReplyAt: null }), "utf8").toString("base64url"),
      Buffer.from(JSON.stringify({ id: 123, lastReplyAt: null }), "utf8").toString("base64url"),
      Buffer.from(
        JSON.stringify({ id: "thread:1", lastReplyAt: "not-a-date" }),
        "utf8",
      ).toString("base64url"),
    ];

    for (const cursor of invalidCases) {
      expect(() => decodeBoardFeedCursor(cursor)).toThrow("Invalid board cursor");
    }
  });

  it("rejects an explicitly empty board cursor", async () => {
    const service = createPublicReadingService({
      repository: createRepository({
        findBoardById: vi.fn<ReadingRepository["findBoardById"]>().mockResolvedValue(null),
        findBoardBySlug: vi.fn<ReadingRepository["findBoardBySlug"]>().mockResolvedValue({
          id: "board:job",
          slug: "job",
          name: "Jobs and Offers",
          description: "Signals for roles, openings, and practical next steps.",
        }),
      }),
    });

    await expect(
      service.getBoardThreadsFeed({
        boardIdOrSlug: "job",
        cursor: "",
      }),
    ).rejects.toThrow("Invalid board cursor");
  });
});
