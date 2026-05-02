import type {
  NormalizedImportBatch,
  SyncBotUserDTO,
  SyncReplyDTO,
  SyncThreadDTO,
} from "./syncTypes";
import type {
  LegacyCommentRow,
  LegacyImportRows,
  LegacyPostRow,
  LegacyUserRow,
} from "./legacyTypes";

const BOARD_SLUG = "iwhisper";
const BOARD_NAME = "IWhisper";
const BOARD_DESCRIPTION = "";

function buildUserMap(users: LegacyUserRow[]): Map<string, LegacyUserRow> {
  return new Map(users.map((user) => [user.id, user]));
}

function getUserUsername(
  userMap: Map<string, LegacyUserRow>,
  userId: string,
): string {
  return userMap.get(userId)?.name ?? `user:${userId}`;
}

function getThreadSourceThreadId(post: LegacyPostRow): string {
  return post.byr_id && post.byr_id.trim().length > 0
    ? post.byr_id
    : `legacy-post:${post.id}`;
}

function getThreadBody(comments: LegacyCommentRow[]): string {
  return comments.find((comment) => comment.sequence === 1)?.content ?? "";
}

function mapBotUsers(threadAuthors: string[], replyAuthors: string[]): SyncBotUserDTO[] {
  const usernames = new Set<string>();
  const botUsers: SyncBotUserDTO[] = [];

  for (const username of [...threadAuthors, ...replyAuthors]) {
    if (usernames.has(username)) {
      continue;
    }

    usernames.add(username);
    botUsers.push({
      username,
      displayName: username,
      mailboxKey: null,
    });
  }

  return botUsers;
}

function mapThread(
  post: LegacyPostRow,
  comments: LegacyCommentRow[],
  userMap: Map<string, LegacyUserRow>,
): SyncThreadDTO {
  const authorUsername = getUserUsername(userMap, post.userId);

  return {
    sourceBoardSlug: BOARD_SLUG,
    sourceThreadId: getThreadSourceThreadId(post),
    authorUsername,
    title: post.topic,
    body: getThreadBody(comments),
    publishedAt: post.createdAt,
  };
}

function mapReplies(
  post: LegacyPostRow,
  comments: LegacyCommentRow[],
  userMap: Map<string, LegacyUserRow>,
): SyncReplyDTO[] {
  return comments.map((comment) => ({
    sourceBoardSlug: BOARD_SLUG,
    sourceThreadId: getThreadSourceThreadId(post),
    replyIndex: comment.sequence,
    authorUsername: getUserUsername(userMap, comment.userId),
    body: comment.content ?? "",
    publishedAt: comment.time,
  }));
}

export function mapLegacyRows(rows: LegacyImportRows): NormalizedImportBatch {
  const userMap = buildUserMap(rows.users);
  const iwhisperPosts = rows.posts.filter(
    (post) => post.area === BOARD_NAME || post.area === BOARD_SLUG,
  );

  const threads = iwhisperPosts.map((post) => {
    const comments = rows.comments.filter((comment) => comment.postId === post.id);
    return mapThread(post, comments, userMap);
  });

  const replies = iwhisperPosts.flatMap((post) => {
    const comments = rows.comments.filter((comment) => comment.postId === post.id);
    return mapReplies(post, comments, userMap);
  });

  const botUsers = mapBotUsers(
    threads.map((thread) => thread.authorUsername),
    replies.map((reply) => reply.authorUsername),
  ).filter((botUser) => botUser.username.length > 0);

  return {
    sourceType: "legacy_postgres",
    sourceLabel: "legacy_postgres:iwhisper",
    boards: [
      {
        slug: BOARD_SLUG,
        name: BOARD_NAME,
        description: BOARD_DESCRIPTION,
      },
    ],
    botUsers,
    threads,
    replies,
  };
}
