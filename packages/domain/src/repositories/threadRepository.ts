export interface ThreadRecord {
  id: string;
  boardId: string;
  authorUserId: string;
  title: string;
  body: string;
}

export interface ThreadRepository {
  create(input: ThreadRecord): Promise<ThreadRecord>;
  listByBoard(boardId: string): Promise<ThreadRecord[]>;
}
