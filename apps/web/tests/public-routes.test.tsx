import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FeedResult } from "@/src/server/forum/feedService";

// ---- Hoisted mocks for the new shadcn-driven pages ----
// The new pages use distinct services per concern (feed / thread detail /
// reading service for board metadata). Each test mocks just what it needs.

const feedMock = vi.hoisted(() => ({
  listFeed: vi.fn(),
}));

const threadDetailMock = vi.hoisted(() => ({
  getThreadDetail: vi.fn(),
  getThreadReplies: vi.fn(),
}));

const publicReadingMock = vi.hoisted(() => ({
  getBoard: vi.fn(),
  listBoards: vi.fn(),
}));

const pageGuardMock = vi.hoisted(() => ({
  requireWebPageUser: vi.fn(),
}));

const webSessionMock = vi.hoisted(() => ({
  getWebSessionIdentity: vi.fn(),
}));

const prismaMock = vi.hoisted(() => ({
  user: { count: vi.fn() },
  thread: { count: vi.fn() },
  humanProfile: { findUnique: vi.fn() },
  board: { findMany: vi.fn() },
}));

vi.mock("@/src/server/forum/feedService", () => feedMock);
vi.mock("@/src/server/forum/threadDetailService", () => threadDetailMock);
vi.mock("@/src/server/reading/publicReadingService", () => ({
  createPublicReadingService: () => publicReadingMock,
}));
vi.mock("@/src/server/auth/pageGuards", () => ({
  requireWebPageUser: pageGuardMock.requireWebPageUser,
}));
vi.mock("@/src/server/auth/webSession", () => ({
  getWebSessionIdentity: webSessionMock.getWebSessionIdentity,
}));
vi.mock("@/src/server/db/client", () => ({ prisma: prismaMock }));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
    onClick,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
    onClick?: unknown;
  }) => {
    if (typeof onClick === "function") {
      throw new Error("Server-rendered links must not receive event handlers");
    }

    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  },
}));

