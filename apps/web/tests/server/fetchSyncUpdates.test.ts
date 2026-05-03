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

    await expect(
      fetchSyncUpdates({ boardName: "IWhisper", windowMinutes: 30 }),
    ).rejects.toThrow(
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

    await expect(
      fetchSyncUpdates({ boardName: "IWhisper", windowMinutes: 30 }),
    ).rejects.toThrow(
      "Sync API request failed: 401",
    );
  });

  it("requests the updates endpoint with the sync token", async () => {
    vi.stubEnv("BYR_SYNC_API_BASE_URL", "https://sync.example.test");
    vi.stubEnv("BYR_SYNC_API_TOKEN", "secret-token");

    const fetchMock = vi.fn(async () => {
      return Response.json({
        board_name: "IWhisper",
        window_minutes: 30,
        scanned_pages: 2,
        cutoff_at: "2026-05-03T21:40:00",
        threads: [],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchSyncUpdates({ boardName: "IWhisper", windowMinutes: 30 });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://sync.example.test/api/sync/updates?board_name=IWhisper&window_minutes=30",
      {
        cache: "no-store",
        method: "GET",
        headers: {
          "X-Sync-Token": "secret-token",
        },
      },
    );
  });

  it("requests the updates endpoint with board and window query params", async () => {
    vi.stubEnv("BYR_SYNC_API_BASE_URL", "https://sync.example.test");
    vi.stubEnv("BYR_SYNC_API_TOKEN", "secret-token");

    const fetchMock = vi.fn(async () =>
      Response.json({
        board_name: "IWhisper",
        window_minutes: 30,
        scanned_pages: 2,
        cutoff_at: "2026-05-03T21:40:00",
        threads: [],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchSyncUpdates({
      boardName: "IWhisper",
      windowMinutes: 30,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://sync.example.test/api/sync/updates?board_name=IWhisper&window_minutes=30",
      {
        cache: "no-store",
        method: "GET",
        headers: { "X-Sync-Token": "secret-token" },
      },
    );
    expect(result).toEqual({
      board_name: "IWhisper",
      window_minutes: 30,
      scanned_pages: 2,
      cutoff_at: "2026-05-03T21:40:00",
      threads: [],
    });
  });
});
