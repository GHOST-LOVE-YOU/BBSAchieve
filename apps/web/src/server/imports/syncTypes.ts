export type SyncSourceType = "byr_sync_api" | "legacy_postgres";

export type SyncBoardDTO = {
  slug: string;
  name: string;
  description: string;
};

export type SyncBotUserDTO = {
  username: string;
  displayName: string;
  mailboxKey?: string | null;
};

export type SyncThreadDTO = {
  sourceBoardSlug: string;
  sourceThreadId: string;
  authorUsername: string | null;
  title: string;
  body: string | null;
  publishedAt: Date | null;
  replyCount: number;
};

export type SyncReplyDTO = {
  sourceBoardSlug: string;
  sourceThreadId: string;
  replyIndex: number;
  authorUsername: string;
  body: string;
  publishedAt: Date;
};

export type NormalizedImportBatch = {
  sourceType: SyncSourceType;
  sourceLabel: string;
  boards: SyncBoardDTO[];
  botUsers: SyncBotUserDTO[];
  threads: SyncThreadDTO[];
  replies: SyncReplyDTO[];
};

export type ByrSyncPostPayload = {
  post_id: string;
  floor_label: string;
  author_display_name: string;
  posted_at: string;
  body: string;
};

export type ByrSyncThreadPayload = {
  article_id: string;
  title: string;
  reply_count: number;
  posts: ByrSyncPostPayload[];
};

export type ByrSyncUpdatesPayload = {
  board_name: string;
  threads: ByrSyncThreadPayload[];
};

export type ByrSyncBackfillPayload = {
  article_id: string;
  start_floor: number;
  posts: ByrSyncPostPayload[];
};

export type ByrSyncPayload = ByrSyncUpdatesPayload;