vi.mock("@kinde-oss/kinde-auth-nextjs/server", () => ({
  LoginLink: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  LogoutLink: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
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
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import BoardPage from "../app/boards/[boardId]/page";
import HomePage from "../app/page";
import ThreadPage from "../app/threads/[threadId]/page";

beforeEach(() => {
  window.matchMedia = () => ({
    matches: false,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  });
});

function makeFeedResult(overrides: Partial<FeedResult> = {}): FeedResult {
  return { ...emptyFeed(), ...overrides };
}

function emptyFeed(): FeedResult {
  return {
    items: [],
    page: 1,
    perPage: 15,
    totalCount: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  };
}

describe("home page (shadcn shell)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.user.count.mockResolvedValue(4);
    prismaMock.thread.count.mockResolvedValue(20);
    feedMock.listFeed.mockResolvedValue(emptyFeed());
  });

  afterEach(() => cleanup());

  it("renders the bot feed by default", async () => {
    feedMock.listFeed.mockResolvedValue(
      makeFeedResult({
        totalCount: 1,
        items: [
          {
            id: "thread:bot-1",
            title: "[镜像] 北邮人首页热门：宿舍空调改造",
            body: "正文内容",
            excerpt: "正文内容",
            authorId: "bot-id",
            authorName: "镜花",
            authorIsBot: true,
            publishedAt: "2026-05-01T00:00:00.000Z",
            lastReplyAt: "2026-05-01T05:00:00.000Z",
            lastReplyAuthorName: "夜半敲代码",
            replyCount: 12,
            boardId: "board:campus",
            boardSlug: "iwhisper",
            boardName: "校园生活",
            sourceBoardSlug: "IWhisper",
            sourceThreadId: "8830220",
          },
        ],
      }),
    );

    render(await HomePage({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByText("[镜像] 北邮人首页热门：宿舍空调改造"),
    ).toBeTruthy();
    expect(feedMock.listFeed).toHaveBeenCalledWith({
      kind: "bot",
      sortBy: "lastReply",
      page: 1,
      perPage: 15,
    });
  });

  it("switches to the real feed when the query param requests it", async () => {
    feedMock.listFeed.mockResolvedValue(emptyFeed());

    await HomePage({ searchParams: Promise.resolve({ feed: "real" }) });

    expect(feedMock.listFeed).toHaveBeenCalledWith({
      kind: "real",
      sortBy: "lastReply",
      page: 1,
      perPage: 15,
    });
  });
});

describe("board page", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    feedMock.listFeed.mockResolvedValue(emptyFeed());
  });

  afterEach(() => cleanup());

  it("renders board hero and threads from the feed service", async () => {
    publicReadingMock.getBoard.mockResolvedValue({
      id: "board:job",
      slug: "job",
      name: "Jobs and Offers",
      description: "Signals for roles, openings, and practical next steps.",
    });
    feedMock.listFeed.mockResolvedValue(
      makeFeedResult({
        totalCount: 1,
        items: [
          {
            id: "thread:1",
            title: "Newest active thread",
            body: "正文",
            excerpt: "正文",
            authorId: "user-1",
            authorName: "Alice",
            authorIsBot: false,
            publishedAt: "2026-05-01T00:00:00.000Z",
            lastReplyAt: "2026-05-01T09:05:00.000Z",
            lastReplyAuthorName: null,
            replyCount: 5,
            boardId: "board:job",
            boardSlug: "job",
            boardName: "Jobs and Offers",
            sourceBoardSlug: "JobInfo",
            sourceThreadId: "100",
          },
        ],
      }),
    );

    render(
      await BoardPage({
        params: Promise.resolve({ boardId: "job" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByRole("heading", { name: "Jobs and Offers" })).toBeTruthy();
    expect(screen.getByText("Newest active thread")).toBeTruthy();
    expect(feedMock.listFeed).toHaveBeenCalledWith({
      kind: "all",
      boardId: "board:job",
      sortBy: "lastReply",
      page: 1,
      perPage: 15,
    });
  });

  it("calls notFound for an unknown board", async () => {
    nextNavigation.notFound.mockClear();
    publicReadingMock.getBoard.mockResolvedValue(null);

    await expect(
      BoardPage({
        params: Promise.resolve({ boardId: "missing" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow(nextNavigation.error);

    expect(nextNavigation.notFound).toHaveBeenCalledTimes(1);
  });
});

describe("thread page", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    webSessionMock.getWebSessionIdentity.mockResolvedValue({
      provider: "kinde",
      subject: "kp_test",
      orgCodes: [],
    });
    prismaMock.humanProfile.findUnique.mockResolvedValue({ userId: "viewer-1" });
  });

  afterEach(() => cleanup());

  it("renders the main post body and a reply", async () => {
    threadDetailMock.getThreadDetail.mockResolvedValue({
      thread: {
        id: "thread:first-offer",
        title: "First offer from the mirror",
        body: "A new listing has been mirrored and is ready to read.",
        publishedAt: "2026-05-01T08:00:00.000Z",
        lastReplyAt: "2026-05-01T08:10:00.000Z",
        replyCount: 1,
        sourceBoardSlug: "JobInfo",
        sourceThreadId: "1124871",
        mirrored: true,
        sourceStale: false,
        authorId: "bot-1",
        authorName: "镜花",
        authorIsBot: true,
      },
      board: { id: "board:job", slug: "job", name: "Jobs and Offers" },
      threadSubscriptionId: null,
    });
    threadDetailMock.getThreadReplies.mockResolvedValue({
      items: [
        {
          id: "reply:1",
          floor: 2,
          body: "Reply 1",
          publishedAt: "2026-05-01T08:10:00.000Z",
          authorName: "Alice",
          authorId: "user-1",
          authorIsBot: false,
          subscriptionId: null,
        },
      ],
      page: 1,
      perPage: 20,
      totalCount: 1,
      totalPages: 1,
    });

    render(
      await ThreadPage({
        params: Promise.resolve({ threadId: "first-offer" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(
      screen.getByText("A new listing has been mirrored and is ready to read."),
    ).toBeTruthy();
    expect(screen.getByText("Reply 1")).toBeTruthy();
    expect(pageGuardMock.requireWebPageUser).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /订阅该帖/ })).toBeTruthy();
  });

  it("renders for anonymous readers without subscription state", async () => {
    webSessionMock.getWebSessionIdentity.mockResolvedValue(null);
    prismaMock.humanProfile.findUnique.mockClear();
    threadDetailMock.getThreadDetail.mockResolvedValue({
      thread: {
        id: "thread:first-offer",
        title: "First offer from the mirror",
        body: "A public mirrored thread is readable before login.",
        publishedAt: "2026-05-01T08:00:00.000Z",
        lastReplyAt: null,
        replyCount: 0,
        sourceBoardSlug: "JobInfo",
        sourceThreadId: "1124871",
        mirrored: true,
        sourceStale: false,
        authorId: "bot-1",
        authorName: "镜花",
        authorIsBot: true,
      },
      board: { id: "board:job", slug: "job", name: "Jobs and Offers" },
      threadSubscriptionId: null,
    });
    threadDetailMock.getThreadReplies.mockResolvedValue({
      items: [],
      page: 1,
      perPage: 20,
      totalCount: 0,
      totalPages: 1,
    });

    render(
      await ThreadPage({
        params: Promise.resolve({ threadId: "first-offer" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(
      screen.getByText("A public mirrored thread is readable before login."),
    ).toBeTruthy();
    expect(prismaMock.humanProfile.findUnique).not.toHaveBeenCalled();
    expect(threadDetailMock.getThreadDetail).toHaveBeenCalledWith({
      threadId: "first-offer",
      viewerHumanUserId: null,
    });
  });

  it("calls notFound for an unknown thread", async () => {
    nextNavigation.notFound.mockClear();
    threadDetailMock.getThreadDetail.mockResolvedValue(null);
    threadDetailMock.getThreadReplies.mockResolvedValue(null);

    await expect(
      ThreadPage({
        params: Promise.resolve({ threadId: "missing" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow(nextNavigation.error);

    expect(nextNavigation.notFound).toHaveBeenCalledTimes(1);
  });

  it("supports prisma uuid route params", async () => {
    threadDetailMock.getThreadDetail.mockResolvedValue({
      thread: {
        id: "fd45468e-de16-48f2-82cd-8500aec9c7cd",
        title: "Mirrored UUID thread",
        body: "This thread is stored with a Prisma UUID id.",
        publishedAt: "2026-05-01T08:00:00.000Z",
        lastReplyAt: null,
        replyCount: 0,
        sourceBoardSlug: "IWhisper",
        sourceThreadId: "9000000",
        mirrored: true,
        sourceStale: false,
        authorId: "bot-1",
        authorName: "镜花",
        authorIsBot: true,
      },
      board: { id: "board:iwhisper", slug: "iwhisper", name: "IWhisper" },
      threadSubscriptionId: null,
    });
    threadDetailMock.getThreadReplies.mockResolvedValue({
      items: [],
      page: 1,
      perPage: 20,
      totalCount: 0,
      totalPages: 1,
    });

    const ui = await ThreadPage({
      params: Promise.resolve({
        threadId: "fd45468e-de16-48f2-82cd-8500aec9c7cd",
      }),
      searchParams: Promise.resolve({}),
    });
    const { container } = render(ui);

    expect(
      within(container).getByText("This thread is stored with a Prisma UUID id."),
    ).toBeTruthy();
    expect(threadDetailMock.getThreadDetail).toHaveBeenCalledWith({
      threadId: "fd45468e-de16-48f2-82cd-8500aec9c7cd",
      viewerHumanUserId: "viewer-1",
    });
  });
});
