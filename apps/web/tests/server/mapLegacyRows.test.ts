import { describe, expect, it } from "vitest";

import { mapLegacyRows } from "@/src/server/imports/mapLegacyRows";

describe("mapLegacyRows", () => {
  it("maps a normal iwhisper post with multiple comments into a NormalizedImportBatch", () => {
    const batch = mapLegacyRows({
      posts: [
        {
          id: "post-1",
          byr_id: "8830220",
          topic: "Need advice",
          area: "IWhisper",
          createdAt: new Date("2026-04-01T10:00:00.000Z"),
          updatedAt: new Date("2026-04-01T10:05:00.000Z"),
          userId: "user-1",
        },
      ],
      comments: [
        {
          id: "comment-1",
          sequence: 1,
          content: "Opening post",
          time: new Date("2026-04-01T10:01:00.000Z"),
          postId: "post-1",
          userId: "user-1",
        },
        {
          id: "comment-2",
          sequence: 2,
          content: "Reply body",
          time: new Date("2026-04-01T10:02:00.000Z"),
          postId: "post-1",
          userId: "user-2",
        },
      ],
      users: [
        { id: "user-1", name: "Alice", tag: "A" },
        { id: "user-2", name: "Bob", tag: "B" },
      ],
    });

    expect(batch).toEqual({
      sourceType: "legacy_postgres",
      sourceLabel: "legacy_postgres:iwhisper",
      boards: [
        {
          slug: "iwhisper",
          name: "IWhisper",
          description: "",
        },
      ],
      botUsers: [
        {
          username: "Alice",
          displayName: "Alice",
          mailboxKey: null,
        },
        {
          username: "Bob",
          displayName: "Bob",
          mailboxKey: null,
        },
      ],
      threads: [
        {
          sourceBoardSlug: "iwhisper",
          sourceThreadId: "8830220",
          authorUsername: "Alice",
          title: "Need advice",
          body: "Opening post",
          publishedAt: new Date("2026-04-01T10:00:00.000Z"),
        },
      ],
      replies: [
        {
          sourceBoardSlug: "iwhisper",
          sourceThreadId: "8830220",
          replyIndex: 1,
          authorUsername: "Alice",
          body: "Opening post",
          publishedAt: new Date("2026-04-01T10:01:00.000Z"),
        },
        {
          sourceBoardSlug: "iwhisper",
          sourceThreadId: "8830220",
          replyIndex: 2,
          authorUsername: "Bob",
          body: "Reply body",
          publishedAt: new Date("2026-04-01T10:02:00.000Z"),
        },
      ],
    });
  });

  it("falls back to a stable legacy thread id when byr_id is empty", () => {
    const batch = mapLegacyRows({
      posts: [
        {
          id: "post-2",
          byr_id: "",
          topic: "Fallback id",
          area: "IWhisper",
          createdAt: new Date("2026-04-02T10:00:00.000Z"),
          updatedAt: new Date("2026-04-02T10:05:00.000Z"),
          userId: "user-1",
        },
      ],
      comments: [],
      users: [{ id: "user-1", name: "Alice", tag: "A" }],
    });

    expect(batch.threads[0]?.sourceThreadId).toBe("legacy-post:post-2");
    expect(batch.replies).toEqual([]);
  });

  it("falls back to an empty thread body when there is no first comment", () => {
    const batch = mapLegacyRows({
      posts: [
        {
          id: "post-3",
          byr_id: "8830222",
          topic: "No opening comment",
          area: "IWhisper",
          createdAt: new Date("2026-04-03T10:00:00.000Z"),
          updatedAt: new Date("2026-04-03T10:05:00.000Z"),
          userId: "user-1",
        },
      ],
      comments: [
        {
          id: "comment-3",
          sequence: 2,
          content: "Second floor only",
          time: new Date("2026-04-03T10:02:00.000Z"),
          postId: "post-3",
          userId: "user-2",
        },
      ],
      users: [
        { id: "user-1", name: "Alice", tag: "A" },
        { id: "user-2", name: "Bob", tag: "B" },
      ],
    });

    expect(batch.threads[0]?.body).toBe("");
  });

  it("deduplicates bot users across thread and reply authors", () => {
    const batch = mapLegacyRows({
      posts: [
        {
          id: "post-4",
          byr_id: "8830223",
          topic: "Duplicate authors",
          area: "IWhisper",
          createdAt: new Date("2026-04-04T10:00:00.000Z"),
          updatedAt: new Date("2026-04-04T10:05:00.000Z"),
          userId: "user-1",
        },
      ],
      comments: [
        {
          id: "comment-4",
          sequence: 1,
          content: "Opening post",
          time: new Date("2026-04-04T10:01:00.000Z"),
          postId: "post-4",
          userId: "user-1",
        },
        {
          id: "comment-5",
          sequence: 2,
          content: "First reply",
          time: new Date("2026-04-04T10:02:00.000Z"),
          postId: "post-4",
          userId: "user-2",
        },
        {
          id: "comment-6",
          sequence: 3,
          content: "Second reply",
          time: new Date("2026-04-04T10:03:00.000Z"),
          postId: "post-4",
          userId: "user-2",
        },
      ],
      users: [
        { id: "user-1", name: "Alice", tag: "A" },
        { id: "user-2", name: "Bob", tag: "B" },
      ],
    });

    expect(batch.botUsers).toEqual([
      {
        username: "Alice",
        displayName: "Alice",
        mailboxKey: null,
      },
      {
        username: "Bob",
        displayName: "Bob",
        mailboxKey: null,
      },
    ]);
  });

  it("collects thread authors from every legacy post", () => {
    const batch = mapLegacyRows({
      posts: [
        {
          id: "post-5",
          byr_id: "8830224",
          topic: "First thread",
          area: "IWhisper",
          createdAt: new Date("2026-04-05T10:00:00.000Z"),
          updatedAt: new Date("2026-04-05T10:05:00.000Z"),
          userId: "user-1",
        },
        {
          id: "post-6",
          byr_id: "8830225",
          topic: "Second thread",
          area: "IWhisper",
          createdAt: new Date("2026-04-05T11:00:00.000Z"),
          updatedAt: new Date("2026-04-05T11:05:00.000Z"),
          userId: "user-2",
        },
      ],
      comments: [
        {
          id: "comment-7",
          sequence: 1,
          content: "Opening post",
          time: new Date("2026-04-05T10:01:00.000Z"),
          postId: "post-5",
          userId: "user-1",
        },
        {
          id: "comment-8",
          sequence: 1,
          content: "Another opening post",
          time: new Date("2026-04-05T11:01:00.000Z"),
          postId: "post-6",
          userId: "user-2",
        },
      ],
      users: [
        { id: "user-1", name: "Alice", tag: "A" },
        { id: "user-2", name: "Bob", tag: "B" },
      ],
    });

    expect(batch.botUsers).toEqual([
      {
        username: "Alice",
        displayName: "Alice",
        mailboxKey: null,
      },
      {
        username: "Bob",
        displayName: "Bob",
        mailboxKey: null,
      },
    ]);
  });
});
