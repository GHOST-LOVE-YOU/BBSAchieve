import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  fetchSyncOriginalPost: vi.fn(),
  fetchSyncThreadSnapshot: vi.fn(),
  fetchSyncUpdates: vi.fn(),
  mapSyncPayload: vi.fn(),
  importSyncBatch: vi.fn(),
  prisma: {
    thread: {
      findUnique: vi.fn(),
    },
  },
}));

const adminAuthGuardMock = vi.hoisted(() => ({
  requireAdminRouteUser: vi.fn(),
}));

vi.mock("@/src/server/db/client", () => ({
  prisma: routeMocks.prisma,
}));

vi.mock("@/src/server/auth/routeGuards", () => ({
  requireAdminRouteUser: adminAuthGuardMock.requireAdminRouteUser,
}));

vi.mock("@/src/server/imports/fetchSyncUpdates", () => ({
  fetchSyncUpdates: routeMocks.fetchSyncUpdates,
}));

vi.mock("@/src/server/imports/fetchSyncOriginalPost", () => ({
  fetchSyncOriginalPost: routeMocks.fetchSyncOriginalPost,
}));

vi.mock("@/src/server/imports/fetchSyncThreadSnapshot", () => ({
  fetchSyncThreadSnapshot: routeMocks.fetchSyncThreadSnapshot,
}));

vi.mock("@/src/server/imports/mapSyncPayload", () => ({
  mapSyncPayload: routeMocks.mapSyncPayload,
}));

vi.mock("@/src/server/imports/importSyncBatch", () => ({
  importSyncBatch: routeMocks.importSyncBatch,
}));

