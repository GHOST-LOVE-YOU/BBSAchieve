import { render, screen, within } from "@testing-library/react";
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

const listBoardThreadsMock = vi.hoisted(() => ({
  listBoardThreads: vi.fn(),
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

vi.mock("@/src/server/reading/listBoardThreads", () => ({
  listBoardThreads: listBoardThreadsMock.listBoardThreads,
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
    listBoardThreadsMock.listBoardThreads.mockResolvedValue({
      threads: [
        {
          id: "thread:newest",
          boardSlug: "job",
          title: "Newest active thread",
          lastReplyAt: "2026-05-01T09:05:00.000Z",
        },
        {
          id: "thread:older",
          boardSlug: "job",
          title: "Older active thread",
          lastReplyAt: "2026-05-01T08:10:00.000Z",
        },
      ],
      page: 1,
      totalPages: 3,
      totalCount: 42,
      hasPreviousPage: false,
      hasNextPage: true,
    });

    const ui = await BoardPage({
      params: Promise.resolve({ boardId: "job" }),
      searchParams: Promise.resolve({}),
    });
    const { container } = render(ui);
    const threadLinks = within(container)
      .getAllByRole("link")
      .map((node) => node.textContent)
      .filter((text) => text !== "下一页" && text !== "上一页");
    expect(threadLinks).toEqual(["Newest active thread", "Older active thread"]);
    expect(listBoardThreadsMock.listBoardThreads).toHaveBeenCalledWith({
      boardId: "board:job",
      boardSlug: "job",
      limit: 20,
      page: 1,
    });
    expect(screen.getByText("第 1 页，共 3 页 · 42 个帖子")).toBeTruthy();
  });

  it("renders page navigation links and forwards the page param", async () => {
    readingMock.findBoardById.mockResolvedValue(null);
    readingMock.findBoardBySlug.mockResolvedValue({
      id: "board:iwhisper",
      slug: "iwhisper",
      name: "IWhisper",
      description: "Mirrored BYR content.",
    });
    listBoardThreadsMock.listBoardThreads.mockResolvedValue({
      threads: [
        {
          id: "thread:page-2",
          boardSlug: "iwhisper",
          title: "Older page thread",
          lastReplyAt: "2026-05-01T07:10:00.000Z",
        },
      ],
      page: 2,
      totalPages: 8,
      totalCount: 155,
      hasPreviousPage: true,
      hasNextPage: true,
    });

    const ui = await BoardPage({
      params: Promise.resolve({ boardId: "iwhisper" }),
      searchParams: Promise.resolve({ page: "2" }),
    });
    const { container } = render(ui);

    expect(listBoardThreadsMock.listBoardThreads).toHaveBeenCalledWith({
      boardId: "board:iwhisper",
      boardSlug: "iwhisper",
      limit: 20,
      page: 2,
    });
    expect(within(container).getByText("第 2 页，共 8 页 · 155 个帖子")).toBeTruthy();
    expect(within(container).getByRole("link", { name: "上一页" }).getAttribute("href")).toBe(
      "/boards/iwhisper",
    );
    expect(within(container).getByRole("link", { name: "下一页" }).getAttribute("href")).toBe(
      "/boards/iwhisper?page=3",
    );
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

  it("renders thread detail for prisma uuid route params", async () => {
    readingMock.findThreadById.mockImplementation(async (threadId: string) => {
      if (threadId !== "fd45468e-de16-48f2-82cd-8500aec9c7cd") {
        return null;
      }

      return {
        id: "fd45468e-de16-48f2-82cd-8500aec9c7cd",
        boardId: "board:iwhisper",
        authorUserId: "user:robot-1",
        sourceThreadId: "8830220",
        sourceBoardSlug: "iwhisper",
        title: "Mirrored UUID thread",
        body: "This thread is stored with a Prisma UUID id.",
        publishedAt: "2026-05-01T08:00:00.000Z",
        replyCount: 1,
        lastReplyAt: "2026-05-01T08:10:00.000Z",
      };
    });
    readingMock.findBoardById.mockResolvedValue({
      id: "board:iwhisper",
      slug: "iwhisper",
      name: "IWhisper",
      description: "Mirrored BYR content.",
    });
    readingMock.findUserById.mockResolvedValue({
      id: "user:robot-1",
      username: "robot-1",
      displayName: "Robot 1",
      userType: "bot",
      status: "active",
      mailboxKey: "mailbox-1",
    });
    readingMock.listRepliesByThread.mockResolvedValue([
      {
        id: "reply:uuid-thread-1",
        threadId: "fd45468e-de16-48f2-82cd-8500aec9c7cd",
        authorUserId: "user:robot-1",
        replyIndex: 1,
        body: "The UUID route works now.",
        publishedAt: "2026-05-01T08:10:00.000Z",
      },
    ]);

    const ui = await ThreadPage({
      params: Promise.resolve({ threadId: "fd45468e-de16-48f2-82cd-8500aec9c7cd" }),
    });
    render(ui);

    expect(screen.getByText("This thread is stored with a Prisma UUID id.")).toBeTruthy();
    expect(screen.getByText("The UUID route works now.")).toBeTruthy();
    expect(readingMock.findThreadById).toHaveBeenCalledWith(
      "fd45468e-de16-48f2-82cd-8500aec9c7cd",
    );
  });

  it("calls notFound for missing board or thread", async () => {
    nextNavigation.notFound.mockClear();
    readingMock.findBoardById.mockResolvedValue(null);
    readingMock.findBoardBySlug.mockResolvedValue(null);
    readingMock.findThreadById.mockResolvedValue(null);
    listBoardThreadsMock.listBoardThreads.mockReset();

    await expect(
      BoardPage({
        params: Promise.resolve({ boardId: "missing-board" }),
        searchParams: Promise.resolve({}),
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
