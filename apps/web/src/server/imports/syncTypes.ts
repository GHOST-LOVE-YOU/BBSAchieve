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
  authorUsername: string;
  title: string;
  body: string;
  publishedAt: Date;
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

export type ByrSyncBoardPayload = {
  slug: string;
  name: string;
  description: string;
};

export type ByrSyncBotUserPayload = {
  username: string;
  displayName: string;
  mailboxKey?: string | null;
};

export type ByrSyncThreadPayload = {
  sourceBoardSlug: string;
  sourceThreadId: string;
  authorUsername: string;
  title: string;
  body: string;
  publishedAt: string;
};

export type ByrSyncReplyPayload = {
  sourceBoardSlug: string;
  sourceThreadId: string;
  replyIndex: number;
  authorUsername: string;
  body: string;
  publishedAt: string;
};

export type ByrSyncPayload = {
  sourceLabel: string;
  boards: ByrSyncBoardPayload[];
  botUsers: ByrSyncBotUserPayload[];
  threads: ByrSyncThreadPayload[];
  replies: ByrSyncReplyPayload[];
};

