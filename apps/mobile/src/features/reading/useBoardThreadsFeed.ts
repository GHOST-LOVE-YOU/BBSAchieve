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
  const loadMoreInFlightRef = useRef(false);
  const requestVersionRef = useRef(0);

  useEffect(() => {
    requestVersionRef.current += 1;
    loadMoreInFlightRef.current = false;
    let active = true;
    const requestVersion = requestVersionRef.current;

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

        if (!active || requestVersionRef.current !== requestVersion) {
          return;
        }

        setBoard(boardDetail);
        setItems(feed.items);
        setHasMore(feed.page.hasMore);
        nextCursorRef.current = feed.page.nextCursor;
        setInitialStatus("success");
      } catch (error) {
        if (!active || requestVersionRef.current !== requestVersion) {
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
    if (
      !boardId ||
      initialStatus !== "success" ||
      loadMoreInFlightRef.current ||
      !hasMore
    ) {
      return;
    }

    const requestVersion = requestVersionRef.current;
    loadMoreInFlightRef.current = true;
    setIsLoadingMore(true);
    setLoadMoreError(null);

    try {
      const feed = await fetchBoardThreadsFeed(boardId, nextCursorRef.current ?? undefined);

      if (requestVersionRef.current !== requestVersion) {
        return;
      }

      setItems((currentItems) => [...currentItems, ...feed.items]);
      setHasMore(feed.page.hasMore);
      nextCursorRef.current = feed.page.nextCursor;
    } catch (error) {
      if (requestVersionRef.current !== requestVersion) {
        return;
      }

      setLoadMoreError(getErrorMessage(error));
    } finally {
      if (requestVersionRef.current !== requestVersion) {
        return;
      }

      loadMoreInFlightRef.current = false;
      setIsLoadingMore(false);
    }
  }, [boardId, hasMore, initialStatus]);

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
