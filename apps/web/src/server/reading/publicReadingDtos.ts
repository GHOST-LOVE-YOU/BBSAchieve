export type PublicBoardSummaryDto = {
  id: string;
  slug: string;
  name: string;
  description: string;
  threadCount: number;
  latestThreadTitle: string | null;
};

export type PublicBoardDetailDto = {
  id: string;
  slug: string;
  name: string;
  description: string;
};

export type PublicBoardThreadItemDto = {
  id: string;
  title: string;
  authorName: string;
  publishedAt: string;
  replyCount: number;
  lastReplyAt: string | null;
};

export type PublicThreadDetailDto = {
  board: { id: string; slug: string; name: string };
  thread: {
    id: string;
    title: string;
    body: string;
    authorName: string;
    publishedAt: string;
    replyCount: number;
  };
};

export type PublicReplyItemDto = {
  id: string;
  body: string;
  authorName: string;
  publishedAt: string;
  replyIndex: number;
};
