import { describe, expect, it, vi } from "vitest";

import { mapByrSyncPayload } from "@/src/server/imports/mapSyncPayload";
import { importSyncBatch } from "@/src/server/imports/importSyncBatch";

type MockState = {
  imports: Array<Record<string, unknown>>;
  boards: Map<string, Record<string, unknown>>;
  users: Map<string, Record<string, unknown>>;
  botProfiles: Map<string, Record<string, unknown>>;
  threads: Map<string, Record<string, unknown>>;
  replies: Map<string, Record<string, unknown>>;
};

function createMockPrisma(options?: { failOnBoardUpsert?: boolean }) {
  const state: MockState = {
    imports: [],
    boards: new Map(),
    users: new Map(),
    botProfiles: new Map(),
    threads: new Map(),
    replies: new Map(),
  };

  return {
    state,
    import: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `import-${state.imports.length + 1}`, ...data };
        state.imports.push(row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const current = state.imports.find((row) => row.id === where.id);
        if (!current) {
          throw new Error(`missing import ${where.id}`);
        }
        Object.assign(current, data);
        return current;
      }),
    },
    board: {
      upsert: vi.fn(async ({ where, create, update }: any) => {
        if (options?.failOnBoardUpsert) {
          throw new Error("board upsert failed");
        }
        const existing = state.boards.get(where.slug);
        const row = existing ? { ...existing, ...update } : { id: `board-${state.boards.size + 1}`, ...create };
        state.boards.set(row.slug, row);
        return row;
      }),
    },
    user: {
      findFirst: vi.fn(async ({ where }: any) => {
        return (
          [...state.users.values()].find(
            (row) =>
              row.username === where.username && row.userType === where.userType,
          ) ?? null
        );
      }),
      create: vi.fn(async ({ data }: any) => {
        const row = { id: `user-${state.users.size + 1}`, ...data };
        state.users.set(row.username, row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const existingRow = [...state.users.values()].find((row) => row.id === where.id);
        const current = existingRow
          ? state.users.get(String(existingRow.username))
          : undefined;
        if (!current) {
          throw new Error(`missing user ${where.id}`);
        }
        Object.assign(current, data);
        state.users.set(String(current.username), current);
        return current;
      }),
    },
    botProfile: {
      upsert: vi.fn(async ({ where, create, update }: any) => {
        const existing = state.botProfiles.get(where.userId);
        const row = existing ? { ...existing, ...update } : { id: `bot-profile-${state.botProfiles.size + 1}`, ...create };
        state.botProfiles.set(row.userId, row);
        return row;
      }),
    },
    thread: {
      upsert: vi.fn(async ({ where, create, update }: any) => {
        const key = `${where.sourceBoardSlug_sourceThreadId.sourceBoardSlug}:${where.sourceBoardSlug_sourceThreadId.sourceThreadId}`;
        const existing = state.threads.get(key);
        const row = existing ? { ...existing, ...update } : { id: `thread-${state.threads.size + 1}`, ...create };
        state.threads.set(key, row);
        return row;
      }),
    },
    reply: {
      findUnique: vi.fn(async ({ where }: any) => {
        const key = `${where.threadId_replyIndex.threadId}:${where.threadId_replyIndex.replyIndex}`;
        return state.replies.get(key) ?? null;
      }),
      create: vi.fn(async ({ data }: any) => {
        const key = `${data.threadId}:${data.replyIndex}`;
        const row = { id: `reply-${state.replies.size + 1}`, ...data };
        state.replies.set(key, row);
        return row;
      }),
    },
  };
}

