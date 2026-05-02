import { describe, expect, it, vi } from "vitest";

import {
  mapByrSyncPayload,
  mapSyncPayload,
  parseByrPostedAt,
  parseReplyIndex,
} from "@/src/server/imports/mapSyncPayload";
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
      findUnique: vi.fn(async ({ where }: any) => {
        const key = `${where.sourceBoardSlug_sourceThreadId.sourceBoardSlug}:${where.sourceBoardSlug_sourceThreadId.sourceThreadId}`;
        return state.threads.get(key) ?? null;
      }),
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

describe("parseReplyIndex", () => {
  it("extracts the numeric floor from a standard label", () => {
    expect(parseReplyIndex("1楼")).toBe(1);
    expect(parseReplyIndex("24楼")).toBe(24);
    expect(parseReplyIndex("第9楼")).toBe(9);
    expect(parseReplyIndex("第10楼")).toBe(10);
  });

  it("treats the original post as floor zero and falls back for unexpected labels", () => {
    expect(parseReplyIndex("楼主")).toBe(0);
    expect(parseReplyIndex("reply-1")).toBe(0);
  });
});

describe("parseByrPostedAt", () => {
  it("parses byr posted timestamps into real dates", () => {
    expect(parseByrPostedAt("Sat Apr 25 18:07:24 2026")?.toISOString()).toBe(
      "2026-04-25T10:07:24.000Z",
    );
  });

  it("returns null for blank values", () => {
    expect(parseByrPostedAt("")).toBeNull();
  });
});

describe("mapSyncPayload", () => {
  it("normalizes the real byr sync updates payload", () => {
    const batch = mapSyncPayload({
      board_name: "IWhisper",
      threads: [
        {
          article_id: "8830220",
          title: "Need advice",
          reply_count: 1,
          posts: [
            {
              post_id: "8830220",
              floor_label: "楼主",
              author_display_name: "Alice",
              posted_at: "Sat Apr 25 18:07:24 2026",
              body: "Opening post",
            },
            {
              post_id: "p-2",
              floor_label: "第1楼",
              author_display_name: "Robot B",
              posted_at: "Sat Apr 25 18:10:00 2026",
              body: "Reply body",
            },
          ],
        },
      ],
    });

    expect(batch.sourceType).toBe("byr_sync_api");
    expect(batch.sourceLabel).toBe("IWhisper");
    expect(batch.boards).toEqual([
      {
        slug: "iwhisper",
        name: "IWhisper",
        description: "",
      },
    ]);
    expect(batch.botUsers).toEqual([
      {
        username: "Alice",
        displayName: "Alice",
        mailboxKey: null,
      },
      {
        username: "Robot B",
        displayName: "Robot B",
        mailboxKey: null,
      },
    ]);
    expect(batch.threads[0]).toMatchObject({
      sourceBoardSlug: "iwhisper",
      sourceThreadId: "8830220",
      authorUsername: "Alice",
      title: "Need advice",
      body: "Opening post",
      publishedAt: new Date("2026-04-25T10:07:24.000Z"),
      replyCount: 1,
    });
    expect(batch.replies.map((reply) => reply.replyIndex)).toEqual([1]);
    expect(batch.replies[0]).toMatchObject({
      sourceBoardSlug: "iwhisper",
      sourceThreadId: "8830220",
      authorUsername: "Robot B",
      body: "Reply body",
      publishedAt: new Date("2026-04-25T10:10:00.000Z"),
    });
  });

  it("uses the display name as the stable author username fallback", () => {
    const batch = mapSyncPayload({
      board_name: "IWhisper",
      threads: [
        {
          article_id: "8830221",
          title: "Another thread",
          reply_count: 1,
          posts: [
            {
              post_id: "p-1",
              floor_label: "楼主",
              author_display_name: "Alice",
              posted_at: "Sat Apr 25 18:07:24 2026",
              body: "Opening post",
            },
          ],
        },
      ],
    });

    expect(batch.botUsers[0]).toEqual({
      username: "Alice",
      displayName: "Alice",
      mailboxKey: null,
    });
    expect(batch.threads[0]?.authorUsername).toBe("Alice");
    expect(batch.threads[0]?.body).toBe("Opening post");
    expect(batch.threads[0]?.replyCount).toBe(1);
    expect(batch.replies).toEqual([]);
  });

  it("maps real byr floor labels into original post plus replies", () => {
    const batch = mapSyncPayload({
      board_name: "IWhisper",
      threads: [
        {
          article_id: "8830222",
          title: "Real floor labels",
          reply_count: 28,
          posts: [
            {
              post_id: "8830222",
              floor_label: "楼主",
              author_display_name: "IWhisper#796",
              posted_at: "Sat Apr 25 18:07:24 2026",
              body: "Opening body",
            },
            {
              post_id: "8831211",
              floor_label: "第9楼",
              author_display_name: "IWhisper#897",
              posted_at: "Sun Apr 26 13:25:36 2026",
              body: "Reply body",
            },
          ],
        },
      ],
    });

    expect(batch.threads[0]).toMatchObject({
      authorUsername: "IWhisper#796",
      body: "Opening body",
      replyCount: 28,
    });
    expect(batch.replies).toEqual([
      expect.objectContaining({
        replyIndex: 9,
        authorUsername: "IWhisper#897",
        body: "Reply body",
      }),
    ]);
  });

  it("preserves the legacy alias", () => {
    const payload = {
      board_name: "IWhisper",
      threads: [],
    };

    expect(mapByrSyncPayload(payload)).toEqual(mapSyncPayload(payload));
  });
});

