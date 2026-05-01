export interface ThreadRecord {
  id: string;
  boardId: string;
  authorUserId: string;
  title: string;
  body: string;
  publishedAt: string;
}

export interface ThreadRepository {
  create(input: ThreadRecord): Promise<ThreadRecord>;
  findById(id: string): Promise<ThreadRecord | null>;
  listByBoard(boardId: string): Promise<ThreadRecord[]>;
}
