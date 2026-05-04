import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/admin/api/imports/byr-sync/route", () => ({
  runByrSyncImport: vi.fn(),
}));

import { createBatchJobMetadata } from "@/src/server/imports/boardBatchJobMetadata";
import { runBoardBatchFullSyncJob } from "@/src/server/imports/boardBatchFullSyncRunner";

describe("runBoardBatchFullSyncJob", () => {
  it("runs selected boards in catalog order and advances to the next board", async () => {
    const runByrSyncImport = vi
      .fn()
      .mockResolvedValueOnce({
        importedThreads: 2,
        importedReplies: 5,
        skippedReplies: 0,
      })
      .mockResolvedValueOnce({
        importedThreads: 3,
        importedReplies: 7,
        skippedReplies: 1,
      });

    const metadata = createBatchJobMetadata({
      selectedBoardNames: ["JobInfo", "IWhisper"],
      orderedBoardNames: ["IWhisper", "JobInfo"],
    });

    const updateJobProgress = vi.fn();
    const markJobSucceeded = vi.fn(async () => ({ count: 1 }));

    const result = await runBoardBatchFullSyncJob(
      {
        findJobById: vi.fn(async () => ({
          id: "batch-1",
          status: "pending",
          metadataJson: metadata,
        })),
        markJobRunning: vi.fn(async () => ({ count: 1 })),
        updateJobProgress,
        markJobSucceeded,
        markJobFailed: vi.fn(async () => ({ count: 1 })),
        runByrSyncImport,
        prisma: {},
      } as never,
      {
        jobId: "batch-1",
        acquireThrottle: () => ({
          acquired: true,
          holder: {
            ownerKey: "manual:batch-1",
            triggerSource: "manual" as const,
            acquiredAt: new Date("2026-05-04T10:00:00.000Z"),
          },
        }),
        releaseThrottle: vi.fn(),
      },
    );

    expect(runByrSyncImport).toHaveBeenNthCalledWith(1, expect.objectContaining({
      boardName: "IWhisper",
    }));
    expect(runByrSyncImport).toHaveBeenNthCalledWith(2, expect.objectContaining({
      boardName: "JobInfo",
    }));
    expect(updateJobProgress).toHaveBeenCalledWith(
      "batch-1",
      expect.objectContaining({
        progressNote: "全部板块已完成",
        processedThreads: 5,
        processedReplies: 12,
      }),
    );
    expect(markJobSucceeded).toHaveBeenCalledWith("batch-1");
    expect(result.status).toBe("succeeded");
  });
});
