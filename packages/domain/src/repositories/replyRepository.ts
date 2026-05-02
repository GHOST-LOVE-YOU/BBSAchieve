export interface ReplyRecord {
  id: string;
  threadId: string;
  authorUserId: string;
  replyIndex?: number;
  body: string;
  publishedAt: string;
}

export interface ReplyRepository {
  findById(id: string): Promise<ReplyRecord | null>;
  listByThread(threadId: string): Promise<ReplyRecord[]>;
}
