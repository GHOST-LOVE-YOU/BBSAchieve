import type { ByrSyncBackfillPayload } from "./syncTypes";

function getRequiredEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : null;
}

export async function fetchSyncThreadSnapshot(input: {
  boardName: string;
  articleId: string;
  startFloor?: number;
}): Promise<ByrSyncBackfillPayload> {
  const baseUrl = getRequiredEnv("BYR_SYNC_API_BASE_URL");
  const token = getRequiredEnv("BYR_SYNC_API_TOKEN");

  if (!baseUrl || !token) {
    throw new Error("Missing BYR_SYNC_API_BASE_URL or BYR_SYNC_API_TOKEN");
  }

  const params = new URLSearchParams({
    board_name: input.boardName,
    article_id: input.articleId,
    start_floor: String(input.startFloor ?? 1),
  });
  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/api/sync/thread-snapshot?${params.toString()}`,
    {
      method: "GET",
      headers: {
        "X-Sync-Token": token,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Sync thread snapshot request failed: ${response.status}`);
  }

  return (await response.json()) as ByrSyncBackfillPayload;
}
