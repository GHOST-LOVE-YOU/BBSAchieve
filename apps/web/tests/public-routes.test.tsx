import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const publicReadingMock = vi.hoisted(() => ({
  listBoards: vi.fn(),
  getBoard: vi.fn(),
  getBoardThreadsFeed: vi.fn(),
  getThread: vi.fn(),
  getThreadRepliesFeed: vi.fn(),
}));

vi.mock("@/src/server/reading/publicReadingService", () => ({
  createPublicReadingService: () => publicReadingMock,
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
    publicReadingMock.listBoards.mockResolvedValue({
      boards: [
        {
          id: "board:job",
          slug: "job",
          name: "Jobs and Offers",
          description: "Signals for roles, openings, and practical next steps.",
          threadCount: 1,
          latestThreadTitle: "First offer from the mirror",
        },
        {
          id: "board:hot",
          slug: "hot",
          name: "Hot Reading",
          description: "Fast-moving threads and the replies that follow them.",
          threadCount: 1,
          latestThreadTitle: "Follow up on the hot thread",
        },
      ],
    });

    render(await HomePage());

    expect(screen.getByText("Jobs and Offers")).toBeTruthy();
    expect(screen.getByText("Hot Reading")).toBeTruthy();
  });

  it("renders board detail and thread summaries from the public reading service", async () => {
    publicReadingMock.getBoard.mockResolvedValue({
      id: "board:job",
      slug: "job",
      name: "Jobs and Offers",
      description: "Signals for roles, openings, and practical next steps.",
    });
    publicReadingMock.getBoardThreadsFeed.mockResolvedValue({
      items: [
        {
          id: "thread:newest",
          title: "Newest active thread",
          authorName: "Robot 1",
          publishedAt: "2026-05-01T09:00:00.000Z",
          replyCount: 2,
          lastReplyAt: "2026-05-01T09:05:00.000Z",
        },
        {
          id: "thread:older",
          title: "Older active thread",
          authorName: "Robot 2",
          publishedAt: "2026-05-01T08:00:00.000Z",
          replyCount: 0,
          lastReplyAt: null,
        },
      ],
      page: {
        limit: 20,
        nextCursor: "cursor-2",
        hasMore: true,
      },
    });

    const ui = await BoardPage({
      params: Promise.resolve({ boardId: "job" }),
    });
    const { container } = render(ui);
    const threadLinks = within(container)
      .getAllByRole("link")
      .map((node) => node.textContent);

    expect(threadLinks).toEqual(["Newest active thread", "Older active thread"]);
    expect(publicReadingMock.getBoard).toHaveBeenCalledWith("job");
    expect(publicReadingMock.getBoardThreadsFeed).toHaveBeenCalledWith({
      boardIdOrSlug: "job",
      limit: 20,
    });
    expect(
      within(container).getByText("Signals for roles, openings, and practical next steps."),
    ).toBeTruthy();
    expect(screen.queryByText(/第 \d+ 页/)).toBeNull();
  });

  it("renders thread detail from the public reading service", async () => {
    publicReadingMock.getThread.mockResolvedValue({
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
    publicReadingMock.getThreadRepliesFeed.mockResolvedValue({
      items: [
        {
          id: "reply:1",
          body: "Reply 1",
          authorName: "Alice",
          publishedAt: "2026-05-01T08:05:00.000Z",
          replyIndex: 1,
        },
      ],
      page: {
        limit: 20,
        nextCursor: null,
        hasMore: false,
      },
    });

    render(
      await ThreadPage({
        params: Promise.resolve({ threadId: "first-offer" }),
      }),
    );

    expect(screen.getByText("First offer from the mirror")).toBeTruthy();
    expect(screen.getByText("Reply 1")).toBeTruthy();
  });

  it("renders thread detail for prisma uuid route params", async () => {
    publicReadingMock.getThread.mockResolvedValue({
      board: {
        id: "board:iwhisper",
        slug: "iwhisper",
        name: "IWhisper",
      },
      thread: {
        id: "fd45468e-de16-48f2-82cd-8500aec9c7cd",
        title: "Mirrored UUID thread",
        body: "This thread is stored with a Prisma UUID id.",
        authorName: "Robot 1",
        publishedAt: "2026-05-01T08:00:00.000Z",
        replyCount: 1,
      },
    });
    publicReadingMock.getThreadRepliesFeed.mockResolvedValue({
      items: [
        {
          id: "reply:uuid-thread-1",
          body: "The UUID route works now.",
          authorName: "Robot 1",
          publishedAt: "2026-05-01T08:10:00.000Z",
          replyIndex: 1,
        },
      ],
      page: {
        limit: 20,
        nextCursor: null,
        hasMore: false,
      },
    });

    const ui = await ThreadPage({
      params: Promise.resolve({ threadId: "fd45468e-de16-48f2-82cd-8500aec9c7cd" }),
    });
    render(ui);

    expect(screen.getByText("This thread is stored with a Prisma UUID id.")).toBeTruthy();
    expect(screen.getByText("The UUID route works now.")).toBeTruthy();
    expect(publicReadingMock.getThread).toHaveBeenCalledWith(
      "fd45468e-de16-48f2-82cd-8500aec9c7cd",
    );
  });

  it("calls notFound for missing board or thread", async () => {
    nextNavigation.notFound.mockClear();
    publicReadingMock.getBoard.mockResolvedValue(null);
    publicReadingMock.getThread.mockResolvedValue(null);

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

  it("calls notFound when the board thread feed is missing", async () => {
    nextNavigation.notFound.mockClear();
    publicReadingMock.getBoard.mockResolvedValue({
      id: "board:job",
      slug: "job",
      name: "Jobs and Offers",
      description: "Signals for roles, openings, and practical next steps.",
    });
    publicReadingMock.getBoardThreadsFeed.mockResolvedValue(null);

    await expect(
      BoardPage({
        params: Promise.resolve({ boardId: "job" }),
      }),
    ).rejects.toThrow(nextNavigation.error);

    expect(nextNavigation.notFound).toHaveBeenCalledTimes(1);
  });
});
