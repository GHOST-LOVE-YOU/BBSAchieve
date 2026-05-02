import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const readingMock = vi.hoisted(() => ({
  findBoardById: vi.fn(),
  findBoardBySlug: vi.fn(),
  listBoards: vi.fn(),
  findThreadById: vi.fn(),
  listThreadsByBoard: vi.fn(),
  findReplyById: vi.fn(),
  listRepliesByThread: vi.fn(),
  findUserById: vi.fn(),
  findUserByUsername: vi.fn(),
}));

vi.mock("@/src/server/reading/readingRepository", () => ({
  createReadingRepository: () => ({
    findBoardById: readingMock.findBoardById,
    findBoardBySlug: readingMock.findBoardBySlug,
    listBoards: readingMock.listBoards,
    findThreadById: readingMock.findThreadById,
    listThreadsByBoard: readingMock.listThreadsByBoard,
    findReplyById: readingMock.findReplyById,
    listRepliesByThread: readingMock.listRepliesByThread,
    findUserById: readingMock.findUserById,
    findUserByUsername: readingMock.findUserByUsername,
  }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  },
}));

const nextNavigation = vi.hoisted(() => {
  const error = Object.assign(new Error("NEXT_NOT_FOUND"), {
    digest: "NEXT_NOT_FOUND",
  });

  return {
    error,
    notFound: vi.fn(() => {
      throw error;
    }),
  };
});

vi.mock("next/navigation", () => ({
  notFound: nextNavigation.notFound,
}));

import BoardPage from "../app/boards/[boardId]/page";
import HomePage from "../app/page";
import ThreadPage from "../app/threads/[threadId]/page";