describe("mapByrSyncPayload", () => {
  it("normalizes byr sync payload into import batch dto", () => {
    const batch = mapByrSyncPayload({
      sourceLabel: "mirror-a",
      boards: [
        {
          slug: "board-a",
          name: "Board A",
          description: "Board A desc",
        },
      ],
      botUsers: [
        {
          username: "bot-a",
          displayName: "Bot A",
          mailboxKey: "mailbox-a",
        },
      ],
      threads: [
        {
          sourceBoardSlug: "board-a",
          sourceThreadId: "thread-1",
          authorUsername: "bot-a",
          title: "Thread 1",
          body: "Body 1",
          publishedAt: "2026-05-02T08:00:00.000Z",
        },
      ],
      replies: [
        {
          sourceBoardSlug: "board-a",
          sourceThreadId: "thread-1",
          replyIndex: 0,
          authorUsername: "bot-a",
          body: "Reply 1",
          publishedAt: "2026-05-02T08:10:00.000Z",
        },
      ],
    });

    expect(batch.sourceType).toBe("byr_sync_api");
    expect(batch.sourceLabel).toBe("mirror-a");
    expect(batch.boards[0]?.slug).toBe("board-a");
    expect(batch.botUsers[0]?.username).toBe("bot-a");
    expect(batch.threads[0]?.publishedAt.toISOString()).toBe("2026-05-02T08:00:00.000Z");
    expect(batch.replies[0]?.publishedAt.toISOString()).toBe("2026-05-02T08:10:00.000Z");
  });
});

describe("importSyncBatch", () => {
  it("imports records and skips existing replies", async () => {
    const prisma = createMockPrisma();
    const importedReply = {
      sourceThreadId: "thread-1",
      sourceBoardSlug: "board-a",
      replyIndex: 1,
      authorUsername: "bot-b",
      body: "Reply 2",
      publishedAt: new Date("2026-05-02T08:20:00.000Z"),
    };

    prisma.state.replies.set("thread-1:0", {
      id: "reply-existing",
      threadId: "thread-1",
      replyIndex: 0,
    });

    const result = await importSyncBatch(prisma as any, {
      sourceType: "byr_sync_api",
      sourceLabel: "mirror-a",
      boards: [
        {
          slug: "board-a",
          name: "Board A",
          description: "Board A desc",
        },
      ],
      botUsers: [
        {
          username: "bot-a",
          displayName: "Bot A",
          mailboxKey: "mailbox-a",
        },
        {
          username: "bot-b",
          displayName: "Bot B",
        },
      ],
      threads: [
        {
          sourceBoardSlug: "board-a",
          sourceThreadId: "thread-1",
          authorUsername: "bot-a",
          title: "Thread 1",
          body: "Body 1",
          publishedAt: new Date("2026-05-02T08:00:00.000Z"),
        },
      ],
      replies: [
        {
          sourceBoardSlug: "board-a",
          sourceThreadId: "thread-1",
          replyIndex: 0,
          authorUsername: "bot-a",
          body: "Reply 1",
          publishedAt: new Date("2026-05-02T08:10:00.000Z"),
        },
        importedReply,
      ],
    });

    expect(result).toMatchObject({
      importId: "import-1",
      importedThreads: 1,
      importedReplies: 1,
      skippedReplies: 1,
    });
    expect(prisma.import.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "running",
          sourceType: "byr_sync_api",
          sourceLabel: "mirror-a",
        }),
      }),
    );
    expect(prisma.import.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "import-1" },
        data: expect.objectContaining({
          status: "succeeded",
          importedThreads: 1,
          importedReplies: 1,
          skippedReplies: 1,
        }),
      }),
    );
    expect(prisma.board.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.user.findFirst).toHaveBeenCalledTimes(2);
    expect(prisma.user.create).toHaveBeenCalledTimes(2);
    expect(prisma.botProfile.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.thread.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.reply.create).toHaveBeenCalledTimes(1);
    expect(prisma.reply.findUnique).toHaveBeenCalledTimes(2);
  });

  it("marks the import failed when a write throws", async () => {
    const prisma = createMockPrisma({ failOnBoardUpsert: true });

    await expect(
      importSyncBatch(prisma as any, {
        sourceType: "byr_sync_api",
        sourceLabel: "mirror-a",
        boards: [
          {
            slug: "board-a",
            name: "Board A",
            description: "Board A desc",
          },
        ],
        botUsers: [],
        threads: [],
        replies: [],
      }),
    ).rejects.toThrow("board upsert failed");

    expect(prisma.import.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "import-1" },
        data: expect.objectContaining({
          status: "failed",
          errorMessage: "board upsert failed",
        }),
      }),
    );
  });
});
