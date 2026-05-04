import { act, renderHook, waitFor } from "@testing-library/react-native";
import { beforeEach } from "@jest/globals";

import {
  fetchBoard,
  fetchBoardThreadsFeed,
  fetchThread,
  fetchThreadRepliesFeed,
} from "@/features/reading/client";
import { useBoardThreadsFeed } from "@/features/reading/useBoardThreadsFeed";
import { useThreadRepliesFeed } from "@/features/reading/useThreadRepliesFeed";

jest.mock("@/features/reading/client", () => ({
  fetchBoard: jest.fn(),
  fetchBoardThreadsFeed: jest.fn(),
  fetchThread: jest.fn(),
  fetchThreadRepliesFeed: jest.fn(),
}));

const fetchBoardMock = jest.mocked(fetchBoard);
const fetchBoardThreadsFeedMock = jest.mocked(fetchBoardThreadsFeed);
const fetchThreadMock = jest.mocked(fetchThread);
const fetchThreadRepliesFeedMock = jest.mocked(fetchThreadRepliesFeed);

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe("useBoardThreadsFeed", () => {
  it("fetches board detail and first batch on initial load", async () => {
    fetchBoardMock.mockResolvedValue({
      id: "board:job",
      slug: "job",
      name: "求职广场",
      description: "最新镜像帖子",
    });
    fetchBoardThreadsFeedMock.mockResolvedValue({
      items: [
        {
          id: "thread:first",
          title: "第一帖",
          authorName: "Alice",
          publishedAt: "2026-05-04T00:00:00.000Z",
          replyCount: 2,
          lastReplyAt: "2026-05-04T01:00:00.000Z",
        },
      ],
      page: {
        limit: 20,
        nextCursor: "cursor-2",
        hasMore: true,
      },
    });

    const { result } = renderHook(() => useBoardThreadsFeed("job"));

    expect(result.current.initialStatus).toBe("loading");

    await waitFor(() => {
      expect(result.current.initialStatus).toBe("success");
    });

    expect(fetchBoardMock).toHaveBeenCalledWith("job");
    expect(fetchBoardThreadsFeedMock).toHaveBeenCalledWith("job");
    expect(result.current.board?.name).toBe("求职广场");
    expect(result.current.items).toHaveLength(1);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.initialError).toBeNull();
    expect(result.current.loadMoreError).toBeNull();
  });

  it("appends next batch when loadMore succeeds", async () => {
    fetchBoardMock.mockResolvedValue({
      id: "board:job",
      slug: "job",
      name: "求职广场",
      description: "最新镜像帖子",
    });
    fetchBoardThreadsFeedMock
      .mockResolvedValueOnce({
        items: [
          {
            id: "thread:first",
            title: "第一帖",
            authorName: "Alice",
            publishedAt: "2026-05-04T00:00:00.000Z",
            replyCount: 2,
            lastReplyAt: "2026-05-04T01:00:00.000Z",
          },
        ],
        page: {
          limit: 20,
          nextCursor: "cursor-2",
          hasMore: true,
        },
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: "thread:second",
            title: "第二帖",
            authorName: "Bob",
            publishedAt: "2026-05-04T02:00:00.000Z",
            replyCount: 1,
            lastReplyAt: null,
          },
        ],
        page: {
          limit: 20,
          nextCursor: null,
          hasMore: false,
        },
      });

    const { result } = renderHook(() => useBoardThreadsFeed("job"));

    await waitFor(() => {
      expect(result.current.initialStatus).toBe("success");
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(fetchBoardThreadsFeedMock).toHaveBeenLastCalledWith("job", "cursor-2");
    expect(result.current.items.map((item) => item.id)).toEqual([
      "thread:first",
      "thread:second",
    ]);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.loadMoreError).toBeNull();
  });

  it("keeps existing items and exposes load-more error when next batch fails", async () => {
    fetchBoardMock.mockResolvedValue({
      id: "board:job",
      slug: "job",
      name: "求职广场",
      description: "最新镜像帖子",
    });
    fetchBoardThreadsFeedMock
      .mockResolvedValueOnce({
        items: [
          {
            id: "thread:first",
            title: "第一帖",
            authorName: "Alice",
            publishedAt: "2026-05-04T00:00:00.000Z",
            replyCount: 2,
            lastReplyAt: "2026-05-04T01:00:00.000Z",
          },
        ],
        page: {
          limit: 20,
          nextCursor: "cursor-2",
          hasMore: true,
        },
      })
      .mockRejectedValueOnce(new Error("分页失败"));

    const { result } = renderHook(() => useBoardThreadsFeed("job"));

    await waitFor(() => {
      expect(result.current.initialStatus).toBe("success");
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.items.map((item) => item.id)).toEqual(["thread:first"]);
    expect(result.current.loadMoreError).toBe("分页失败");
    expect(result.current.hasMore).toBe(true);
    expect(result.current.isLoadingMore).toBe(false);
  });

  it("prevents duplicate in-flight board pagination requests before rerender", async () => {
    const nextPage = createDeferred<{
      items: Array<{
        id: string;
        title: string;
        authorName: string;
        publishedAt: string;
        replyCount: number;
        lastReplyAt: string | null;
      }>;
      page: {
        limit: number;
        nextCursor: string | null;
        hasMore: boolean;
      };
    }>();

    fetchBoardMock.mockResolvedValue({
      id: "board:job",
      slug: "job",
      name: "求职广场",
      description: "最新镜像帖子",
    });
    fetchBoardThreadsFeedMock
      .mockResolvedValueOnce({
        items: [
          {
            id: "thread:first",
            title: "第一帖",
            authorName: "Alice",
            publishedAt: "2026-05-04T00:00:00.000Z",
            replyCount: 2,
            lastReplyAt: "2026-05-04T01:00:00.000Z",
          },
        ],
        page: {
          limit: 20,
          nextCursor: "cursor-2",
          hasMore: true,
        },
      })
      .mockImplementationOnce(() => nextPage.promise);

    const { result } = renderHook(() => useBoardThreadsFeed("job"));

    await waitFor(() => {
      expect(result.current.initialStatus).toBe("success");
    });

    let firstLoadMore!: Promise<void>;
    let secondLoadMore!: Promise<void>;
    act(() => {
      firstLoadMore = result.current.loadMore();
      secondLoadMore = result.current.loadMore();
    });

    expect(fetchBoardThreadsFeedMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      nextPage.resolve({
        items: [
          {
            id: "thread:second",
            title: "第二帖",
            authorName: "Bob",
            publishedAt: "2026-05-04T02:00:00.000Z",
            replyCount: 1,
            lastReplyAt: null,
          },
        ],
        page: {
          limit: 20,
          nextCursor: null,
          hasMore: false,
        },
      });
      await Promise.all([firstLoadMore, secondLoadMore]);
    });

    expect(result.current.items.map((item) => item.id)).toEqual([
      "thread:first",
      "thread:second",
    ]);
  });

  it("ignores stale board pagination responses after boardId changes", async () => {
    const staleNextPage = createDeferred<{
      items: Array<{
        id: string;
        title: string;
        authorName: string;
        publishedAt: string;
        replyCount: number;
        lastReplyAt: string | null;
      }>;
      page: {
        limit: number;
        nextCursor: string | null;
        hasMore: boolean;
      };
    }>();

    fetchBoardMock
      .mockResolvedValueOnce({
        id: "board:job",
        slug: "job",
        name: "求职广场",
        description: "最新镜像帖子",
      })
      .mockResolvedValueOnce({
        id: "board:hot",
        slug: "hot",
        name: "热点阅读",
        description: "新的版面",
      });
    fetchBoardThreadsFeedMock
      .mockResolvedValueOnce({
        items: [
          {
            id: "thread:first",
            title: "第一帖",
            authorName: "Alice",
            publishedAt: "2026-05-04T00:00:00.000Z",
            replyCount: 2,
            lastReplyAt: "2026-05-04T01:00:00.000Z",
          },
        ],
        page: {
          limit: 20,
          nextCursor: "cursor-2",
          hasMore: true,
        },
      })
      .mockImplementationOnce(() => staleNextPage.promise)
      .mockResolvedValueOnce({
        items: [
          {
            id: "thread:hot",
            title: "新帖",
            authorName: "Carol",
            publishedAt: "2026-05-04T03:00:00.000Z",
            replyCount: 0,
            lastReplyAt: null,
          },
        ],
        page: {
          limit: 20,
          nextCursor: null,
          hasMore: false,
        },
      });

    const { result, rerender } = renderHook(
      ({ boardId }: { boardId: string }) => useBoardThreadsFeed(boardId),
      { initialProps: { boardId: "job" } },
    );

    await waitFor(() => {
      expect(result.current.initialStatus).toBe("success");
    });

    let staleLoadMore!: Promise<void>;
    act(() => {
      staleLoadMore = result.current.loadMore();
    });

    rerender({ boardId: "hot" });

    await waitFor(() => {
      expect(result.current.board?.slug).toBe("hot");
    });

    await act(async () => {
      staleNextPage.resolve({
        items: [
          {
            id: "thread:stale",
            title: "旧分页结果",
            authorName: "Bob",
            publishedAt: "2026-05-04T02:00:00.000Z",
            replyCount: 1,
            lastReplyAt: null,
          },
        ],
        page: {
          limit: 20,
          nextCursor: null,
          hasMore: false,
        },
      });
      await staleLoadMore;
    });

    expect(result.current.items.map((item) => item.id)).toEqual(["thread:hot"]);
  });

  it("exposes notFound and initial error states", async () => {
    fetchBoardMock.mockRejectedValueOnce(
      Object.assign(new Error("Not Found"), { status: 404 }),
    );

    const notFoundResult = renderHook(() => useBoardThreadsFeed("missing"));

    await waitFor(() => {
      expect(notFoundResult.result.current.initialStatus).toBe("notFound");
    });

    expect(notFoundResult.result.current.board).toBeNull();
    expect(notFoundResult.result.current.items).toEqual([]);

    fetchBoardMock.mockRejectedValueOnce(new Error("网络异常"));
    fetchBoardThreadsFeedMock.mockResolvedValueOnce({
      items: [],
      page: {
        limit: 20,
        nextCursor: null,
        hasMore: false,
      },
    });

    const errorResult = renderHook(() => useBoardThreadsFeed("job"));

    await waitFor(() => {
      expect(errorResult.result.current.initialStatus).toBe("error");
    });

    expect(errorResult.result.current.initialError).toBe("网络异常");
    expect(errorResult.result.current.items).toEqual([]);
  });
});

