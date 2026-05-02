import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchSyncBackfill } from "@/src/server/imports/fetchSyncBackfill";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("fetchSyncBackfill", () => {
  it("throws a clear error when sync env vars are missing", async () => {
    vi.stubEnv("BYR_SYNC_API_BASE_URL", "");
    vi.stubEnv("BYR_SYNC_API_TOKEN", "");

    await expect(
      fetchSyncBackfill({
        boardName: "IWhisper",
        articleId: "8843752",
      }),
    ).rejects.toThrow("Missing BYR_SYNC_API_BASE_URL or BYR_SYNC_API_TOKEN");
  });

  it("throws a clear error for non-2xx responses", async () => {
    vi.stubEnv("BYR_SYNC_API_BASE_URL", "https://sync.example.test");
    vi.stubEnv("BYR_SYNC_API_TOKEN", "secret-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("bad token", { status: 500 })),
    );

    await expect(
      fetchSyncBackfill({
        boardName: "IWhisper",
        articleId: "8843752",
      }),
    ).rejects.toThrow("Sync backfill request failed: 500");
  });

  it("requests the backfill endpoint with query params and token", async () => {
    vi.stubEnv("BYR_SYNC_API_BASE_URL", "https://sync.example.test");
    vi.stubEnv("BYR_SYNC_API_TOKEN", "secret-token");

    const fetchMock = vi.fn(async () =>
      Response.json({
        article_id: "8843752",
        start_floor: 1,
        posts: [],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchSyncBackfill({
      boardName: "IWhisper",
      articleId: "8843752",
      startFloor: 1,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://sync.example.test/api/sync/backfill?board_name=IWhisper&article_id=8843752&start_floor=1",
      {
        cache: "no-store",
        method: "GET",
        headers: {
          "X-Sync-Token": "secret-token",
        },
      },
    );
  });
});
