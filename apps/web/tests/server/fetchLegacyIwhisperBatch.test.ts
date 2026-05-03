import { describe, expect, it, vi } from "vitest";

import { fetchLegacyIwhisperBatch } from "@/src/server/imports/fetchLegacyIwhisperBatch";

describe("fetchLegacyIwhisperBatch", () => {
  it("quotes legacy postgres camelCase columns in raw SQL queries", async () => {
    const queryLegacyDatabase = vi.fn(async (sql: string) => {
      if (sql.includes('FROM "Post"')) {
        return {
          rows: [
            {
              id: "post-1",
              byr_id: "8830220",
              topic: "legacy topic",
              area: "IWhisper",
              createdAt: "2026-04-01T10:00:00.000Z",
              updatedAt: "2026-04-02T11:00:00.000Z",
              userId: "user-1",
            },
          ],
        };
      }

      if (sql.includes('FROM "Comment"')) {
        return {
          rows: [
            {
              id: "comment-1",
              sequence: 1,
              content: "hello",
              time: "2026-04-02T12:00:00.000Z",
              postId: "post-1",
              userId: "user-2",
            },
          ],
        };
      }

      return {
        rows: [
          {
            id: "user-1",
            name: "alice",
            tag: null,
          },
          {
            id: "user-2",
            name: "bob",
            tag: "tag",
          },
        ],
      };
    });

    const result = await fetchLegacyIwhisperBatch({
      limit: 1,
      cursorThreadKey: "2026-04-03T09:00:00.000Z|post-9",
      queryLegacyDatabase,
    });

    expect(queryLegacyDatabase).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining(
        'SELECT "id", "byr_id", "topic", "area", "createdAt", "updatedAt", "userId"',
      ),
      [1, "2026-04-03T09:00:00.000Z", "post-9"],
    );
    expect(queryLegacyDatabase).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('"updatedAt" < $2 OR ("updatedAt" = $2 AND "id" < $3)'),
      [1, "2026-04-03T09:00:00.000Z", "post-9"],
    );
    expect(queryLegacyDatabase).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(
        'SELECT "id", "sequence", "content", "time", "postId", "userId"',
      ),
      [["post-1"]],
    );
    expect(queryLegacyDatabase).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('SELECT "id", "name", "tag"'),
      [["user-1", "user-2"]],
    );
    expect(result.rows.posts[0]).toMatchObject({
      id: "post-1",
      userId: "user-1",
    });
    expect(result.nextCursor).toBe("2026-04-02T11:00:00.000Z|post-1");
  });
});
