import { useCallback, useEffect, useRef, useState } from "react";

import { fetchBoard, fetchBoardThreadsFeed } from "./client";
import type { BoardDetail, BoardThreadItem } from "./types";

type InitialStatus = "loading" | "success" | "notFound" | "error";

type BoardThreadsFeedState = {
  board: BoardDetail | null;
  items: BoardThreadItem[];
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

export function useBoardThreadsFeed(boardId?: string | null): BoardThreadsFeedState {
  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [items, setItems] = useState<BoardThreadItem[]>([]);
  const [initialStatus, setInitialStatus] = useState<InitialStatus>(
    boardId ? "loading" : "notFound",
  );
  const [initialError, setInitialError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const nextCursorRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!boardId) {
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
        const [boardDetail, feed] = await Promise.all([
          fetchBoard(boardId),
          fetchBoardThreadsFeed(boardId),
        ]);

        if (!active) {
          return;
        }

        setBoard(boardDetail);
        setItems(feed.items);
        setHasMore(feed.page.hasMore);
        nextCursorRef.current = feed.page.nextCursor;
        setInitialStatus("success");
      } catch (error) {
        if (!active) {
          return;
        }

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
  }, [boardId]);

  const loadMore = useCallback(async () => {
    if (!boardId || initialStatus !== "success" || isLoadingMore || !hasMore) {
      return;
    }

    setIsLoadingMore(true);
    setLoadMoreError(null);

    try {
      const feed = await fetchBoardThreadsFeed(boardId, nextCursorRef.current ?? undefined);

      setItems((currentItems) => [...currentItems, ...feed.items]);
      setHasMore(feed.page.hasMore);
      nextCursorRef.current = feed.page.nextCursor;
    } catch (error) {
      setLoadMoreError(getErrorMessage(error));
    } finally {
      setIsLoadingMore(false);
    }
  }, [boardId, hasMore, initialStatus, isLoadingMore]);

  return {
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
