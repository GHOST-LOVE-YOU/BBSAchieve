import { apiGetJson } from "@/lib/api";

import type {
  BoardDetailResponse,
  BoardThreadsFeedResponse,
  BoardsResponse,
  ThreadDetailResponse,
  ThreadRepliesFeedResponse,
} from "./types";

export function fetchBoards() {
  return apiGetJson<BoardsResponse>("/api/public/boards");
}

export function fetchBoard(boardIdOrSlug: string) {
  return apiGetJson<BoardDetailResponse>(
    `/api/public/boards/${encodeURIComponent(boardIdOrSlug)}`,
  );
}

export function fetchBoardThreadsFeed(boardIdOrSlug: string, cursor?: string) {
  const searchParams = new URLSearchParams({ limit: "20" });

  if (cursor) {
    searchParams.set("cursor", cursor);
  }

  return apiGetJson<BoardThreadsFeedResponse>(
    `/api/public/boards/${encodeURIComponent(boardIdOrSlug)}/threads?${searchParams.toString()}`,
  );
}

export function fetchThread(threadId: string) {
  return apiGetJson<ThreadDetailResponse>(
    `/api/public/threads/${encodeURIComponent(threadId)}`,
  );
}

export function fetchThreadRepliesFeed(threadId: string, cursor?: string) {
  const searchParams = new URLSearchParams({ limit: "20" });

  if (cursor) {
    searchParams.set("cursor", cursor);
  }

  return apiGetJson<ThreadRepliesFeedResponse>(
    `/api/public/threads/${encodeURIComponent(threadId)}/replies?${searchParams.toString()}`,
  );
}