describe("importSyncBatch", () => {
  it("imports records and skips existing replies", async () => {
    const prisma = createMockPrisma();

    prisma.state.replies.set("thread-1:1", {
      id: "reply-existing",
      threadId: "thread-1",
      replyIndex: 1,
    });

    const result = await importSyncBatch(prisma as any, {
      sourceType: "byr_sync_api",
      sourceLabel: "IWhisper",
      boards: [
        {
          slug: "iwhisper",
          name: "IWhisper",
          description: "",
        },
      ],
      botUsers: [
        {
          username: "Alice",
          displayName: "Alice",
          mailboxKey: null,
        },
        {
          username: "Robot B",
          displayName: "Robot B",
          mailboxKey: null,
        },
      ],
      threads: [
        {
          sourceBoardSlug: "iwhisper",
          sourceThreadId: "8830220",
          authorUsername: "Alice",
          title: "Need advice",
          body: "Opening post",
          publishedAt: new Date("2026-05-02T08:00:00.000Z"),
          replyCount: 1,
        },
      ],
      replies: [
        {
          sourceBoardSlug: "iwhisper",
          sourceThreadId: "8830220",
          replyIndex: 1,
          authorUsername: "Alice",
          body: "Opening post",
          publishedAt: new Date("2026-05-02T08:00:00.000Z"),
        },
        {
          sourceBoardSlug: "iwhisper",
          sourceThreadId: "8830220",
          replyIndex: 2,
          authorUsername: "Robot B",
          body: "Reply body",
          publishedAt: new Date("2026-05-02T08:10:00.000Z"),
        },
      ],
    });

    expect(result).toMatchObject({
      importedThreads: 1,
      importedReplies: 1,
      skippedReplies: 1,
    });
  });

  it("does not overwrite an existing thread body with a body-less incremental sync payload", async () => {
    const prisma = createMockPrisma();

    prisma.state.threads.set("iwhisper:8830220", {
      id: "thread-1",
      boardId: "board-1",
      sourceBoardSlug: "iwhisper",
      sourceThreadId: "8830220",
      authorUserId: "user-1",
      title: "Need advice",
      body: "Opening post",
      publishedAt: new Date("2026-05-02T08:00:00.000Z"),
      lastReplyAt: null,
      replyCount: 0,
    });
    prisma.state.users.set("Alice", {
      id: "user-1",
      username: "Alice",
      displayName: "Alice",
      userType: "bot",
      status: "active",
      mailboxKey: null,
    });

    const result = await importSyncBatch(prisma as any, {
      sourceType: "byr_sync_api",
      sourceLabel: "IWhisper",
      boards: [
        {
          slug: "iwhisper",
          name: "IWhisper",
          description: "",
        },
      ],
      botUsers: [
        {
          username: "Robot B",
          displayName: "Robot B",
          mailboxKey: null,
        },
      ],
      threads: [
        {
          sourceBoardSlug: "iwhisper",
          sourceThreadId: "8830220",
          authorUsername: null,
          title: "Need advice",
          body: null,
          publishedAt: null,
          replyCount: 1,
        },
      ],
      replies: [
        {
          sourceBoardSlug: "iwhisper",
          sourceThreadId: "8830220",
          replyIndex: 1,
          authorUsername: "Robot B",
          body: "Reply body",
          publishedAt: new Date("2026-05-02T08:10:00.000Z"),
        },
      ],
    });

    expect(result).toMatchObject({
      importedThreads: 1,
      importedReplies: 1,
      skippedReplies: 0,
    });
    expect(prisma.state.threads.get("iwhisper:8830220")).toMatchObject({
      authorUserId: "user-1",
      body: "Opening post",
      replyCount: 1,
    });
  });

  it("corrects an existing thread timestamp when the original post time is earlier", async () => {
    const prisma = createMockPrisma();

    prisma.state.threads.set("iwhisper:8830220", {
      id: "thread-1",
      boardId: "board-1",
      sourceBoardSlug: "iwhisper",
      sourceThreadId: "8830220",
      authorUserId: "user-1",
      title: "Need advice",
      body: "Opening post",
      publishedAt: new Date("2026-05-02T08:00:00.000Z"),
      lastReplyAt: null,
      replyCount: 0,
    });
    prisma.state.users.set("Alice", {
      id: "user-1",
      username: "Alice",
      displayName: "Alice",
      userType: "bot",
      status: "active",
      mailboxKey: null,
    });

    await importSyncBatch(prisma as any, {
      sourceType: "byr_sync_api",
      sourceLabel: "IWhisper",
      boards: [
        {
          slug: "iwhisper",
          name: "IWhisper",
          description: "",
        },
      ],
      botUsers: [
        {
          username: "Alice",
          displayName: "Alice",
          mailboxKey: null,
        },
      ],
      threads: [
        {
          sourceBoardSlug: "iwhisper",
          sourceThreadId: "8830220",
          authorUsername: "Alice",
          title: "Need advice",
          body: "Opening post",
          publishedAt: new Date("2026-04-25T10:07:24.000Z"),
          replyCount: 0,
        },
      ],
      replies: [],
    });

    expect(prisma.state.threads.get("iwhisper:8830220")).toMatchObject({
      publishedAt: new Date("2026-04-25T10:07:24.000Z"),
    });
  });
});
