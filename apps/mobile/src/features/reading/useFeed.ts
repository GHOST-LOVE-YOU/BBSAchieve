import { useCallback, useEffect, useRef, useState } from "react";

import { fetchFeed } from "./client";
import type { FeedThreadItem } from "./types";

type FeedState = {
  items: FeedThreadItem[];
  status: "loading" | "success" | "error";
  error: string | null;
  isLoadingMore: boolean;
  hasMore: boolean;
  totalCount: number;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
};

export function useFeed(
  kind: "bot" | "real" | "all" = "bot",
  perPage = 15,
): FeedState {
  const [items, setItems] = useState<FeedThreadItem[]>([]);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const pageRef = useRef(1);
  const loadMoreInFlightRef = useRef(false);
  const versionRef = useRef(0);
  const mountedRef = useRef(true);

  const load = useCallback(async (isActive: () => boolean = () => true) => {
    versionRef.current += 1;
    const version = versionRef.current;
    pageRef.current = 1;
    if (!isActive()) return;
    setStatus("loading");
    setError(null);

    try {
      const result = await fetchFeed(kind, 1, perPage);
      if (!isActive() || versionRef.current !== version) return;
      setItems(result.items);
      setHasMore(result.hasNextPage);
      setTotalCount(result.totalCount);
      setStatus("success");
    } catch (e) {
      if (!isActive() || versionRef.current !== version) return;
      setError(e instanceof Error ? e.message : "Unknown error");
      setStatus("error");
    }
  }, [kind, perPage]);

  useEffect(() => {
    let active = true;
    mountedRef.current = true;

    void load(() => active);

    return () => {
      active = false;
      mountedRef.current = false;
    };
  }, [load]);

  const loadMore = useCallback(async () => {
    if (loadMoreInFlightRef.current || !hasMore || status !== "success") return;
    loadMoreInFlightRef.current = true;
    setIsLoadingMore(true);
    const nextPage = pageRef.current + 1;
    const version = versionRef.current;

    try {
      const result = await fetchFeed(kind, nextPage, perPage);
      if (!mountedRef.current || versionRef.current !== version) return;
      pageRef.current = nextPage;
      setItems((prev) => [...prev, ...result.items]);
      setHasMore(result.hasNextPage);
      setTotalCount(result.totalCount);
    } catch {
      // silently ignore load-more errors
    } finally {
      loadMoreInFlightRef.current = false;
      if (!mountedRef.current || versionRef.current !== version) return;
      setIsLoadingMore(false);
    }
  }, [kind, perPage, hasMore, status]);

  return {
    items,
    status,
    error,
    isLoadingMore,
    hasMore,
    totalCount,
    loadMore,
    refresh: load,
  };
}
