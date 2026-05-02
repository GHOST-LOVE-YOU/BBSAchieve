import { describe, expect, it, vi, afterEach } from "vitest";

import { fetchSyncOriginalPost } from "@/src/server/imports/fetchSyncOriginalPost";

describe("fetchSyncOriginalPost", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("rejects when required env vars are missing", async () => {
    vi.stubEnv("BYR_SYNC_API_BASE_URL", "");
    vi.stubEnv("BYR_SYNC_API_TOKEN", "");

    await expect(
      fetchSyncOriginalPost({ boardName: "IWhisper", articleId: "8843752" }),
    ).rejects.toThrow("Missing BYR_SYNC_API_BASE_URL or BYR_SYNC_API_TOKEN");
  });

  it("requests the original post endpoint with the sync token", async () => {
    vi.stubEnv("BYR_SYNC_API_BASE_URL", "https://sync.example.test");
    vi.stubEnv("BYR_SYNC_API_TOKEN", "secret-token");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            post_id: "8843752",
            floor_label: "楼主",
            author_display_name: "IWhisper#935",
            posted_at: "Sun Apr 26 09:55:00 2026",
            body: "一个盲审意见都没有",
          }),
          { status: 200 },
        ),
      );

    await fetchSyncOriginalPost({ boardName: "IWhisper", articleId: "8843752" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://sync.example.test/api/sync/thread-original-post?board_name=IWhisper&article_id=8843752",
      {
        method: "GET",
        headers: {
          "X-Sync-Token": "secret-token",
        },
        cache: "no-store",
      },
    );
  });

  it("throws when the original post endpoint returns a non-200 response", async () => {
    vi.stubEnv("BYR_SYNC_API_BASE_URL", "https://sync.example.test");
    vi.stubEnv("BYR_SYNC_API_TOKEN", "secret-token");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 500 }));

    await expect(
      fetchSyncOriginalPost({ boardName: "IWhisper", articleId: "8843752" }),
    ).rejects.toThrow("Sync original post request failed: 500");
  });
});
