import { getRequiredWebBaseUrl } from "@/config/env";
import { apiGetJson } from "@/lib/api";

import type {
  BoardDetailResponse,
  BoardThreadsFeedResponse,
  BoardsResponse,
  BookmarksResponse,
  FeedResponse,
  NotificationsResponse,
  PaginatedResponse,
  SearchResponse,
  SubscriptionsResponse,
  ThreadDetailResponse,
  ThreadRepliesFeedResponse,
  UserProfile,
  UserReplyItem,
  UserThreadItem,
} from "./types";

// --- Boards ---

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

// --- Threads ---

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

// --- Feed ---

export function fetchFeed(
  kind: "bot" | "real" | "all" = "bot",
  page = 1,
  perPage = 15,
  sortBy: "lastReply" | "published" = "lastReply",
) {
  const params = new URLSearchParams({
    kind,
    page: String(page),
    perPage: String(perPage),
    sort: sortBy,
  });
  return apiGetJson<FeedResponse>(`/api/public/feed?${params.toString()}`);
}

// --- Notifications ---

export function fetchNotifications(
  filter: "all" | "unread" | "thread_reply" | "reply_quote" | "system" = "all",
  page = 1,
  perPage = 20,
) {
  const params = new URLSearchParams({
    filter,
    page: String(page),
    perPage: String(perPage),
  });
  return apiGetJson<NotificationsResponse>(
    `/api/public/notifications?${params.toString()}`,
  );
}

export function markNotificationRead(notificationId: string) {
  return apiGetJson<{ success: boolean }>(
    `/api/public/notifications/${encodeURIComponent(notificationId)}/read`,
  );
}

export function markAllNotificationsRead() {
  return apiGetJson<{ success: boolean }>("/api/public/notifications/read-all");
}

// --- Search ---

export function fetchSearch(
  query: string,
  scope: "all" | "posts" | "replies" | "users" = "all",
  limit = 8,
) {
  const params = new URLSearchParams({
    q: query,
    scope,
    limit: String(limit),
  });
  return apiGetJson<SearchResponse>(`/api/public/search?${params.toString()}`);
}

// --- User Profiles ---

export function fetchUserProfile(userId: string) {
  return apiGetJson<UserProfile>(
    `/api/public/users/${encodeURIComponent(userId)}`,
  );
}

export function fetchUserThreads(userId: string, page = 1, perPage = 8) {
  const params = new URLSearchParams({
    page: String(page),
    perPage: String(perPage),
  });
  return apiGetJson<PaginatedResponse<UserThreadItem>>(
    `/api/public/users/${encodeURIComponent(userId)}/threads?${params.toString()}`,
  );
}

export function fetchUserReplies(userId: string, page = 1, perPage = 8) {
  const params = new URLSearchParams({
    page: String(page),
    perPage: String(perPage),
  });
  return apiGetJson<PaginatedResponse<UserReplyItem>>(
    `/api/public/users/${encodeURIComponent(userId)}/replies?${params.toString()}`,
  );
}

// --- Bookmarks ---

export function fetchBookmarks() {
  return apiGetJson<BookmarksResponse>("/api/public/bookmarks");
}

export function checkBookmarked(threadId: string) {
  return apiGetJson<{ bookmarked: boolean }>(
    `/api/public/bookmarks?threadId=${encodeURIComponent(threadId)}`,
  );
}

export async function toggleBookmark(threadId: string) {
  const url = `${getWebBaseUrl()}/api/public/bookmarks`;
  const { getRequiredMobileAccessToken } = await import(
    "@/features/auth/mobileAuthToken"
  );
  const accessToken = await getRequiredMobileAccessToken();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ threadId }),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json() as Promise<{ bookmarked: boolean }>;
}

// --- Subscriptions ---

export function fetchSubscriptions(page = 1, perPage = 20) {
  const params = new URLSearchParams({
    page: String(page),
    perPage: String(perPage),
  });
  return apiGetJson<SubscriptionsResponse>(
    `/api/public/subscriptions?${params.toString()}`,
  );
}

export async function createSubscription(body: {
  targetType: "thread" | "reply";
  threadId?: string;
  replyId?: string;
}) {
  const url = `${getWebBaseUrl()}/api/public/subscriptions`;
  const { getRequiredMobileAccessToken } = await import(
    "@/features/auth/mobileAuthToken"
  );
  const accessToken = await getRequiredMobileAccessToken();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json() as Promise<{ id: string }>;
}

export async function deleteSubscription(subscriptionId: string) {
  const url = `${getWebBaseUrl()}/api/public/subscriptions/${encodeURIComponent(subscriptionId)}`;
  const { getRequiredMobileAccessToken } = await import(
    "@/features/auth/mobileAuthToken"
  );
  const accessToken = await getRequiredMobileAccessToken();
  const response = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
}

function getWebBaseUrl() {
  return getRequiredWebBaseUrl();
}
