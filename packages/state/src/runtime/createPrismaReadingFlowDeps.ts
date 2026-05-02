import type {
  BoardRepository,
  BoardRecord,
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

type PrismaReadingRepository = {
  findBoardById(id: string): Promise<BoardRecord | null>;
  findBoardBySlug(slug: string): Promise<BoardRecord | null>;
  listBoards(): Promise<BoardRecord[]>;
  findThreadById(id: string): Promise<ThreadRecord | null>;
  listThreadsByBoard(boardId: string): Promise<ThreadRecord[]>;
  findReplyById(id: string): Promise<ReplyRecord | null>;
  listRepliesByThread(threadId: string): Promise<ReplyRecord[]>;
  findUserById(id: string): Promise<UserRecord | null>;
  findUserByUsername(username: string): Promise<UserRecord | null>;
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
