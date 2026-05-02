export interface ThreadRecord {
  id: string;
  boardId: string;
  authorUserId: string;
  sourceThreadId?: string;
  sourceBoardSlug?: string;
  title: string;
  body: string;
  publishedAt: string;
  replyCount?: number;
  lastReplyAt?: string | null;
}

export interface ThreadRepository {
  create(input: ThreadRecord): Promise<ThreadRecord>;
  findById(id: string): Promise<ThreadRecord | null>;
  listByBoard(boardId: string): Promise<ThreadRecord[]>;
}
