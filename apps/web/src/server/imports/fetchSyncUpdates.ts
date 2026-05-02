import type { ByrSyncPayload } from "./syncTypes";

function getRequiredEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : null;
}

export async function fetchSyncUpdates(): Promise<ByrSyncPayload> {
  const baseUrl = getRequiredEnv("BYR_SYNC_API_BASE_URL");
  const token = getRequiredEnv("BYR_SYNC_API_TOKEN");

  if (!baseUrl || !token) {
    throw new Error("Missing BYR_SYNC_API_BASE_URL or BYR_SYNC_API_TOKEN");
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/sync/updates`, {
    method: "GET",
    headers: {
      "X-Sync-Token": token,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Sync API request failed: ${response.status}`);
  }

  return (await response.json()) as ByrSyncPayload;
}
