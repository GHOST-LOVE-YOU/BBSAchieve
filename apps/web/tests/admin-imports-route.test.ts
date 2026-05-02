import { describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
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
      sourceLabel: "IWhisper updates",
      boards: [],
      botUsers: [],
      threads: [],
      replies: [],
    });
    routeMocks.mapSyncPayload.mockReturnValue({
      sourceType: "byr_sync_api",
      sourceLabel: "IWhisper updates",
      boards: [],
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
    expect(routeMocks.mapSyncPayload).toHaveBeenCalledWith({
      sourceLabel: "IWhisper updates",
      boards: [],
      botUsers: [],
      threads: [],
      replies: [],
    });
    expect(routeMocks.importSyncBatch).toHaveBeenCalledWith(routeMocks.prisma, {
      sourceType: "byr_sync_api",
      sourceLabel: "IWhisper updates",
      boards: [],
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
      sourceLabel: "IWhisper updates",
      boards: [],
      botUsers: [],
      threads: [],
      replies: [],
    });
    routeMocks.mapSyncPayload.mockReturnValue({
      sourceType: "byr_sync_api",
      sourceLabel: "IWhisper updates",
      boards: [],
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
});
