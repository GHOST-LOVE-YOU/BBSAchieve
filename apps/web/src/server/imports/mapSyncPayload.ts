import type {
  ByrSyncPayload,
  NormalizedImportBatch,
} from "./syncTypes";

export function mapSyncPayload(
  payload: ByrSyncPayload,
): NormalizedImportBatch {
  return {
    sourceType: "byr_sync_api",
    sourceLabel: payload.sourceLabel,
    boards: payload.boards.map((board) => ({ ...board })),
    botUsers: payload.botUsers.map((botUser) => ({ ...botUser })),
    threads: payload.threads.map((thread) => ({
      ...thread,
      publishedAt: new Date(thread.publishedAt),
    })),
    replies: payload.replies.map((reply) => ({
      ...reply,
      publishedAt: new Date(reply.publishedAt),
    })),
  };
}

export const mapByrSyncPayload = mapSyncPayload;
