import type {
  ByrSyncPayload,
  NormalizedImportBatch,
  SyncBotUserDTO,
  SyncReplyDTO,
  SyncThreadDTO,
} from "./syncTypes";

const DEFAULT_BOARD_SLUG = "iwhisper";
const DEFAULT_BOARD_NAME = "IWhisper";

function normalizeBoardName(boardName: string): { slug: string; name: string } {
  const trimmed = boardName.trim();
  return {
    slug: trimmed.length > 0 ? trimmed.toLowerCase() : DEFAULT_BOARD_SLUG,
    name: trimmed.length > 0 ? trimmed : DEFAULT_BOARD_NAME,
  };
}

function parseReplyIndex(floorLabel: string): number {
  const match = floorLabel.trim().match(/^(\d+)\s*楼$/);
  if (match) {
    return Number.parseInt(match[1] ?? "0", 10);
  }

  return 0;
}

function mapThreadReply(
  boardSlug: string,
  threadId: string,
  post: ByrSyncPayload["threads"][number]["posts"][number],
): SyncReplyDTO {
  return {
    sourceBoardSlug: boardSlug,
    sourceThreadId: threadId,
    replyIndex: parseReplyIndex(post.floor_label),
    authorUsername: post.author_display_name,
    body: post.body,
    publishedAt: new Date(),
  };
}

function mapThread(
  boardSlug: string,
  thread: ByrSyncPayload["threads"][number],
): SyncThreadDTO {
  return {
    sourceBoardSlug: boardSlug,
    sourceThreadId: thread.article_id,
    authorUsername:
      thread.posts[0]?.author_display_name ?? `thread:${thread.article_id}`,
    title: thread.title,
    body: thread.posts[0]?.body ?? "",
    publishedAt: new Date(),
  };
}

function collectBotUsers(payload: ByrSyncPayload): SyncBotUserDTO[] {
  const displayNames = new Map<string, SyncBotUserDTO>();

  for (const thread of payload.threads) {
    for (const post of thread.posts) {
      if (!displayNames.has(post.author_display_name)) {
        displayNames.set(post.author_display_name, {
          username: post.author_display_name,
          displayName: post.author_display_name,
          mailboxKey: null,
        });
      }
    }
  }

  return [...displayNames.values()];
}

export function mapSyncPayload(payload: ByrSyncPayload): NormalizedImportBatch {
  const board = normalizeBoardName(payload.board_name);

  return {
    sourceType: "byr_sync_api",
    sourceLabel: payload.board_name,
    boards: [
      {
        slug: board.slug,
        name: board.name,
        description: "",
      },
    ],
    botUsers: collectBotUsers(payload),
    threads: payload.threads.map((thread) => mapThread(board.slug, thread)),
    replies: payload.threads.flatMap((thread) =>
      thread.posts.map((post) => mapThreadReply(board.slug, thread.article_id, post)),
    ),
  };
}

export const mapByrSyncPayload = mapSyncPayload;
export { parseReplyIndex };
