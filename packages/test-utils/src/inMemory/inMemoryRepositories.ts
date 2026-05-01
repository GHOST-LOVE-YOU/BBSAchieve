import type {
  BoardRecord,
  BoardRepository,
  ReplyRecord,
  ReplyRepository,
  ThreadRecord,
  ThreadRepository,
  UserRecord,
  UserRepository,
} from "@bbs/domain";

export class InMemoryBoardRepository implements BoardRepository {
  private readonly items = new Map<string, BoardRecord>();

  constructor(initialItems: BoardRecord[] = []) {
    for (const item of initialItems) {
      this.items.set(item.id, item);
    }
  }

  async findById(id: string): Promise<BoardRecord | null> {
    return this.items.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<BoardRecord | null> {
    return [...this.items.values()].find((item) => item.slug === slug) ?? null;
  }

  async list(): Promise<BoardRecord[]> {
    return [...this.items.values()];
  }
}

export class InMemoryUserRepository implements UserRepository {
  private readonly items = new Map<string, UserRecord>();

  constructor(initialItems: UserRecord[] = []) {
    for (const item of initialItems) {
      this.items.set(item.id, item);
    }
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.items.get(id) ?? null;
  }

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

  constructor(initialItems: ThreadRecord[] = []) {
    for (const item of initialItems) {
      this.items.set(item.id, item);
    }
  }

  async create(input: ThreadRecord): Promise<ThreadRecord> {
    this.items.set(input.id, input);
    return input;
  }

  async findById(id: string): Promise<ThreadRecord | null> {
    return this.items.get(id) ?? null;
  }

  async listByBoard(boardId: string): Promise<ThreadRecord[]> {
    return [...this.items.values()].filter((item) => item.boardId === boardId);
  }
}

export class InMemoryReplyRepository implements ReplyRepository {
  private readonly items = new Map<string, ReplyRecord>();

  constructor(initialItems: ReplyRecord[] = []) {
    for (const item of initialItems) {
      this.items.set(item.id, item);
    }
  }

  async findById(id: string): Promise<ReplyRecord | null> {
    return this.items.get(id) ?? null;
  }

  async listByThread(threadId: string): Promise<ReplyRecord[]> {
    return [...this.items.values()].filter((item) => item.threadId === threadId);
  }
}
