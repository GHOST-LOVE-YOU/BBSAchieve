import { describe, expect, it, vi } from "vitest";

import { fetchLegacyIwhisperBatch } from "@/src/server/imports/fetchLegacyIwhisperBatch";
import {
  createLegacyImportJob,
  markJobRunning,
  updateJobProgress,
} from "@/src/server/imports/importJobStore";

describe("fetchLegacyIwhisperBatch", () => {
  it("uses the post cursor and returns newer posts first", async () => {
    const queryMock = vi.fn(async () => ({
      rows: [
        {
          id: "post-2",
          byr_id: "9002",
          topic: "Second",
          area: "IWhisper",
          createdAt: new Date("2026-05-02T10:00:00.000Z"),
          updatedAt: new Date("2026-05-02T10:10:00.000Z"),
          userId: "user-2",
        },
        {
          id: "post-1",
          byr_id: "9001",
          topic: "First",
          area: "IWhisper",
          createdAt: new Date("2026-05-02T09:00:00.000Z"),
          updatedAt: new Date("2026-05-02T09:10:00.000Z"),
          userId: "user-1",
        },
      ],
    }));

    const batch = await fetchLegacyIwhisperBatch({
      limit: 2,
      cursorThreadKey: "2026-05-02T08:00:00.000Z|post-0",
      queryLegacyDatabase: queryMock,
    });

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("updatedAt"),
      expect.arrayContaining(["2026-05-02T08:00:00.000Z", "post-0", 2]),
    );
    expect(batch.rows.posts.map((post) => post.id)).toEqual(["post-2", "post-1"]);
    expect(batch.nextCursor).toBe("2026-05-02T09:10:00.000Z|post-1");
  });
});

describe("importJobStore", () => {
  it("creates a legacy migration job with the legacy source metadata", async () => {
    const prisma = {
      importJob: {
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
          id: "job-1",
          ...data,
        })),
      },
    };

    const job = await createLegacyImportJob(prisma as any);

    expect(prisma.importJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        jobType: "legacy_iwhisper_migration",
        sourceType: "legacy_postgres",
        sourceLabel: "legacy iwhisper",
        status: "pending",
      }),
    });
    expect(job.id).toBe("job-1");
  });

  it("marks a job running and stores the cursor thread key", async () => {
    const prisma = {
      importJob: {
        update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({
          id: where.id,
          ...data,
        })),
      },
    };

    await markJobRunning(prisma as any, "job-1", "2026-05-02T10:00:00.000Z|post-2");

    expect(prisma.importJob.update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: expect.objectContaining({
        status: "running",
        startedAt: expect.any(Date),
        cursorThreadKey: "2026-05-02T10:00:00.000Z|post-2",
      }),
    });
  });

  it("updates progress without clearing the cursor", async () => {
    const prisma = {
      importJob: {
        update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({
          id: where.id,
          ...data,
        })),
      },
    };

    await updateJobProgress(prisma as any, "job-1", {
      cursorThreadKey: "2026-05-02T10:00:00.000Z|post-2",
      processedThreads: 3,
      processedReplies: 7,
      skippedThreads: 1,
      skippedReplies: 2,
      progressNote: "batch complete",
    });

    expect(prisma.importJob.update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: expect.objectContaining({
        cursorThreadKey: "2026-05-02T10:00:00.000Z|post-2",
        processedThreads: 3,
        processedReplies: 7,
        skippedThreads: 1,
        skippedReplies: 2,
        progressNote: "batch complete",
      }),
    });
  });
});
