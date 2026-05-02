import { describe, expect, it, vi } from "vitest";

import { runLegacyMigrationJob } from "@/src/server/imports/legacyMigrationRunner";

function makePost(id: string, updatedAt: string) {
  return {
    id,
    byr_id: id,
    topic: `topic-${id}`,
    area: "IWhisper",
    createdAt: new Date(updatedAt),
    updatedAt: new Date(updatedAt),
    userId: `user-${id}`,
  };
}

function makeRunnerDeps(options?: {
  batches?: Array<{
    posts: Array<ReturnType<typeof makePost>>;
    importResult?: {
      importedThreads: number;
      importedReplies: number;
      skippedReplies: number;
    };
  }>;
  importBatch?: ReturnType<typeof vi.fn>;
  failImport?: boolean;
}) {
  const batches = options?.batches ?? [];
  const fetchBatch = vi.fn(async () => {
    const batch = batches.shift();
    return {
      rows: {
        posts: batch?.posts ?? [],
        comments: [],
        users: [],
      },
      nextCursor: batch?.posts?.length
        ? `${batch.posts[batch.posts.length - 1]!.updatedAt.toISOString()}|${batch.posts[batch.posts.length - 1]!.id}`
        : null,
    };
  });

  const importBatch =
    options?.importBatch ??
    vi.fn(async () => {
      if (options?.failImport) {
        throw new Error("import boom");
      }

      return {
        importedThreads: 1,
        importedReplies: 2,
        skippedReplies: 3,
      };
    });

  return {
    findJobById: vi.fn(async () => ({
      id: "job-1",
      cursorThreadKey: null,
    })),
    markJobRunning: vi.fn(async () => ({})),
    updateJobProgress: vi.fn(async () => ({})),
    markJobFailed: vi.fn(async () => ({})),
    markJobSucceeded: vi.fn(async () => ({})),
    fetchBatch,
    importBatch,
  };
}

describe("runLegacyMigrationJob", () => {
  it("advances the cursor only after a whole post succeeds and accumulates progress", async () => {
    const deps = makeRunnerDeps({
      batches: [
        {
          posts: [
            makePost("post-3", "2026-05-02T11:00:00.000Z"),
            makePost("post-2", "2026-05-02T10:00:00.000Z"),
          ],
        },
        {
          posts: [],
        },
      ],
    });

    const result = await runLegacyMigrationJob(deps as any, "job-1");

    expect(deps.markJobRunning).toHaveBeenCalledWith("job-1", null);
    expect(deps.fetchBatch).toHaveBeenNthCalledWith(1, {
      limit: 50,
      cursorThreadKey: null,
    });
    expect(deps.updateJobProgress).toHaveBeenCalledWith("job-1", {
      cursorThreadKey: "2026-05-02T10:00:00.000Z|post-2",
      processedThreads: 1,
      processedReplies: 2,
      skippedReplies: 3,
      lastProcessedAt: new Date("2026-05-02T10:00:00.000Z"),
    });
    expect(result).toEqual({
      status: "succeeded",
      processedThreads: 1,
      processedReplies: 2,
      skippedReplies: 3,
      cursorThreadKey: "2026-05-02T10:00:00.000Z|post-2",
    });
    expect(deps.markJobSucceeded).toHaveBeenCalledWith("job-1");
  });

  it("marks the job succeeded when the first batch is empty", async () => {
    const deps = makeRunnerDeps({
      batches: [
        {
          posts: [],
        },
      ],
    });

    const result = await runLegacyMigrationJob(deps as any, "job-1");

    expect(deps.fetchBatch).toHaveBeenCalledTimes(1);
    expect(deps.importBatch).not.toHaveBeenCalled();
    expect(deps.markJobSucceeded).toHaveBeenCalledWith("job-1");
    expect(result).toEqual({
      status: "succeeded",
      processedThreads: 0,
      processedReplies: 0,
      skippedReplies: 0,
      cursorThreadKey: null,
    });
  });

  it("marks the job failed when importBatch throws", async () => {
    const deps = makeRunnerDeps({
      batches: [
        {
          posts: [makePost("post-1", "2026-05-02T09:00:00.000Z")],
        },
      ],
      failImport: true,
    });

    const result = await runLegacyMigrationJob(deps as any, "job-1");

    expect(deps.markJobFailed).toHaveBeenCalledWith("job-1", "import boom");
    expect(deps.markJobSucceeded).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: "failed",
      processedThreads: 0,
      processedReplies: 0,
      skippedReplies: 0,
      cursorThreadKey: null,
    });
  });

  it("keeps the cursor on the last successful post instead of reply progress", async () => {
    const importBatch = vi.fn(async () => ({
      importedThreads: 1,
      importedReplies: 7,
      skippedReplies: 2,
    }));
    const deps = makeRunnerDeps({
      batches: [
        {
          posts: [
            makePost("post-2", "2026-05-02T10:00:00.000Z"),
            makePost("post-1", "2026-05-02T09:00:00.000Z"),
          ],
        },
        {
          posts: [],
        },
      ],
      importBatch,
    });

    const result = await runLegacyMigrationJob(deps as any, "job-1");

    expect(importBatch).toHaveBeenCalledTimes(1);
    expect(deps.updateJobProgress).toHaveBeenCalledWith("job-1", {
      cursorThreadKey: "2026-05-02T09:00:00.000Z|post-1",
      processedThreads: 1,
      processedReplies: 7,
      skippedReplies: 2,
      lastProcessedAt: new Date("2026-05-02T09:00:00.000Z"),
    });
    expect(result.cursorThreadKey).toBe("2026-05-02T09:00:00.000Z|post-1");
  });
});
