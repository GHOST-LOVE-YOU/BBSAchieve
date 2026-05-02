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

type ReadingFlowDeps = {
  boards: BoardRepository;
  replies: ReplyRepository;
  threads: ThreadRepository;
  users: UserRepository;
};

class InMemoryBoardRepository implements BoardRepository {
  private readonly items = new Map<string, BoardRecord>();

  constructor(initialItems: BoardRecord[]) {
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

class InMemoryUserRepository implements UserRepository {
  private readonly items = new Map<string, UserRecord>();

  constructor(initialItems: UserRecord[]) {
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

class InMemoryThreadRepository implements ThreadRepository {
  private readonly items = new Map<string, ThreadRecord>();

  constructor(initialItems: ThreadRecord[]) {
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

class InMemoryReplyRepository implements ReplyRepository {
  private readonly items = new Map<string, ReplyRecord>();

  constructor(initialItems: ReplyRecord[]) {
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

function createForumFixture(): {
  boards: BoardRecord[];
  replies: ReplyRecord[];
  threads: ThreadRecord[];
  users: UserRecord[];
} {
  return {
    boards: [
      {
        id: "board:job",
        slug: "job",
        name: "Jobs and Offers",
        description: "Signals for roles, openings, and practical next steps.",
      },
      {
        id: "board:hot",
        slug: "hot",
        name: "Hot Reading",
        description: "Fast-moving threads and the replies that follow them.",
      },
    ],
    users: [
      {
        id: "user:alice",
        username: "alice",
        displayName: "Alice",
        userType: "human",
        status: "active",
      },
      {
        id: "user:robot-1",
        username: "robot-1",
        displayName: "Robot 1",
        userType: "bot",
        status: "active",
        mailboxKey: "mailbox-1",
        sourceLabel: "fixture",
        canPost: true,
      },
      {
        id: "user:robot-2",
        username: "robot-2",
        displayName: "Robot 2",
        userType: "bot",
        status: "active",
        mailboxKey: "mailbox-2",
        sourceLabel: "fixture",
        canPost: true,
      },
    ],
    threads: [
      {
        id: "thread:first-offer",
        boardId: "board:job",
        authorUserId: "user:robot-1",
        sourceThreadId: "source-thread-1",
        sourceBoardSlug: "job",
        title: "First offer from the mirror",
        body: "A new listing has been mirrored and is ready to read.",
        publishedAt: "2026-05-01T08:00:00.000Z",
        replyCount: 2,
        lastReplyAt: "2026-05-01T08:10:00.000Z",
      },
      {
        id: "thread:read-path",
        boardId: "board:job",
        authorUserId: "user:alice",
        sourceThreadId: "source-thread-2",
        sourceBoardSlug: "job",
        title: "Reading path for mirrored posts",
        body: "This thread keeps the reading chain easy to trace.",
        publishedAt: "2026-05-01T09:00:00.000Z",
        replyCount: 1,
        lastReplyAt: "2026-05-01T09:05:00.000Z",
      },
      {
        id: "thread:hot-follow-up",
        boardId: "board:hot",
        authorUserId: "user:robot-2",
        sourceThreadId: "source-thread-3",
        sourceBoardSlug: "hot",
        title: "Follow up on the hot thread",
        body: "This board surfaces the replies that matter most.",
        publishedAt: "2026-05-01T10:00:00.000Z",
        replyCount: 0,
        lastReplyAt: null,
      },
    ],
    replies: [
      {
        id: "reply:first-offer-1",
        threadId: "thread:first-offer",
        authorUserId: "user:alice",
        replyIndex: 1,
        body: "This is the kind of post I want to read first.",
        publishedAt: "2026-05-01T08:05:00.000Z",
      },
      {
        id: "reply:first-offer-2",
        threadId: "thread:first-offer",
        authorUserId: "user:robot-1",
        replyIndex: 2,
        body: "The mirror keeps the reading flow stable.",
        publishedAt: "2026-05-01T08:10:00.000Z",
      },
      {
        id: "reply:read-path-1",
        threadId: "thread:read-path",
        authorUserId: "user:robot-2",
        replyIndex: 1,
        body: "I can follow the chain from board to thread to reply.",
        publishedAt: "2026-05-01T09:05:00.000Z",
      },
    ],
  };
}

export function createReadingFlowDeps(): ReadingFlowDeps {
  const forumFixture = createForumFixture();

  return {
    boards: new InMemoryBoardRepository(forumFixture.boards),
    replies: new InMemoryReplyRepository(forumFixture.replies),
    threads: new InMemoryThreadRepository(forumFixture.threads),
    users: new InMemoryUserRepository(forumFixture.users),
  };
}
