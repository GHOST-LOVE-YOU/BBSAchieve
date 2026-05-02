import type {
  ByrSyncPayload,
  NormalizedImportBatch,
  SyncBotUserDTO,
  SyncReplyDTO,
  SyncThreadDTO,
} from "./syncTypes";

const DEFAULT_BOARD_SLUG = "iwhisper";
const DEFAULT_BOARD_NAME = "IWhisper";

function isOriginalPostFloor(floorLabel: string): boolean {
  const normalized = floorLabel.trim();
  return normalized === "楼主" || normalized === "0楼";
}

function getNamedFloorIndex(floorLabel: string): number | null {
  const normalized = floorLabel.trim();

  if (normalized === "沙发") {
    return 1;
  }
  if (normalized === "板凳") {
    return 2;
  }
  if (normalized === "地板") {
    return 3;
  }

  return null;
}

function normalizeBoardName(boardName: string): { slug: string; name: string } {
  const trimmed = boardName.trim();
  return {
    slug: trimmed.length > 0 ? trimmed.toLowerCase() : DEFAULT_BOARD_SLUG,
    name: trimmed.length > 0 ? trimmed : DEFAULT_BOARD_NAME,
  };
}

function parseReplyIndex(floorLabel: string): number {
  const normalized = floorLabel.trim();

  if (isOriginalPostFloor(normalized)) {
    return 0;
  }

  const namedFloorIndex = getNamedFloorIndex(normalized);
  if (namedFloorIndex !== null) {
    return namedFloorIndex;
  }

  const match = normalized.match(/^(?:第)?(\d+)\s*楼$/);
  if (match) {
    return Number.parseInt(match[1] ?? "0", 10);
  }

  return 0;
}

function parseByrPostedAt(value: string): Date | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const parsed = new Date(`${trimmed} GMT+0800`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
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
    publishedAt: parseByrPostedAt(post.posted_at) ?? new Date(),
  };
}

function mapThread(
  boardSlug: string,
  thread: ByrSyncPayload["threads"][number],
): SyncThreadDTO {
  const originalPost = thread.posts.find((post) => isOriginalPostFloor(post.floor_label));

  return {
    sourceBoardSlug: boardSlug,
    sourceThreadId: thread.article_id,
    authorUsername: originalPost?.author_display_name ?? null,
    title: thread.title,
    body: originalPost?.body ?? null,
    publishedAt: originalPost ? parseByrPostedAt(originalPost.posted_at) : null,
    replyCount: thread.reply_count,
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
      thread.posts
        .filter((post) => !isOriginalPostFloor(post.floor_label))
        .map((post) => mapThreadReply(board.slug, thread.article_id, post)),
    ),
  };
}

export const mapByrSyncPayload = mapSyncPayload;
export { parseByrPostedAt, parseReplyIndex };