describe("useThreadRepliesFeed", () => {
  it("fetches thread detail and first replies batch on initial load", async () => {
    fetchThreadMock.mockResolvedValue({
      board: {
        id: "board:job",
        slug: "job",
        name: "求职广场",
      },
      thread: {
        id: "thread:first",
        title: "第一帖",
        body: "正文内容",
        authorName: "Alice",
        publishedAt: "2026-05-04T00:00:00.000Z",
        replyCount: 2,
      },
    });
    fetchThreadRepliesFeedMock.mockResolvedValue({
      items: [
        {
          id: "reply:first",
          body: "第一条回复",
          authorName: "Bob",
          publishedAt: "2026-05-04T01:00:00.000Z",
          replyIndex: 1,
        },
      ],
      page: {
        limit: 20,
        nextCursor: "cursor-2",
        hasMore: true,
      },
    });

    const { result } = renderHook(() => useThreadRepliesFeed("first"));

    await waitFor(() => {
      expect(result.current.initialStatus).toBe("success");
    });

    expect(fetchThreadMock).toHaveBeenCalledWith("first");
    expect(fetchThreadRepliesFeedMock).toHaveBeenCalledWith("first");
    expect(result.current.thread?.title).toBe("第一帖");
    expect(result.current.items).toHaveLength(1);
    expect(result.current.hasMore).toBe(true);
  });

  it("appends next reply batch when loadMore succeeds", async () => {
    fetchThreadMock.mockResolvedValue({
      board: {
        id: "board:job",
        slug: "job",
        name: "求职广场",
      },
      thread: {
        id: "thread:first",
        title: "第一帖",
        body: "正文内容",
        authorName: "Alice",
        publishedAt: "2026-05-04T00:00:00.000Z",
        replyCount: 2,
      },
    });
    fetchThreadRepliesFeedMock
      .mockResolvedValueOnce({
        items: [
          {
            id: "reply:first",
            body: "第一条回复",
            authorName: "Bob",
            publishedAt: "2026-05-04T01:00:00.000Z",
            replyIndex: 1,
          },
        ],
        page: {
          limit: 20,
          nextCursor: "cursor-2",
          hasMore: true,
        },
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: "reply:second",
            body: "第二条回复",
            authorName: "Carol",
            publishedAt: "2026-05-04T02:00:00.000Z",
            replyIndex: 2,
          },
        ],
        page: {
          limit: 20,
          nextCursor: null,
          hasMore: false,
        },
      });

    const { result } = renderHook(() => useThreadRepliesFeed("first"));

    await waitFor(() => {
      expect(result.current.initialStatus).toBe("success");
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(fetchThreadRepliesFeedMock).toHaveBeenLastCalledWith("first", "cursor-2");
    expect(result.current.items.map((item) => item.id)).toEqual([
      "reply:first",
      "reply:second",
    ]);
    expect(result.current.hasMore).toBe(false);
  });

  it("keeps existing replies when loadMore fails", async () => {
    fetchThreadMock.mockResolvedValue({
      board: {
        id: "board:job",
        slug: "job",
        name: "求职广场",
      },
      thread: {
        id: "thread:first",
        title: "第一帖",
        body: "正文内容",
        authorName: "Alice",
        publishedAt: "2026-05-04T00:00:00.000Z",
        replyCount: 2,
      },
    });
    fetchThreadRepliesFeedMock
      .mockResolvedValueOnce({
        items: [
          {
            id: "reply:first",
            body: "第一条回复",
            authorName: "Bob",
            publishedAt: "2026-05-04T01:00:00.000Z",
            replyIndex: 1,
          },
        ],
        page: {
          limit: 20,
          nextCursor: "cursor-2",
          hasMore: true,
        },
      })
      .mockRejectedValueOnce(new Error("回复分页失败"));

    const { result } = renderHook(() => useThreadRepliesFeed("first"));

    await waitFor(() => {
      expect(result.current.initialStatus).toBe("success");
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.items.map((item) => item.id)).toEqual(["reply:first"]);
    expect(result.current.loadMoreError).toBe("回复分页失败");
    expect(result.current.hasMore).toBe(true);
    expect(result.current.isLoadingMore).toBe(false);
  });

  it("prevents duplicate in-flight reply pagination requests before rerender", async () => {
    const nextPage = createDeferred<{
      items: Array<{
        id: string;
        body: string;
        authorName: string;
        publishedAt: string;
        replyIndex: number;
      }>;
      page: {
        limit: number;
        nextCursor: string | null;
        hasMore: boolean;
      };
    }>();

    fetchThreadMock.mockResolvedValue({
      board: {
        id: "board:job",
        slug: "job",
        name: "求职广场",
      },
      thread: {
        id: "thread:first",
        title: "第一帖",
        body: "正文内容",
        authorName: "Alice",
        publishedAt: "2026-05-04T00:00:00.000Z",
        replyCount: 2,
      },
    });
    fetchThreadRepliesFeedMock
      .mockResolvedValueOnce({
        items: [
          {
            id: "reply:first",
            body: "第一条回复",
            authorName: "Bob",
            publishedAt: "2026-05-04T01:00:00.000Z",
            replyIndex: 1,
          },
        ],
        page: {
          limit: 20,
          nextCursor: "cursor-2",
          hasMore: true,
        },
      })
      .mockImplementationOnce(() => nextPage.promise);

    const { result } = renderHook(() => useThreadRepliesFeed("first"));

    await waitFor(() => {
      expect(result.current.initialStatus).toBe("success");
    });

    let firstLoadMore!: Promise<void>;
    let secondLoadMore!: Promise<void>;
    act(() => {
      firstLoadMore = result.current.loadMore();
      secondLoadMore = result.current.loadMore();
    });

    expect(fetchThreadRepliesFeedMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      nextPage.resolve({
        items: [
          {
            id: "reply:second",
            body: "第二条回复",
            authorName: "Carol",
            publishedAt: "2026-05-04T02:00:00.000Z",
            replyIndex: 2,
          },
        ],
        page: {
          limit: 20,
          nextCursor: null,
          hasMore: false,
        },
      });
      await Promise.all([firstLoadMore, secondLoadMore]);
    });

    expect(result.current.items.map((item) => item.id)).toEqual([
      "reply:first",
      "reply:second",
    ]);
  });

  it("ignores stale reply pagination responses after threadId changes", async () => {
    const staleNextPage = createDeferred<{
      items: Array<{
        id: string;
        body: string;
        authorName: string;
        publishedAt: string;
        replyIndex: number;
      }>;
      page: {
        limit: number;
        nextCursor: string | null;
        hasMore: boolean;
      };
    }>();

    fetchThreadMock
      .mockResolvedValueOnce({
        board: {
          id: "board:job",
          slug: "job",
          name: "求职广场",
        },
        thread: {
          id: "thread:first",
          title: "第一帖",
          body: "正文内容",
          authorName: "Alice",
          publishedAt: "2026-05-04T00:00:00.000Z",
          replyCount: 2,
        },
      })
      .mockResolvedValueOnce({
        board: {
          id: "board:hot",
          slug: "hot",
          name: "热点阅读",
        },
        thread: {
          id: "thread:second",
          title: "第二帖",
          body: "新的正文",
          authorName: "Carol",
          publishedAt: "2026-05-04T03:00:00.000Z",
          replyCount: 1,
        },
      });
    fetchThreadRepliesFeedMock
      .mockResolvedValueOnce({
        items: [
          {
            id: "reply:first",
            body: "第一条回复",
            authorName: "Bob",
            publishedAt: "2026-05-04T01:00:00.000Z",
            replyIndex: 1,
          },
        ],
        page: {
          limit: 20,
          nextCursor: "cursor-2",
          hasMore: true,
        },
      })
      .mockImplementationOnce(() => staleNextPage.promise)
      .mockResolvedValueOnce({
        items: [
          {
            id: "reply:new",
            body: "新的回复",
            authorName: "Dave",
            publishedAt: "2026-05-04T04:00:00.000Z",
            replyIndex: 1,
          },
        ],
        page: {
          limit: 20,
          nextCursor: null,
          hasMore: false,
        },
      });

    const { result, rerender } = renderHook(
      ({ threadId }: { threadId: string }) => useThreadRepliesFeed(threadId),
      { initialProps: { threadId: "first" } },
    );

    await waitFor(() => {
      expect(result.current.initialStatus).toBe("success");
    });

    let staleLoadMore!: Promise<void>;
    act(() => {
      staleLoadMore = result.current.loadMore();
    });

    rerender({ threadId: "second" });

    await waitFor(() => {
      expect(result.current.thread?.id).toBe("thread:second");
    });

    await act(async () => {
      staleNextPage.resolve({
        items: [
          {
            id: "reply:stale",
            body: "旧回复",
            authorName: "Eve",
            publishedAt: "2026-05-04T02:00:00.000Z",
            replyIndex: 2,
          },
        ],
        page: {
          limit: 20,
          nextCursor: null,
          hasMore: false,
        },
      });
      await staleLoadMore;
    });

    expect(result.current.items.map((item) => item.id)).toEqual(["reply:new"]);
  });
});
