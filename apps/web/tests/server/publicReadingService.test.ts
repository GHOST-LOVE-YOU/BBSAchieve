import { describe, expect, it, vi } from "vitest";

import { createPublicReadingService } from "@/src/server/reading/publicReadingService";

describe("publicReadingService", () => {
  it("returns board summaries with threadCount and latestThreadTitle", async () => {
    const service = createPublicReadingService({
      repository: {
        listBoards: vi.fn().mockResolvedValue([
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
      } as any,
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
      repository: {
        findBoardById: vi.fn().mockResolvedValue(null),
        findBoardBySlug: vi.fn().mockResolvedValue({
          id: "board:job",
          slug: "job",
          name: "Jobs and Offers",
          description: "Signals for roles, openings, and practical next steps.",
        }),
      } as any,
    });

    await expect(service.getBoard("job")).resolves.toEqual({
      id: "board:job",
      slug: "job",
      name: "Jobs and Offers",
      description: "Signals for roles, openings, and practical next steps.",
    });
  });

  it("returns board thread feed with cursor pagination", async () => {
    const service = createPublicReadingService({
      repository: {
        findBoardById: vi.fn().mockResolvedValue(null),
        findBoardBySlug: vi.fn().mockResolvedValue({
          id: "board:job",
          slug: "job",
          name: "Jobs and Offers",
          description: "Signals for roles, openings, and practical next steps.",
        }),
        listThreadsPageByBoard: vi.fn().mockResolvedValue([
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
            lastReplyAt: "2026-05-01T09:00:00.000Z",
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
        ]),
        findUsersByIds: vi.fn().mockResolvedValue(
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
      } as any,
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
          lastReplyAt: "2026-05-01T09:00:00.000Z",
        },
      ],
      page: {
        limit: 2,
        nextCursor: expect.any(String),
        hasMore: true,
      },
    });
  });

  it("returns thread detail", async () => {
    const service = createPublicReadingService({
      repository: {
        findThreadByRouteId: vi.fn().mockResolvedValue({
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
        findBoardById: vi.fn().mockResolvedValue({
          id: "board:job",
          slug: "job",
          name: "Jobs and Offers",
          description: "Signals for roles, openings, and practical next steps.",
        }),
        findUserById: vi.fn().mockResolvedValue({
          id: "user:robot-1",
          username: "robot-1",
          displayName: "Robot 1",
          userType: "bot",
          status: "active",
        }),
      } as any,
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

  it("returns thread replies feed sorted by replyIndex asc", async () => {
    const service = createPublicReadingService({
      repository: {
        findThreadByRouteId: vi.fn().mockResolvedValue({
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
        findBoardById: vi.fn().mockResolvedValue({
          id: "board:job",
          slug: "job",
          name: "Jobs and Offers",
          description: "Signals for roles, openings, and practical next steps.",
        }),
        findUserById: vi.fn().mockResolvedValue({
          id: "user:robot-1",
          username: "robot-1",
          displayName: "Robot 1",
          userType: "bot",
          status: "active",
        }),
        listRepliesPageByThread: vi.fn().mockResolvedValue([
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
        ]),
        findUsersByIds: vi.fn().mockResolvedValue(
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
      } as any,
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
        nextCursor: expect.any(String),
        hasMore: true,
      },
    });
  });
});
