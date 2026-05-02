import { createRequire } from "node:module";

import type { LegacyCommentRow, LegacyImportRows, LegacyPostRow, LegacyUserRow } from "./legacyTypes";

type LegacyDatabaseRow = Record<string, unknown>;

type LegacyDatabaseQueryResult = {
  rows: LegacyDatabaseRow[];
};

export type LegacyIwhisperBatch = {
  rows: LegacyImportRows;
  nextCursor: string | null;
};

type QueryLegacyDatabase = (sql: string, params: unknown[]) => Promise<LegacyDatabaseQueryResult>;

export type FetchLegacyIwhisperBatchOptions = {
  limit: number;
  cursorThreadKey?: string | null;
  queryLegacyDatabase?: QueryLegacyDatabase;
};

type LegacyConnection = {
  query: QueryLegacyDatabase;
  close: () => Promise<void>;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function parseCursorThreadKey(cursorThreadKey: string | null | undefined): {
  updatedAt: Date | null;
  postId: string | null;
} {
  if (!cursorThreadKey) {
    return { updatedAt: null, postId: null };
  }

  const separatorIndex = cursorThreadKey.lastIndexOf("|");
  if (separatorIndex <= 0) {
    return { updatedAt: null, postId: null };
  }

  const updatedAt = new Date(cursorThreadKey.slice(0, separatorIndex));
  const postId = cursorThreadKey.slice(separatorIndex + 1);

  if (Number.isNaN(updatedAt.getTime()) || postId.length === 0) {
    return { updatedAt: null, postId: null };
  }

  return { updatedAt, postId };
}

function toLegacyPostRow(row: LegacyDatabaseRow): LegacyPostRow {
  return {
    id: String(row.id),
    byr_id: row.byr_id == null ? null : String(row.byr_id),
    topic: String(row.topic ?? ""),
    area: String(row.area ?? ""),
    createdAt: new Date(String(row.createdAt)),
    updatedAt: new Date(String(row.updatedAt)),
    userId: String(row.userId),
  };
}

function toLegacyCommentRow(row: LegacyDatabaseRow): LegacyCommentRow {
  return {
    id: String(row.id),
    sequence: Number(row.sequence ?? 0),
    content: row.content == null ? null : String(row.content),
    time: new Date(String(row.time)),
    postId: String(row.postId),
    userId: String(row.userId),
  };
}

function toLegacyUserRow(row: LegacyDatabaseRow): LegacyUserRow {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    tag: row.tag == null ? null : String(row.tag),
  };
}

function buildCursorThreadKey(post: LegacyPostRow): string {
  return `${post.updatedAt.toISOString()}|${post.id}`;
}

async function createLegacyConnection(): Promise<LegacyConnection> {
  const databaseUrl = getRequiredEnv("LEGACY_DATABASE_URL");
  const require = createRequire(import.meta.url);
  const { Client } = require("pg") as typeof import("pg");
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  return {
    query: async (sql, params) => client.query({ text: sql, values: params }),
    close: async () => {
      await client.end();
    },
  };
}

async function readPosts(
  queryLegacyDatabase: QueryLegacyDatabase,
  limit: number,
  cursorThreadKey?: string | null,
): Promise<LegacyPostRow[]> {
  const { updatedAt, postId } = parseCursorThreadKey(cursorThreadKey);
  const params: unknown[] = [limit];
  const whereParts = [`area = 'IWhisper'`];

  if (updatedAt && postId) {
    params.unshift(updatedAt.toISOString(), postId);
    whereParts.push(`(updatedAt < $2 OR (updatedAt = $2 AND id < $3))`);
  }

  const sql = `
    SELECT id, byr_id, topic, area, createdAt, updatedAt, userId
    FROM "Post"
    WHERE ${whereParts.join(" AND ")}
    ORDER BY updatedAt DESC, id DESC
    LIMIT $1
  `;

  const result = await queryLegacyDatabase(sql, params);
  return result.rows.map(toLegacyPostRow);
}

async function readComments(
  queryLegacyDatabase: QueryLegacyDatabase,
  postIds: string[],
): Promise<LegacyCommentRow[]> {
  if (postIds.length === 0) {
    return [];
  }

  const sql = `
    SELECT id, sequence, content, time, postId, userId
    FROM "Comment"
    WHERE postId = ANY($1)
    ORDER BY postId DESC, sequence ASC
  `;

  const result = await queryLegacyDatabase(sql, [postIds]);
  return result.rows.map(toLegacyCommentRow);
}

async function readUsers(
  queryLegacyDatabase: QueryLegacyDatabase,
  userIds: string[],
): Promise<LegacyUserRow[]> {
  if (userIds.length === 0) {
    return [];
  }

  const sql = `
    SELECT id, name, tag
    FROM "User"
    WHERE id = ANY($1)
  `;

  const result = await queryLegacyDatabase(sql, [userIds]);
  return result.rows.map(toLegacyUserRow);
}

export async function fetchLegacyIwhisperBatch(
  options: FetchLegacyIwhisperBatchOptions,
): Promise<LegacyIwhisperBatch> {
  const connection = options.queryLegacyDatabase
    ? null
    : await createLegacyConnection();

  const queryLegacyDatabase = options.queryLegacyDatabase ?? connection!.query;

  try {
    const posts = await readPosts(
      queryLegacyDatabase,
      options.limit,
      options.cursorThreadKey,
    );
    const postIds = posts.map((post) => post.id);
    const comments = await readComments(queryLegacyDatabase, postIds);
    const userIds = new Set<string>();

    for (const post of posts) {
      userIds.add(post.userId);
    }
    for (const comment of comments) {
      userIds.add(comment.userId);
    }

    const users = await readUsers(queryLegacyDatabase, [...userIds]);
    const nextCursor =
      posts.length > 0 ? buildCursorThreadKey(posts[posts.length - 1]!) : null;

    return {
      rows: {
        posts,
        comments,
        users,
      },
      nextCursor,
    };
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}
