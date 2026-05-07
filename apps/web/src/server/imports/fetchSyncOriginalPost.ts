import type { ByrSyncPostPayload } from "./syncTypes";

export class SyncOriginalPostNotFoundError extends Error {
  constructor(message = "Original post not found") {
    super(message);
    this.name = "SyncOriginalPostNotFoundError";
  }
}

export function isSyncOriginalPostNotFoundError(
  error: unknown,
): error is SyncOriginalPostNotFoundError {
  return error instanceof SyncOriginalPostNotFoundError;
}

function getRequiredEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : null;
}

async function readErrorDetail(response: Response): Promise<string | null> {
  const text = await response.text();
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return null;
  }

  try {
    const payload = JSON.parse(trimmed) as unknown;
    if (
      payload &&
      typeof payload === "object" &&
      "detail" in payload &&
      typeof payload.detail === "string" &&
      payload.detail.trim().length > 0
    ) {
      return payload.detail.trim();
    }
  } catch {
    // Fall through to returning a text preview below.
  }

  return trimmed.slice(0, 240);
}

export async function fetchSyncOriginalPost(input: {
  boardName: string;
  articleId: string;
}): Promise<ByrSyncPostPayload> {
  const baseUrl = getRequiredEnv("BYR_SYNC_API_BASE_URL");
  const token = getRequiredEnv("BYR_SYNC_API_TOKEN");

  if (!baseUrl || !token) {
    throw new Error("Missing BYR_SYNC_API_BASE_URL or BYR_SYNC_API_TOKEN");
  }

  const params = new URLSearchParams({
    board_name: input.boardName,
    article_id: input.articleId,
  });
  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/api/sync/thread-original-post?${params.toString()}`,
    {
      method: "GET",
      headers: {
        "X-Sync-Token": token,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    if (response.status === 400 && detail === "Original post not found") {
      throw new SyncOriginalPostNotFoundError(
        `Original post not found for board ${input.boardName} article ${input.articleId}`,
      );
    }
    throw new Error(
      `Sync original post request failed: ${response.status}${
        detail ? `; detail: ${detail}` : ""
      }`,
    );
  }

  return (await response.json()) as ByrSyncPostPayload;
}