import { POST } from "../app/admin/api/imports/byr-sync/route";
import { runByrSyncImport } from "../app/admin/api/imports/byr-sync/route";

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("admin byr sync route", () => {
  beforeEach(() => {
    routeMocks.fetchSyncOriginalPost.mockReset();
    routeMocks.fetchSyncThreadSnapshot.mockReset();
    routeMocks.fetchSyncUpdates.mockReset();
    routeMocks.mapSyncPayload.mockReset();
    routeMocks.importSyncBatch.mockReset();
    routeMocks.prisma.thread.findUnique.mockReset();
    adminAuthGuardMock.requireAdminRouteUser.mockReset();
    adminAuthGuardMock.requireAdminRouteUser.mockResolvedValue({
      ok: true,
      identity: {
        provider: "kinde",
        subject: "kp_admin_user",
        orgCodes: ["org_ed7de8344b99"],
      },
    });
  });

  it("returns 403 before running a manual sync when admin auth fails", async () => {
    adminAuthGuardMock.requireAdminRouteUser.mockResolvedValueOnce({
      ok: false,
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    });

    const response = await POST(
      new Request("http://localhost/admin/api/imports/byr-sync", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    expect(routeMocks.fetchSyncUpdates).not.toHaveBeenCalled();
    expect(routeMocks.importSyncBatch).not.toHaveBeenCalled();
  });

  it("imports updates and returns json", async () => {
    routeMocks.prisma.thread.findUnique.mockResolvedValue(null);
    routeMocks.fetchSyncUpdates.mockResolvedValue({
      board_name: "IWhisper",
      window_minutes: 30,
      scanned_pages: 0,
      cutoff_at: "2026-05-03T21:40:00",
      threads: [],
    });
    routeMocks.mapSyncPayload.mockReturnValue({
      sourceType: "byr_sync_api",
      sourceLabel: "IWhisper",
      boards: [
        {
          slug: "iwhisper",
          name: "IWhisper",
          description: "",
        },
      ],
      botUsers: [],
      threads: [],
      replies: [],
    });
    routeMocks.importSyncBatch.mockResolvedValue({
      importId: "import-1",
      importedThreads: 2,
      importedReplies: 3,
      skippedReplies: 0,
    });

    const response = await POST();

    expect(routeMocks.fetchSyncUpdates).toHaveBeenCalledWith({
      boardName: "IWhisper",
      windowMinutes: 30,
      limit: 20,
    });
    expect(routeMocks.fetchSyncOriginalPost).not.toHaveBeenCalled();
    expect(routeMocks.fetchSyncThreadSnapshot).not.toHaveBeenCalled();
    expect(routeMocks.mapSyncPayload).toHaveBeenCalledWith({
      board_name: "IWhisper",
      window_minutes: 30,
      scanned_pages: 0,
      cutoff_at: "2026-05-03T21:40:00",
      threads: [],
    });
    expect(routeMocks.importSyncBatch).toHaveBeenCalledWith(routeMocks.prisma, {
      sourceType: "byr_sync_api",
      sourceLabel: "IWhisper",
      boards: [
        {
          slug: "iwhisper",
          name: "IWhisper",
          description: "",
        },
      ],
      botUsers: [],
      threads: [],
      replies: [],
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      result: {
        importId: "import-1",
        importedThreads: 2,
        importedReplies: 3,
        skippedReplies: 0,
      },
    });
  });

  it("returns a 500 json response when the import fails", async () => {
    routeMocks.prisma.thread.findUnique.mockResolvedValue(null);
    routeMocks.fetchSyncUpdates.mockResolvedValue({
      board_name: "IWhisper",
      window_minutes: 30,
      scanned_pages: 0,
      cutoff_at: "2026-05-03T21:40:00",
      threads: [],
    });
    routeMocks.mapSyncPayload.mockReturnValue({
      sourceType: "byr_sync_api",
      sourceLabel: "IWhisper",
      boards: [
        {
          slug: "iwhisper",
          name: "IWhisper",
          description: "",
        },
      ],
      botUsers: [],
      threads: [],
      replies: [],
    });
    routeMocks.importSyncBatch.mockRejectedValue(new Error("boom"));

    const response = await POST();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "boom",
    });
  });

  it("redirects form submissions back to admin imports instead of rendering raw json", async () => {
    routeMocks.prisma.thread.findUnique.mockResolvedValue(null);
    routeMocks.fetchSyncUpdates.mockResolvedValue({
      board_name: "IWhisper",
      window_minutes: 30,
      scanned_pages: 0,
      cutoff_at: "2026-05-03T21:40:00",
      threads: [],
    });
    routeMocks.mapSyncPayload.mockReturnValue({
      sourceType: "byr_sync_api",
      sourceLabel: "IWhisper",
      boards: [
        {
          slug: "iwhisper",
          name: "IWhisper",
          description: "",
        },
      ],
      botUsers: [],
      threads: [],
      replies: [],
    });
    routeMocks.importSyncBatch.mockResolvedValue({
      importId: "import-3",
      importedThreads: 1,
      importedReplies: 2,
      skippedReplies: 0,
    });

    const response = await POST(
      new Request("http://localhost/admin/api/imports/byr-sync", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
        body: "redirectTo=%2Fadmin%2Fimports",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "/admin/imports?action=sync&status=succeeded",
    );
  });

  it("fills in the original post when incremental updates only include replies", async () => {
    routeMocks.prisma.thread.findUnique.mockResolvedValue({
      id: "thread-1",
      body: "",
      replyCount: 0,
    });
    routeMocks.fetchSyncUpdates.mockResolvedValue({
      board_name: "IWhisper",
      window_minutes: 30,
      scanned_pages: 1,
      cutoff_at: "2026-05-03T21:40:00",
      threads: [
        {
          article_id: "8843752",
          title: "括号院盲审还有没出的吗",
          reply_count: 1,
          posts: [
            {
              post_id: "8843768",
              floor_label: "沙发",
              author_display_name: "IWhisper#129",
              posted_at: "Sun Apr 26 10:00:00 2026",
              body: "身边只有一个**的室友没出",
            },
          ],
        },
      ],
    });
    routeMocks.fetchSyncOriginalPost.mockResolvedValue({
      post_id: "8843752",
      floor_label: "楼主",
      author_display_name: "IWhisper#935",
      posted_at: "Sun Apr 26 09:55:00 2026",
      body: "一个盲审意见都没有",
    });
    routeMocks.mapSyncPayload.mockReturnValue({
      sourceType: "byr_sync_api",
      sourceLabel: "IWhisper",
      boards: [
        {
          slug: "iwhisper",
          name: "IWhisper",
          description: "",
        },
      ],
      botUsers: [],
      threads: [],
      replies: [],
    });
    routeMocks.importSyncBatch.mockResolvedValue({
      importId: "import-2",
      importedThreads: 1,
      importedReplies: 1,
      skippedReplies: 0,
    });

    const response = await POST();

    expect(routeMocks.fetchSyncOriginalPost).toHaveBeenCalledWith({
      boardName: "IWhisper",
      articleId: "8843752",
    });
    expect(routeMocks.mapSyncPayload).toHaveBeenCalledWith({
      board_name: "IWhisper",
      window_minutes: 30,
      scanned_pages: 1,
      cutoff_at: "2026-05-03T21:40:00",
      threads: [
        {
          article_id: "8843752",
          title: "括号院盲审还有没出的吗",
          reply_count: 1,
          posts: [
            {
              post_id: "8843752",
              floor_label: "楼主",
              author_display_name: "IWhisper#935",
              posted_at: "Sun Apr 26 09:55:00 2026",
              body: "一个盲审意见都没有",
            },
            {
              post_id: "8843768",
              floor_label: "沙发",
              author_display_name: "IWhisper#129",
              posted_at: "Sun Apr 26 10:00:00 2026",
              body: "身边只有一个**的室友没出",
            },
          ],
        },
      ],
    });
    expect(response.status).toBe(200);
  });

  it("fills in the original post when updates are empty and the local thread is missing", async () => {
    routeMocks.prisma.thread.findUnique.mockResolvedValue(null);
    routeMocks.fetchSyncUpdates.mockResolvedValue({
      board_name: "IWhisper",
      window_minutes: 30,
      scanned_pages: 1,
      cutoff_at: "2026-05-03T21:40:00",
      threads: [
        {
          article_id: "8843752",
          title: "括号院盲审还有没出的吗",
          reply_count: 0,
          posts: [],
        },
      ],
    });
    routeMocks.fetchSyncOriginalPost.mockResolvedValue({
      post_id: "8843752",
      floor_label: "楼主",
      author_display_name: "IWhisper#935",
      posted_at: "Sun Apr 26 09:55:00 2026",
      body: "一个盲审意见都没有",
    });
    routeMocks.mapSyncPayload.mockReturnValue({
      sourceType: "byr_sync_api",
      sourceLabel: "IWhisper",
      boards: [
        {
          slug: "iwhisper",
          name: "IWhisper",
          description: "",
        },
      ],
      botUsers: [],
      threads: [],
      replies: [],
    });
    routeMocks.importSyncBatch.mockResolvedValue({
      importId: "import-3",
      importedThreads: 1,
      importedReplies: 0,
      skippedReplies: 0,
    });

    const response = await POST();

    expect(routeMocks.fetchSyncOriginalPost).toHaveBeenCalledWith({
      boardName: "IWhisper",
      articleId: "8843752",
    });
    expect(routeMocks.mapSyncPayload).toHaveBeenCalledWith({
      board_name: "IWhisper",
      window_minutes: 30,
      scanned_pages: 1,
      cutoff_at: "2026-05-03T21:40:00",
      threads: [
        {
          article_id: "8843752",
          title: "括号院盲审还有没出的吗",
          reply_count: 0,
          posts: [
            {
              post_id: "8843752",
              floor_label: "楼主",
              author_display_name: "IWhisper#935",
              posted_at: "Sun Apr 26 09:55:00 2026",
              body: "一个盲审意见都没有",
            },
          ],
        },
      ],
    });
    expect(response.status).toBe(200);
  });

  it("backfills missing reply gap when incoming floors start after the next expected floor", async () => {
    routeMocks.prisma.thread.findUnique.mockResolvedValue({
      id: "thread-1",
      body: "已有主贴正文",
      replyCount: 2,
    });
    routeMocks.fetchSyncUpdates.mockResolvedValue({
      board_name: "IWhisper",
      window_minutes: 30,
      scanned_pages: 1,
      cutoff_at: "2026-05-03T21:40:00",
      threads: [
        {
          article_id: "8843915",
          title: "缺口补拉测试",
          reply_count: 6,
          posts: [
            {
              post_id: "p5",
              floor_label: "第5楼",
              author_display_name: "IWhisper#555",
              posted_at: "Sun May 3 00:10:00 2026",
              body: "reply 5",
            },
            {
              post_id: "p6",
              floor_label: "第6楼",
              author_display_name: "IWhisper#666",
              posted_at: "Sun May 3 00:11:00 2026",
              body: "reply 6",
            },
          ],
        },
      ],
    });
    routeMocks.fetchSyncThreadSnapshot.mockResolvedValue({
      article_id: "8843915",
      start_floor: 3,
      posts: [
        {
          post_id: "p3",
          floor_label: "第3楼",
          author_display_name: "IWhisper#333",
          posted_at: "Sun May 3 00:08:00 2026",
          body: "reply 3",
        },
        {
          post_id: "p4",
          floor_label: "第4楼",
          author_display_name: "IWhisper#444",
          posted_at: "Sun May 3 00:09:00 2026",
          body: "reply 4",
        },
        {
          post_id: "p5",
          floor_label: "第5楼",
          author_display_name: "IWhisper#555",
          posted_at: "Sun May 3 00:10:00 2026",
          body: "reply 5",
        },
        {
          post_id: "p6",
          floor_label: "第6楼",
          author_display_name: "IWhisper#666",
          posted_at: "Sun May 3 00:11:00 2026",
          body: "reply 6",
        },
      ],
    });
    routeMocks.mapSyncPayload.mockReturnValue({
      sourceType: "byr_sync_api",
      sourceLabel: "IWhisper",
      boards: [
        {
          slug: "iwhisper",
          name: "IWhisper",
          description: "",
        },
      ],
      botUsers: [],
      threads: [],
      replies: [],
    });
    routeMocks.importSyncBatch.mockResolvedValue({
      importId: "import-4",
      importedThreads: 1,
      importedReplies: 3,
      skippedReplies: 0,
    });

    const response = await POST();

    expect(routeMocks.fetchSyncThreadSnapshot).toHaveBeenCalledWith({
      boardName: "IWhisper",
      articleId: "8843915",
      startFloor: 3,
    });
    expect(routeMocks.fetchSyncOriginalPost).not.toHaveBeenCalled();
    expect(routeMocks.mapSyncPayload).toHaveBeenCalledWith({
      board_name: "IWhisper",
      window_minutes: 30,
      scanned_pages: 1,
      cutoff_at: "2026-05-03T21:40:00",
      threads: [
        {
          article_id: "8843915",
          title: "缺口补拉测试",
          reply_count: 6,
          posts: [
            {
              post_id: "p3",
              floor_label: "第3楼",
              author_display_name: "IWhisper#333",
              posted_at: "Sun May 3 00:08:00 2026",
              body: "reply 3",
            },
            {
              post_id: "p4",
              floor_label: "第4楼",
              author_display_name: "IWhisper#444",
              posted_at: "Sun May 3 00:09:00 2026",
              body: "reply 4",
            },
            {
              post_id: "p5",
              floor_label: "第5楼",
              author_display_name: "IWhisper#555",
              posted_at: "Sun May 3 00:10:00 2026",
              body: "reply 5",
            },
            {
              post_id: "p6",
              floor_label: "第6楼",
              author_display_name: "IWhisper#666",
              posted_at: "Sun May 3 00:11:00 2026",
              body: "reply 6",
            },
          ],
        },
      ],
    });
    expect(response.status).toBe(200);
  });

  it("backfills replies when updates contain no posts and the local thread is behind", async () => {
    routeMocks.prisma.thread.findUnique.mockResolvedValue({
      id: "thread-1",
      body: "已有主贴正文",
      replyCount: 2,
    });
    routeMocks.fetchSyncUpdates.mockResolvedValue({
      board_name: "IWhisper",
      window_minutes: 30,
      scanned_pages: 1,
      cutoff_at: "2026-05-03T21:40:00",
      threads: [
        {
          article_id: "8843915",
          title: "空增量补拉测试",
          reply_count: 4,
          posts: [],
        },
      ],
    });
    routeMocks.fetchSyncThreadSnapshot.mockResolvedValue({
      article_id: "8843915",
      start_floor: 3,
      posts: [
        {
          post_id: "p3",
          floor_label: "第3楼",
          author_display_name: "IWhisper#333",
          posted_at: "Sun May 3 00:08:00 2026",
          body: "reply 3",
        },
        {
          post_id: "p4",
          floor_label: "第4楼",
          author_display_name: "IWhisper#444",
          posted_at: "Sun May 3 00:09:00 2026",
          body: "reply 4",
        },
      ],
    });
    routeMocks.mapSyncPayload.mockReturnValue({
      sourceType: "byr_sync_api",
      sourceLabel: "IWhisper",
      boards: [
        {
          slug: "iwhisper",
          name: "IWhisper",
          description: "",
        },
      ],
      botUsers: [],
      threads: [],
      replies: [],
    });
    routeMocks.importSyncBatch.mockResolvedValue({
      importId: "import-5a",
      importedThreads: 1,
      importedReplies: 2,
      skippedReplies: 0,
    });

    const response = await POST();

    expect(routeMocks.fetchSyncThreadSnapshot).toHaveBeenCalledWith({
      boardName: "IWhisper",
      articleId: "8843915",
      startFloor: 3,
    });
    expect(routeMocks.fetchSyncOriginalPost).not.toHaveBeenCalled();
    expect(routeMocks.mapSyncPayload).toHaveBeenCalledWith({
      board_name: "IWhisper",
      window_minutes: 30,
      scanned_pages: 1,
      cutoff_at: "2026-05-03T21:40:00",
      threads: [
        {
          article_id: "8843915",
          title: "空增量补拉测试",
          reply_count: 4,
          posts: [
            {
              post_id: "p3",
              floor_label: "第3楼",
              author_display_name: "IWhisper#333",
              posted_at: "Sun May 3 00:08:00 2026",
              body: "reply 3",
            },
            {
              post_id: "p4",
              floor_label: "第4楼",
              author_display_name: "IWhisper#444",
              posted_at: "Sun May 3 00:09:00 2026",
              body: "reply 4",
            },
          ],
        },
      ],
    });
    expect(response.status).toBe(200);
  });

  it("backfills a missing thread from floor 1 when updates contain no posts", async () => {
    routeMocks.prisma.thread.findUnique.mockResolvedValue(null);
    routeMocks.fetchSyncUpdates.mockResolvedValue({
      board_name: "IWhisper",
      window_minutes: 30,
      scanned_pages: 1,
      cutoff_at: "2026-05-03T21:40:00",
      threads: [
        {
          article_id: "8843915",
          title: "首次导入空增量测试",
          reply_count: 2,
          posts: [],
        },
      ],
    });
    routeMocks.fetchSyncThreadSnapshot.mockResolvedValue({
      article_id: "8843915",
      start_floor: 1,
      posts: [
        {
          post_id: "8843915",
          floor_label: "楼主",
          author_display_name: "IWhisper#111",
          posted_at: "Sun May 3 00:07:00 2026",
          body: "opening post",
        },
        {
          post_id: "p1",
          floor_label: "第1楼",
          author_display_name: "IWhisper#222",
          posted_at: "Sun May 3 00:08:00 2026",
          body: "reply 1",
        },
        {
          post_id: "p2",
          floor_label: "第2楼",
          author_display_name: "IWhisper#333",
          posted_at: "Sun May 3 00:09:00 2026",
          body: "reply 2",
        },
      ],
    });
    routeMocks.mapSyncPayload.mockReturnValue({
      sourceType: "byr_sync_api",
      sourceLabel: "IWhisper",
      boards: [
        {
          slug: "iwhisper",
          name: "IWhisper",
          description: "",
        },
      ],
      botUsers: [],
      threads: [],
      replies: [],
    });
    routeMocks.importSyncBatch.mockResolvedValue({
      importId: "import-5b",
      importedThreads: 1,
      importedReplies: 2,
      skippedReplies: 0,
    });

    const response = await POST();

    expect(routeMocks.fetchSyncThreadSnapshot).toHaveBeenCalledWith({
      boardName: "IWhisper",
      articleId: "8843915",
      startFloor: 1,
    });
    expect(routeMocks.fetchSyncOriginalPost).not.toHaveBeenCalled();
    expect(routeMocks.mapSyncPayload).toHaveBeenCalledWith({
      board_name: "IWhisper",
      window_minutes: 30,
      scanned_pages: 1,
      cutoff_at: "2026-05-03T21:40:00",
      threads: [
        {
          article_id: "8843915",
          title: "首次导入空增量测试",
          reply_count: 2,
          posts: [
            {
              post_id: "8843915",
              floor_label: "楼主",
              author_display_name: "IWhisper#111",
              posted_at: "Sun May 3 00:07:00 2026",
              body: "opening post",
            },
            {
              post_id: "p1",
              floor_label: "第1楼",
              author_display_name: "IWhisper#222",
              posted_at: "Sun May 3 00:08:00 2026",
              body: "reply 1",
            },
            {
              post_id: "p2",
              floor_label: "第2楼",
              author_display_name: "IWhisper#333",
              posted_at: "Sun May 3 00:09:00 2026",
              body: "reply 2",
            },
          ],
        },
      ],
    });
    expect(response.status).toBe(200);
  });

  it("does not backfill when updates contain no posts but local reply count is already caught up", async () => {
    routeMocks.prisma.thread.findUnique.mockResolvedValue({
      id: "thread-1",
      body: "已有主贴正文",
      replyCount: 3,
    });
    routeMocks.fetchSyncUpdates.mockResolvedValue({
      board_name: "IWhisper",
      window_minutes: 30,
      scanned_pages: 1,
      cutoff_at: "2026-05-03T21:40:00",
      threads: [
        {
          article_id: "8843915",
          title: "工程硕博真的性价比高",
          reply_count: 3,
          posts: [],
        },
      ],
    });
    routeMocks.mapSyncPayload.mockReturnValue({
      sourceType: "byr_sync_api",
      sourceLabel: "IWhisper",
      boards: [
        {
          slug: "iwhisper",
          name: "IWhisper",
          description: "",
        },
      ],
      botUsers: [],
      threads: [],
      replies: [],
    });
    routeMocks.importSyncBatch.mockResolvedValue({
      importId: "import-5",
      importedThreads: 1,
      importedReplies: 0,
      skippedReplies: 0,
    });

    const response = await POST();

    expect(routeMocks.fetchSyncThreadSnapshot).not.toHaveBeenCalled();
    expect(routeMocks.fetchSyncOriginalPost).not.toHaveBeenCalled();
    expect(routeMocks.mapSyncPayload).toHaveBeenCalledWith({
      board_name: "IWhisper",
      window_minutes: 30,
      scanned_pages: 1,
      cutoff_at: "2026-05-03T21:40:00",
      threads: [
        {
          article_id: "8843915",
          title: "工程硕博真的性价比高",
          reply_count: 3,
          posts: [],
        },
      ],
    });
    expect(response.status).toBe(200);
  });

  it("does not backfill when incoming floors continue exactly from the next expected floor", async () => {
    routeMocks.prisma.thread.findUnique.mockResolvedValue({
      id: "thread-1",
      body: "已有主贴正文",
      replyCount: 2,
    });
    routeMocks.fetchSyncUpdates.mockResolvedValue({
      board_name: "IWhisper",
      window_minutes: 30,
      scanned_pages: 1,
      cutoff_at: "2026-05-03T21:40:00",
      threads: [
        {
          article_id: "8843915",
          title: "连续楼层测试",
          reply_count: 4,
          posts: [
            {
              post_id: "p3",
              floor_label: "第3楼",
              author_display_name: "IWhisper#333",
              posted_at: "Sun May 3 00:08:00 2026",
              body: "reply 3",
            },
            {
              post_id: "p4",
              floor_label: "第4楼",
              author_display_name: "IWhisper#444",
              posted_at: "Sun May 3 00:09:00 2026",
              body: "reply 4",
            },
          ],
        },
      ],
    });
    routeMocks.mapSyncPayload.mockReturnValue({
      sourceType: "byr_sync_api",
      sourceLabel: "IWhisper",
      boards: [
        {
          slug: "iwhisper",
          name: "IWhisper",
          description: "",
        },
      ],
      botUsers: [],
      threads: [],
      replies: [],
    });
    routeMocks.importSyncBatch.mockResolvedValue({
      importId: "import-6",
      importedThreads: 1,
      importedReplies: 2,
      skippedReplies: 0,
    });

    const response = await POST();

    expect(routeMocks.fetchSyncThreadSnapshot).not.toHaveBeenCalled();
    expect(routeMocks.fetchSyncOriginalPost).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });

  it("looks up existing threads using the actual board slug for non-IWhisper boards", async () => {
    routeMocks.prisma.thread.findUnique.mockResolvedValue({
      id: "thread-job-1",
      body: "已有主贴正文",
      replyCount: 1,
    });
    routeMocks.fetchSyncUpdates.mockResolvedValue({
      board_name: "JobInfo",
      window_minutes: 180,
      scanned_pages: 1,
      cutoff_at: "2026-05-03T21:40:00",
      threads: [
        {
          article_id: "3001",
          title: "JobInfo continuity",
          reply_count: 1,
          posts: [
            {
              post_id: "p1",
              floor_label: "第1楼",
              author_display_name: "JobInfo#001",
              posted_at: "Sun May 3 00:08:00 2026",
              body: "reply 1",
            },
          ],
        },
      ],
    });
    routeMocks.mapSyncPayload.mockReturnValue({
      sourceType: "byr_sync_api",
      sourceLabel: "JobInfo",
      boards: [
        {
          slug: "job-info",
          name: "JobInfo",
          description: "",
        },
      ],
      botUsers: [],
      threads: [],
      replies: [],
    });
    routeMocks.importSyncBatch.mockResolvedValue({
      importId: "import-job-1",
      importedThreads: 1,
      importedReplies: 1,
      skippedReplies: 0,
    });

    const result = await runByrSyncImport({
      prisma: routeMocks.prisma as never,
      boardName: "JobInfo",
      windowMinutes: 180,
    });

    expect(routeMocks.fetchSyncUpdates).toHaveBeenCalledWith({
      boardName: "JobInfo",
      windowMinutes: 180,
      limit: 20,
    });
    expect(routeMocks.prisma.thread.findUnique).toHaveBeenCalledWith({
      where: {
        sourceBoardSlug_sourceThreadId: {
          sourceBoardSlug: "job-info",
          sourceThreadId: "3001",
        },
      },
      select: {
        id: true,
        body: true,
        replyCount: true,
      },
    });
    expect(result).toEqual({
      importId: "import-job-1",
      importedThreads: 1,
      importedReplies: 1,
      skippedReplies: 0,
    });
  });

  it("passes an explicit unbounded limit through the shared sync import path", async () => {
    routeMocks.prisma.thread.findUnique.mockResolvedValue(null);
    routeMocks.fetchSyncUpdates.mockResolvedValue({
      board_name: "JobInfo",
      window_minutes: 60 * 24 * 365 * 30,
      scanned_pages: 3,
      cutoff_at: "2026-05-03T21:40:00",
      threads: [],
    });
    routeMocks.mapSyncPayload.mockReturnValue({
      sourceType: "byr_sync_api",
      sourceLabel: "JobInfo",
      boards: [
        {
          slug: "job-info",
          name: "JobInfo",
          description: "",
        },
      ],
      botUsers: [],
      threads: [],
      replies: [],
    });
    routeMocks.importSyncBatch.mockResolvedValue({
      importId: "import-job-2",
      importedThreads: 0,
      importedReplies: 0,
      skippedReplies: 0,
    });

    await runByrSyncImport({
      prisma: routeMocks.prisma as never,
      boardName: "JobInfo",
      windowMinutes: 60 * 24 * 365 * 30,
      limit: null,
    });

    expect(routeMocks.fetchSyncUpdates).toHaveBeenCalledWith({
      boardName: "JobInfo",
      windowMinutes: 60 * 24 * 365 * 30,
      limit: null,
    });
  });

  it("enriches threads serially so later thread lookups wait for earlier ones", async () => {
    const firstLookup = createDeferred<{
      id: string;
      body: string;
      replyCount: number;
    } | null>();

    routeMocks.prisma.thread.findUnique
      .mockImplementationOnce(() => firstLookup.promise)
      .mockResolvedValueOnce(null);
    routeMocks.fetchSyncUpdates.mockResolvedValue({
      board_name: "IWhisper",
      window_minutes: 30,
      scanned_pages: 1,
      cutoff_at: "2026-05-03T21:40:00",
      threads: [
        {
          article_id: "t-1",
          title: "first thread",
          reply_count: 0,
          posts: [
            {
              post_id: "t-1-op",
              floor_label: "楼主",
              author_display_name: "IWhisper#001",
              posted_at: "Sun May 3 00:00:00 2026",
              body: "opening 1",
            },
          ],
        },
        {
          article_id: "t-2",
          title: "second thread",
          reply_count: 0,
          posts: [
            {
              post_id: "t-2-op",
              floor_label: "楼主",
              author_display_name: "IWhisper#002",
              posted_at: "Sun May 3 00:01:00 2026",
              body: "opening 2",
            },
          ],
        },
      ],
    });
    routeMocks.mapSyncPayload.mockReturnValue({
      sourceType: "byr_sync_api",
      sourceLabel: "IWhisper",
      boards: [
        {
          slug: "iwhisper",
          name: "IWhisper",
          description: "",
        },
      ],
      botUsers: [],
      threads: [],
      replies: [],
    });
    routeMocks.importSyncBatch.mockResolvedValue({
      importId: "import-serial",
      importedThreads: 2,
      importedReplies: 0,
      skippedReplies: 0,
    });

    const importPromise = runByrSyncImport({
      prisma: routeMocks.prisma as never,
      boardName: "IWhisper",
      windowMinutes: 30,
    });

    await Promise.resolve();

    expect(routeMocks.prisma.thread.findUnique).toHaveBeenCalledTimes(1);
    expect(routeMocks.prisma.thread.findUnique).toHaveBeenNthCalledWith(1, {
      where: {
        sourceBoardSlug_sourceThreadId: {
          sourceBoardSlug: "iwhisper",
          sourceThreadId: "t-1",
        },
      },
      select: {
        id: true,
        body: true,
        replyCount: true,
      },
    });

    firstLookup.resolve(null);

    await importPromise;

    expect(routeMocks.prisma.thread.findUnique).toHaveBeenCalledTimes(2);
    expect(routeMocks.prisma.thread.findUnique).toHaveBeenNthCalledWith(2, {
      where: {
        sourceBoardSlug_sourceThreadId: {
          sourceBoardSlug: "iwhisper",
          sourceThreadId: "t-2",
        },
      },
      select: {
        id: true,
        body: true,
        replyCount: true,
      },
    });
  });
});
