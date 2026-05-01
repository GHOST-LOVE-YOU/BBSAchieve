export interface ReplyRecord {
  id: string;
  threadId: string;
  authorUserId: string;
  body: string;
}

export interface ReplyRepository {
  findById(id: string): Promise<ReplyRecord | null>;
  listByThread(threadId: string): Promise<ReplyRecord[]>;
}
