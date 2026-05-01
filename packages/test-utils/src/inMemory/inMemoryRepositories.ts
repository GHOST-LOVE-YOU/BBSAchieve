import type {
  ThreadRecord,
  ThreadRepository,
  UserRecord,
  UserRepository,
} from "@bbs/domain";

export class InMemoryUserRepository implements UserRepository {
  private readonly items = new Map<string, UserRecord>();

  async findByUsername(username: string): Promise<UserRecord | null> {
    return [...this.items.values()].find((item) => item.username === username) ?? null;
  }

  async createBot(input: UserRecord): Promise<UserRecord> {
    this.items.set(input.id, input);
    return input;
  }
}

export class InMemoryThreadRepository implements ThreadRepository {
  private readonly items = new Map<string, ThreadRecord>();

  async create(input: ThreadRecord): Promise<ThreadRecord> {
    this.items.set(input.id, input);
    return input;
  }

  async listByBoard(boardId: string): Promise<ThreadRecord[]> {
    return [...this.items.values()].filter((item) => item.boardId === boardId);
  }
}
