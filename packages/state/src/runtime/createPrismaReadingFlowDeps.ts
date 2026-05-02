import type {
  BoardRepository,
  ReplyRepository,
  ThreadRepository,
  UserRepository,
} from "@bbs/domain";

type ReadingFlowDeps = {
  boards: BoardRepository;
  replies: ReplyRepository;
  threads: ThreadRepository;
  users: UserRepository;
};

type PrismaReadingRepository = {
  findBoardById(id: string): Promise<{ id: string; slug: string; name: string; description: string } | null>;
  findBoardBySlug(slug: string): Promise<{ id: string; slug: string; name: string; description: string } | null>;
  listBoards(): Promise<Array<{ id: string; slug: string; name: string; description: string }>>;
  findThreadById(id: string): Promise<{
    id: string;
    boardId: string;
    authorUserId: string;
    sourceThreadId: string;
    sourceBoardSlug: string;
    title: string;
    body: string;
    publishedAt: string;
    replyCount?: number;
    lastReplyAt?: string | null;
  } | null>;
  listThreadsByBoard(boardId: string): Promise<Array<{
    id: string;
    boardId: string;
    authorUserId: string;
    sourceThreadId: string;
    sourceBoardSlug: string;
    title: string;
    body: string;
    publishedAt: string;
    replyCount?: number;
    lastReplyAt?: string | null;
  }>>;
  findReplyById(id: string): Promise<{
    id: string;
    threadId: string;
    authorUserId: string;
    replyIndex?: number;
    body: string;
    publishedAt: string;
  } | null>;
  listRepliesByThread(threadId: string): Promise<Array<{
    id: string;
    threadId: string;
    authorUserId: string;
    replyIndex?: number;
    body: string;
    publishedAt: string;
  }>>;
  findUserById(id: string): Promise<{
    id: string;
    username: string;
    displayName: string;
    userType: "human" | "bot";
    status: "active" | "disabled";
    mailboxKey?: string;
  } | null>;
  findUserByUsername(username: string): Promise<{
    id: string;
    username: string;
    displayName: string;
    userType: "human" | "bot";
    status: "active" | "disabled";
    mailboxKey?: string;
  } | null>;
};

function createReadonlyUserRepository(reader: PrismaReadingRepository): UserRepository {
  return {
    findById: (id) => reader.findUserById(id),
    findByUsername: (username) => reader.findUserByUsername(username),
    createBot: async () => {
      throw new Error("createBot is not available in the Prisma reading flow");
    },
  };
}

export function createPrismaReadingFlowDeps(reader: PrismaReadingRepository): ReadingFlowDeps {
  return {
    boards: {
      findById: (id) => reader.findBoardById(id),
      findBySlug: (slug) => reader.findBoardBySlug(slug),
      list: () => reader.listBoards(),
    },
    threads: {
      create: async () => {
        throw new Error("create is not available in the Prisma reading flow");
      },
      findById: (id) => reader.findThreadById(id),
      listByBoard: (boardId) => reader.listThreadsByBoard(boardId),
    },
    replies: {
      findById: (id) => reader.findReplyById(id),
      listByThread: (threadId) => reader.listRepliesByThread(threadId),
    },
    users: createReadonlyUserRepository(reader),
  };
}
