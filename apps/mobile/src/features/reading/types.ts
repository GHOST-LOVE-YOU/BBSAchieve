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
