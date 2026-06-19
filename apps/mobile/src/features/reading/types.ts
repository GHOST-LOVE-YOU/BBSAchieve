export type BoardSummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  threadCount: number;
  latestThreadTitle: string | null;
};

export type BoardDetail = {
  id: string;
  slug: string;
  name: string;
  description: string;
};

export type BoardThreadItem = {
  id: string;
  title: string;
  authorName: string;
  publishedAt: string;
  replyCount: number;
  lastReplyAt: string | null;
};

export type ThreadDetail = {
  board: {
    id: string;
    slug: string;
    name: string;
  };
  thread: {
    id: string;
    title: string;
    body: string;
    authorName: string;
    publishedAt: string;
    replyCount: number;
  };
};

export type ReplyItem = {
  id: string;
  body: string;
  authorName: string;
  publishedAt: string;
  replyIndex: number;
};

export type FeedPage = {
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
};

export type BoardsResponse = {
  boards: BoardSummary[];
};

export type BoardDetailResponse = BoardDetail;

export type BoardThreadsFeedResponse = {
  items: BoardThreadItem[];
  page: FeedPage;
};

export type ThreadDetailResponse = ThreadDetail;

export type ThreadRepliesFeedResponse = {
  items: ReplyItem[];
  page: FeedPage;
};

// --- Feed ---

export type FeedThreadItem = {
  id: string;
  title: string;
  body: string;
  excerpt: string;
  authorId: string;
  authorName: string;
  authorIsBot: boolean;
  publishedAt: string;
  lastReplyAt: string | null;
  lastReplyAuthorName: string | null;
  replyCount: number;
  boardId: string;
  boardSlug: string;
  boardName: string;
  sourceBoardSlug: string;
  sourceThreadId: string;
};

export type FeedResponse = {
  items: FeedThreadItem[];
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

// --- Notifications ---

export type NotificationType =
  | "thread_reply"
  | "reply_quote"
  | "mirror_source_stale"
  | "bot_rotated"
  | "system";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  body: string;
  sourceLabel: string | null;
  occurredAt: string;
  readAt: string | null;
  threadId: string | null;
  replyId: string | null;
  threadTitle: string | null;
  targetHref: string | null;
};

export type NotificationsResponse = {
  items: NotificationItem[];
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
  unreadCount: number;
};

// --- Search ---

export type SearchPostHit = {
  id: string;
  title: string;
  authorName: string;
  authorIsBot: boolean;
  replyCount: number;
  lastReplyAt: string | null;
};

export type SearchReplyHit = {
  id: string;
  threadId: string;
  threadTitle: string;
  body: string;
  floor: number | null;
  authorName: string;
  publishedAt: string;
};

export type SearchUserHit = {
  id: string;
  username: string;
  displayName: string;
  isBot: boolean;
  threadCount: number;
};

export type SearchResponse = {
  posts: SearchPostHit[];
  replies: SearchReplyHit[];
  users: SearchUserHit[];
};

// --- User Profile ---

export type UserProfile = {
  id: string;
  username: string;
  displayName: string;
  userType: "human" | "bot";
  status: string;
  bio: string | null;
  avatarUrl: string | null;
  threadCount: number;
  replyCount: number;
  joinedAt: string;
  bot: {
    sourceLabel: string;
    canPost: boolean;
    personaSummary: string | null;
  } | null;
};

export type UserThreadItem = {
  id: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  lastReplyAt: string | null;
  replyCount: number;
  boardName: string;
  boardSlug: string;
};

export type UserReplyItem = {
  id: string;
  body: string;
  excerpt: string;
  floor: number;
  publishedAt: string;
  threadId: string;
  threadTitle: string;
  threadSourceTrimmedTitle: string;
};

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

// --- Bookmarks ---

export type BookmarkItem = {
  id: string;
  threadId: string;
  threadTitle: string;
  threadExcerpt: string;
  authorName: string;
  authorIsBot: boolean;
  boardName: string;
  boardSlug: string;
  replyCount: number;
  lastReplyAt: string | null;
  createdAt: string;
};

export type BookmarksResponse = {
  items: BookmarkItem[];
};

// --- Subscriptions ---

export type SubscriptionItem = {
  id: string;
  targetType: "thread" | "reply";
  threadId: string | null;
  replyId: string | null;
  status?: "active" | "muted" | "revoked";
  subscriptionStatus: "active" | "muted" | "revoked";
  threadTitle: string | null;
  replyExcerpt?: string | null;
  replyFloor: number | null;
  createdAt: string;
  lastReplyAt?: string | null;
};

export type SubscriptionsResponse = {
  items: SubscriptionItem[];
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
};
