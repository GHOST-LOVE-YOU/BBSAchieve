import { useCallback, useEffect, useRef, useState } from "react";

import { fetchThread, fetchThreadRepliesFeed } from "./client";
import type { ReplyItem, ThreadDetail } from "./types";

type InitialStatus = "loading" | "success" | "notFound" | "error";

type ThreadRepliesFeedState = {
  thread: ThreadDetail["thread"] | null;
  board: ThreadDetail["board"] | null;
  items: ReplyItem[];
  initialStatus: InitialStatus;
  initialError: string | null;
  loadMoreError: string | null;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
};

function getErrorStatus(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 404
  ) {
    return "notFound" as const;
  }

  return "error" as const;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "未知错误";
}

export function useThreadRepliesFeed(threadId?: string | null): ThreadRepliesFeedState {
  const [thread, setThread] = useState<ThreadDetail["thread"] | null>(null);
  const [board, setBoard] = useState<ThreadDetail["board"] | null>(null);
  const [items, setItems] = useState<ReplyItem[]>([]);
  const [initialStatus, setInitialStatus] = useState<InitialStatus>(
    threadId ? "loading" : "notFound",
  );
  const [initialError, setInitialError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const nextCursorRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!threadId) {
      setThread(null);
      setBoard(null);
      setItems([]);
      setInitialStatus("notFound");
      setInitialError(null);
      setLoadMoreError(null);
      setIsLoadingMore(false);
      setHasMore(false);
      nextCursorRef.current = null;
      return () => {
        active = false;
      };
    }

    setThread(null);
    setBoard(null);
    setItems([]);
    setInitialStatus("loading");
    setInitialError(null);
    setLoadMoreError(null);
    setIsLoadingMore(false);
    setHasMore(false);
    nextCursorRef.current = null;

    void (async () => {
      try {
        const [detail, feed] = await Promise.all([
          fetchThread(threadId),
          fetchThreadRepliesFeed(threadId),
        ]);

        if (!active) {
          return;
        }

        setThread(detail.thread);
        setBoard(detail.board);
        setItems(feed.items);
        setHasMore(feed.page.hasMore);
        nextCursorRef.current = feed.page.nextCursor;
        setInitialStatus("success");
      } catch (error) {
        if (!active) {
          return;
        }

        setThread(null);
        setBoard(null);
        setItems([]);
        setHasMore(false);
        nextCursorRef.current = null;

        const errorStatus = getErrorStatus(error);
        setInitialStatus(errorStatus);
        setInitialError(errorStatus === "error" ? getErrorMessage(error) : null);
      }
    })();

    return () => {
      active = false;
    };
  }, [threadId]);

  const loadMore = useCallback(async () => {
    if (!threadId || initialStatus !== "success" || isLoadingMore || !hasMore) {
      return;
    }

    setIsLoadingMore(true);
    setLoadMoreError(null);

    try {
      const feed = await fetchThreadRepliesFeed(threadId, nextCursorRef.current ?? undefined);

      setItems((currentItems) => [...currentItems, ...feed.items]);
      setHasMore(feed.page.hasMore);
      nextCursorRef.current = feed.page.nextCursor;
    } catch (error) {
      setLoadMoreError(getErrorMessage(error));
    } finally {
      setIsLoadingMore(false);
    }
  }, [threadId, hasMore, initialStatus, isLoadingMore]);

  return {
    thread,
    board,
    items,
    initialStatus,
    initialError,
    loadMoreError,
    isLoadingMore,
    hasMore,
    loadMore,
  };
}
