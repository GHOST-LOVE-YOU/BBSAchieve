import { describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  fetchSyncBackfill: vi.fn(),
  fetchSyncUpdates: vi.fn(),
  mapSyncPayload: vi.fn(),
  importSyncBatch: vi.fn(),
  prisma: {},
}));

vi.mock("@/src/server/db/client", () => ({
  prisma: routeMocks.prisma,
}));

vi.mock("@/src/server/imports/fetchSyncUpdates", () => ({
  fetchSyncUpdates: routeMocks.fetchSyncUpdates,
}));

vi.mock("@/src/server/imports/fetchSyncBackfill", () => ({
  fetchSyncBackfill: routeMocks.fetchSyncBackfill,
}));

vi.mock("@/src/server/imports/mapSyncPayload", () => ({
  mapSyncPayload: routeMocks.mapSyncPayload,
}));

vi.mock("@/src/server/imports/importSyncBatch", () => ({
  importSyncBatch: routeMocks.importSyncBatch,
}));

import { POST } from "../app/admin/api/imports/byr-sync/route";

describe("admin byr sync route", () => {
  it("imports updates and returns json", async () => {
    routeMocks.fetchSyncUpdates.mockResolvedValue({
      board_name: "IWhisper",
      threads: [],
    });
    routeMocks.fetchSyncBackfill.mockReset();
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

    expect(routeMocks.fetchSyncUpdates).toHaveBeenCalledTimes(1);
    expect(routeMocks.fetchSyncBackfill).not.toHaveBeenCalled();
    expect(routeMocks.mapSyncPayload).toHaveBeenCalledWith({
      board_name: "IWhisper",
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
    routeMocks.fetchSyncUpdates.mockResolvedValue({
      board_name: "IWhisper",
      threads: [],
    });
    routeMocks.fetchSyncBackfill.mockReset();
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

  it("backfills threads whose updates payload has no posts before importing", async () => {
    routeMocks.fetchSyncUpdates.mockResolvedValue({
      board_name: "IWhisper",
      threads: [
        {
          article_id: "8843752",
          title: "括号院盲审还有没出的吗",
          reply_count: 1,
          posts: [],
        },
      ],
    });
    routeMocks.fetchSyncBackfill.mockResolvedValue({
      article_id: "8843752",
      start_floor: 1,
      posts: [
        {
          post_id: "8843752",
          floor_label: "楼主",
          author_display_name: "IWhisper#935",
          body: "一个盲审意见都没有",
        },
        {
          post_id: "8843768",
          floor_label: "沙发",
          author_display_name: "IWhisper#129",
          body: "身边只有一个**的室友没出",
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
      importId: "import-2",
      importedThreads: 1,
      importedReplies: 1,
      skippedReplies: 0,
    });

    const response = await POST();

    expect(routeMocks.fetchSyncBackfill).toHaveBeenCalledWith({
      boardName: "IWhisper",
      articleId: "8843752",
      startFloor: 1,
    });
    expect(routeMocks.mapSyncPayload).toHaveBeenCalledWith({
      board_name: "IWhisper",
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
              body: "一个盲审意见都没有",
            },
            {
              post_id: "8843768",
              floor_label: "沙发",
              author_display_name: "IWhisper#129",
              body: "身边只有一个**的室友没出",
            },
          ],
        },
      ],
    });
    expect(response.status).toBe(200);
  });
});
