import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchSyncUpdates } from "@/src/server/imports/fetchSyncUpdates";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("fetchSyncUpdates", () => {
  it("throws a clear error when sync env vars are missing", async () => {
    vi.stubEnv("BYR_SYNC_API_BASE_URL", "");
    vi.stubEnv("BYR_SYNC_API_TOKEN", "");

    await expect(fetchSyncUpdates()).rejects.toThrow(
      "Missing BYR_SYNC_API_BASE_URL or BYR_SYNC_API_TOKEN",
    );
  });

  it("throws a clear error for non-2xx responses", async () => {
    vi.stubEnv("BYR_SYNC_API_BASE_URL", "https://sync.example.test");
    vi.stubEnv("BYR_SYNC_API_TOKEN", "secret-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("bad token", { status: 401 })),
    );

    await expect(fetchSyncUpdates()).rejects.toThrow(
      "Sync API request failed: 401",
    );
  });

  it("requests the updates endpoint with the sync token", async () => {
    vi.stubEnv("BYR_SYNC_API_BASE_URL", "https://sync.example.test");
    vi.stubEnv("BYR_SYNC_API_TOKEN", "secret-token");

    const fetchMock = vi.fn(async () => {
      return Response.json({
        sourceLabel: "IWhisper updates",
        boards: [],
        botUsers: [],
        threads: [],
        replies: [],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchSyncUpdates();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://sync.example.test/api/sync/updates",
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
