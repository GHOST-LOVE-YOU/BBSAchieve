import type { ByrSyncUpdatesPayload } from "./syncTypes";

function getRequiredEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : null;
}

function describeFetchCause(error: unknown): string | null {
  if (!(error instanceof Error) || !("cause" in error)) {
    return null;
  }
  const cause = error.cause;
  if (cause instanceof Error) {
    return cause.message;
  }
  if (typeof cause === "string" && cause.trim().length > 0) {
    return cause;
  }
  return null;
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

export async function fetchSyncUpdates(input: {
  boardName: string;
  windowMinutes: number;
  limit?: number | null;
}): Promise<ByrSyncUpdatesPayload> {
  const baseUrl = getRequiredEnv("BYR_SYNC_API_BASE_URL");
  const token = getRequiredEnv("BYR_SYNC_API_TOKEN");

  if (!baseUrl || !token) {
    throw new Error("Missing BYR_SYNC_API_BASE_URL or BYR_SYNC_API_TOKEN");
  }

  const params = new URLSearchParams({
    board_name: input.boardName,
    window_minutes: String(input.windowMinutes),
  });
  if (input.limit != null) {
    params.set("limit", String(input.limit));
  }

  const url = `${baseUrl.replace(/\/$/, "")}/api/sync/updates?${params.toString()}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Sync-Token": token,
      },
      cache: "no-store",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown fetch error";
    const cause = describeFetchCause(error);
    throw new Error(
      `Sync API fetch failed for board ${input.boardName} at ${url}: ${message}${
        cause ? `; cause: ${cause}` : ""
      }`,
      { cause: error },
    );
  }

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    throw new Error(
      `Sync API request failed for board ${input.boardName}: ${response.status}${
        detail ? `; detail: ${detail}` : ""
      }`,
    );
  }

  return (await response.json()) as ByrSyncUpdatesPayload;
}
