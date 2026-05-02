import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchSyncThreadSnapshot } from "@/src/server/imports/fetchSyncThreadSnapshot";

describe("fetchSyncThreadSnapshot", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("rejects when required env vars are missing", async () => {
    vi.stubEnv("BYR_SYNC_API_BASE_URL", "");
    vi.stubEnv("BYR_SYNC_API_TOKEN", "");

    await expect(
      fetchSyncThreadSnapshot({ boardName: "IWhisper", articleId: "8843915", startFloor: 1 }),
    ).rejects.toThrow("Missing BYR_SYNC_API_BASE_URL or BYR_SYNC_API_TOKEN");
  });

  it("requests the thread snapshot endpoint with the sync token", async () => {
    vi.stubEnv("BYR_SYNC_API_BASE_URL", "https://sync.example.test");
    vi.stubEnv("BYR_SYNC_API_TOKEN", "secret-token");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            article_id: "8843915",
            start_floor: 1,
            posts: [],
          }),
          { status: 200 },
        ),
      );

    await fetchSyncThreadSnapshot({
      boardName: "IWhisper",
      articleId: "8843915",
      startFloor: 1,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://sync.example.test/api/sync/thread-snapshot?board_name=IWhisper&article_id=8843915&start_floor=1",
      {
        method: "GET",
        headers: {
          "X-Sync-Token": "secret-token",
        },
        cache: "no-store",
      },
    );
  });
});