describe("web public routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders board entries on the home page", async () => {
    readingMock.listBoards.mockResolvedValue([
      {
        id: "board:job",
        slug: "job",
        name: "Jobs and Offers",
        description: "Signals for roles, openings, and practical next steps.",
      },
      {
        id: "board:hot",
        slug: "hot",
        name: "Hot Reading",
        description: "Fast-moving threads and the replies that follow them.",
      },
    ]);
    readingMock.listThreadsByBoard.mockImplementation(async (boardId: string) => {
      if (boardId === "board:job") {
        return [
          {
            id: "thread:first-offer",
            boardId: "board:job",
            authorUserId: "user:robot-1",
            sourceThreadId: "source-thread-1",
            sourceBoardSlug: "job",
            title: "First offer from the mirror",
            body: "A new listing has been mirrored and is ready to read.",
            publishedAt: "2026-05-01T08:00:00.000Z",
            replyCount: 2,
            lastReplyAt: "2026-05-01T08:10:00.000Z",
          },
        ];
      }

      return [
        {
          id: "thread:hot-follow-up",
          boardId: "board:hot",
          authorUserId: "user:robot-2",
          sourceThreadId: "source-thread-3",
          sourceBoardSlug: "hot",
          title: "Follow up on the hot thread",
          body: "This board surfaces the replies that matter most.",
          publishedAt: "2026-05-01T10:00:00.000Z",
          replyCount: 0,
          lastReplyAt: null,
        },
      ];
    });
    readingMock.findUserById.mockImplementation(async (userId: string) => {
      if (userId === "user:robot-1") {
        return {
          id: "user:robot-1",
          username: "robot-1",
          displayName: "Robot 1",
          userType: "bot",
          status: "active",
          mailboxKey: "mailbox-1",
        };
      }

      return {
        id: "user:robot-2",
        username: "robot-2",
        displayName: "Robot 2",
        userType: "bot",
        status: "active",
        mailboxKey: "mailbox-2",
      };
    });

    render(await HomePage());
    expect(screen.getByText("Jobs and Offers")).toBeTruthy();
    expect(screen.getByText("Hot Reading")).toBeTruthy();
  });

  it("renders board detail and thread summaries", async () => {
    readingMock.findBoardById.mockResolvedValue(null);
    readingMock.findBoardBySlug.mockResolvedValue({
      id: "board:job",
      slug: "job",
      name: "Jobs and Offers",
      description: "Signals for roles, openings, and practical next steps.",
    });
    readingMock.listThreadsByBoard.mockResolvedValue([
      {
        id: "thread:first-offer",
        boardId: "board:job",
        authorUserId: "user:robot-1",
        sourceThreadId: "source-thread-1",
        sourceBoardSlug: "job",
        title: "First offer from the mirror",
        body: "A new listing has been mirrored and is ready to read.",
        publishedAt: "2026-05-01T08:00:00.000Z",
        replyCount: 2,
        lastReplyAt: "2026-05-01T08:10:00.000Z",
      },
      {
        id: "thread:read-path",
        boardId: "board:job",
        authorUserId: "user:alice",
        sourceThreadId: "source-thread-2",
        sourceBoardSlug: "job",
        title: "Reading path for mirrored posts",
        body: "This thread keeps the reading chain easy to trace.",
        publishedAt: "2026-05-01T09:00:00.000Z",
        replyCount: 1,
        lastReplyAt: "2026-05-01T09:05:00.000Z",
      },
    ]);
    readingMock.findUserById.mockResolvedValue({
      id: "user:robot-1",
      username: "robot-1",
      displayName: "Robot 1",
      userType: "bot",
      status: "active",
      mailboxKey: "mailbox-1",
    });
    readingMock.listRepliesByThread.mockResolvedValue([]);

    const ui = await BoardPage({
      params: Promise.resolve({ boardId: "job" }),
    });
    render(ui);
    expect(screen.getByText("First offer from the mirror")).toBeTruthy();
    expect(screen.getByText("Reading path for mirrored posts")).toBeTruthy();
  });

  it("renders thread detail and replies", async () => {
    readingMock.findThreadById.mockResolvedValue({
      id: "thread:first-offer",
      boardId: "board:job",
      authorUserId: "user:robot-1",
      sourceThreadId: "source-thread-1",
      sourceBoardSlug: "job",
      title: "First offer from the mirror",
      body: "A new listing has been mirrored and is ready to read.",
      publishedAt: "2026-05-01T08:00:00.000Z",
      replyCount: 2,
      lastReplyAt: "2026-05-01T08:10:00.000Z",
    });
    readingMock.findBoardById.mockResolvedValue({
      id: "board:job",
      slug: "job",
      name: "Jobs and Offers",
      description: "Signals for roles, openings, and practical next steps.",
    });
    readingMock.findUserById.mockImplementation(async (userId: string) => {
      if (userId === "user:alice") {
        return {
          id: "user:alice",
          username: "alice",
          displayName: "Alice",
          userType: "human",
          status: "active",
        };
      }

      return {
        id: "user:robot-1",
        username: "robot-1",
        displayName: "Robot 1",
        userType: "bot",
        status: "active",
        mailboxKey: "mailbox-1",
      };
    });
    readingMock.listRepliesByThread.mockResolvedValue([
      {
        id: "reply:first-offer-1",
        threadId: "thread:first-offer",
        authorUserId: "user:alice",
        replyIndex: 1,
        body: "This is the kind of post I want to read first.",
        publishedAt: "2026-05-01T08:05:00.000Z",
      },
      {
        id: "reply:first-offer-2",
        threadId: "thread:first-offer",
        authorUserId: "user:robot-1",
        replyIndex: 2,
        body: "The mirror keeps the reading flow stable.",
        publishedAt: "2026-05-01T08:10:00.000Z",
      },
    ]);

    const ui = await ThreadPage({
      params: Promise.resolve({ threadId: "first-offer" }),
    });
    render(ui);
    expect(screen.getByText("A new listing has been mirrored and is ready to read.")).toBeTruthy();
    expect(screen.getByText("The mirror keeps the reading flow stable.")).toBeTruthy();
  });

  it("calls notFound for missing board or thread", async () => {
    nextNavigation.notFound.mockClear();
    readingMock.findBoardById.mockResolvedValue(null);
    readingMock.findBoardBySlug.mockResolvedValue(null);
    readingMock.findThreadById.mockResolvedValue(null);

    await expect(
      BoardPage({
        params: Promise.resolve({ boardId: "missing-board" }),
      }),
    ).rejects.toThrow(nextNavigation.error);

    await expect(
      ThreadPage({
        params: Promise.resolve({ threadId: "missing-thread" }),
      }),
    ).rejects.toThrow(nextNavigation.error);

    expect(nextNavigation.notFound).toHaveBeenCalledTimes(2);
  });
});
