import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/admin/api/imports/byr-sync/route", () => ({
  runByrSyncImport: vi.fn(),
}));

import {
  createBatchJobMetadata,
  markBoardCompleted,
} from "@/src/server/imports/boardBatchJobMetadata";
import { runBoardBatchFullSyncJob } from "@/src/server/imports/boardBatchFullSyncRunner";

function makeThrottle() {
  return {
    acquireThrottle: () => ({
      acquired: true,
      holder: {
        ownerKey: "manual:batch-1",
        triggerSource: "manual" as const,
        acquiredAt: new Date("2026-05-04T10:00:00.000Z"),
      },
    }),
    releaseThrottle: vi.fn(),
  };
}

function makeDeps(options?: {
  metadata?: ReturnType<typeof createBatchJobMetadata>;
  runByrSyncImport?: ReturnType<typeof vi.fn>;
  updateJobProgress?: ReturnType<typeof vi.fn>;
  markJobSucceeded?: ReturnType<typeof vi.fn>;
  markJobFailed?: ReturnType<typeof vi.fn>;
  markJobRunning?: ReturnType<typeof vi.fn>;
  markJobPaused?: ReturnType<typeof vi.fn>;
  findJobById?: ReturnType<typeof vi.fn>;
  getBoardFullSyncWindowMinutes?: ReturnType<typeof vi.fn>;
  status?: string;
}) {
  const metadata =
    options?.metadata ??
    createBatchJobMetadata({
      selectedBoardNames: ["JobInfo", "IWhisper"],
      orderedBoardNames: ["IWhisper", "JobInfo"],
    });

  return {
    findJobById:
      options?.findJobById ??
      vi.fn(async () => ({
        id: "batch-1",
        status: options?.status ?? "pending",
        metadataJson: metadata,
      })),
    markJobPaused: options?.markJobPaused ?? vi.fn(async () => ({ count: 1 })),
    markJobRunning: options?.markJobRunning ?? vi.fn(async () => ({ count: 1 })),
    updateJobProgress: options?.updateJobProgress ?? vi.fn(),
    markJobSucceeded: options?.markJobSucceeded ?? vi.fn(async () => ({ count: 1 })),
    markJobFailed: options?.markJobFailed ?? vi.fn(async () => ({ count: 1 })),
    runByrSyncImport:
      options?.runByrSyncImport ??
      vi
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
        }),
    getBoardFullSyncWindowMinutes:
      options?.getBoardFullSyncWindowMinutes ??
      vi.fn((boardName: string) => (boardName === "IWhisper" ? 30 : 180)),
    prisma: {},
  };
}

describe("runBoardBatchFullSyncJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs selected boards in catalog order and advances to the next board", async () => {
    const updateJobProgress = vi.fn();
    const markJobSucceeded = vi.fn(async () => ({ count: 1 }));
    const deps = makeDeps({
      updateJobProgress,
      markJobSucceeded,
    });

    const result = await runBoardBatchFullSyncJob(deps as never, {
      jobId: "batch-1",
      ...makeThrottle(),
    });

    expect(deps.runByrSyncImport).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        boardName: "IWhisper",
      }),
    );
    expect(deps.runByrSyncImport).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        boardName: "JobInfo",
      }),
    );
    expect(updateJobProgress).toHaveBeenLastCalledWith(
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

  it("stops immediately when one board fails and records the failed board", async () => {
    const runByrSyncImport = vi
      .fn()
      .mockResolvedValueOnce({
        importedThreads: 2,
        importedReplies: 5,
        skippedReplies: 0,
      })
      .mockRejectedValueOnce(new Error("JobInfo exploded"));
    const updateJobProgress = vi.fn();
    const markJobFailed = vi.fn(async () => ({ count: 1 }));
    const markJobSucceeded = vi.fn(async () => ({ count: 1 }));
    const deps = makeDeps({
      runByrSyncImport,
      updateJobProgress,
      markJobFailed,
      markJobSucceeded,
    });

    const result = await runBoardBatchFullSyncJob(deps as never, {
      jobId: "batch-1",
      ...makeThrottle(),
    });

    expect(runByrSyncImport).toHaveBeenCalledTimes(2);
    expect(runByrSyncImport).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        boardName: "JobInfo",
      }),
    );
    expect(updateJobProgress).toHaveBeenLastCalledWith(
      "batch-1",
      expect.objectContaining({
        progressNote: "板块 JobInfo 失败",
        metadataJson: expect.objectContaining({
          currentBoardName: "JobInfo",
          failedBoardName: "JobInfo",
          completedBoardNames: ["IWhisper"],
        }),
      }),
    );
    expect(markJobFailed).toHaveBeenCalledWith("batch-1", "JobInfo exploded");
    expect(markJobSucceeded).not.toHaveBeenCalled();
    expect(result.status).toBe("failed");
  });

  it("resumes from the failed current board and skips boards already completed", async () => {
    const metadata = markBoardCompleted(
      createBatchJobMetadata({
        selectedBoardNames: ["JobInfo", "IWhisper"],
        orderedBoardNames: ["IWhisper", "JobInfo"],
      }),
      {
        boardName: "IWhisper",
        processedThreads: 2,
        processedReplies: 5,
      },
    );
    const runByrSyncImport = vi.fn().mockResolvedValueOnce({
      importedThreads: 3,
      importedReplies: 7,
      skippedReplies: 1,
    });
    const updateJobProgress = vi.fn();
    const deps = makeDeps({
      metadata: {
        ...metadata,
        failedBoardName: "JobInfo",
      },
      runByrSyncImport,
      updateJobProgress,
    });

    const result = await runBoardBatchFullSyncJob(deps as never, {
      jobId: "batch-1",
      ...makeThrottle(),
    });

    expect(runByrSyncImport).toHaveBeenCalledTimes(1);
    expect(runByrSyncImport).toHaveBeenCalledWith(
      expect.objectContaining({
        boardName: "JobInfo",
      }),
    );
    expect(updateJobProgress).toHaveBeenCalledWith(
      "batch-1",
      expect.objectContaining({
        processedThreads: 5,
        processedReplies: 12,
        metadataJson: expect.objectContaining({
          completedBoardNames: ["IWhisper", "JobInfo"],
          failedBoardName: null,
          currentBoardName: null,
        }),
      }),
    );
    expect(result.status).toBe("succeeded");
  });

  it("pauses again when a resumed batch job cannot reacquire the global throttle", async () => {
    const markJobPaused = vi.fn(async () => ({ count: 1 }));
    const deps = makeDeps({
      status: "running",
      markJobPaused,
    });

    const result = await runBoardBatchFullSyncJob(deps as never, {
      jobId: "batch-1",
      alreadyMarkedRunning: true,
      acquireThrottle: () => ({
        acquired: false,
        holder: {
          ownerKey: "scheduled:other",
          triggerSource: "scheduled" as const,
          acquiredAt: new Date("2026-05-04T10:00:00.000Z"),
        },
      }),
      releaseThrottle: vi.fn(),
    });

    expect(markJobPaused).toHaveBeenCalledWith(
      "batch-1",
      "等待全局抓取窗口，当前板块 IWhisper",
    );
    expect(deps.markJobRunning).not.toHaveBeenCalled();
    expect(deps.runByrSyncImport).not.toHaveBeenCalled();
    expect(result.status).toBe("paused");
  });

  it("marks a newly scheduled batch job paused when the global throttle is unavailable", async () => {
    const markJobPaused = vi.fn(async () => ({ count: 1 }));
    const updateJobProgress = vi.fn();
    const deps = makeDeps({
      markJobPaused,
      updateJobProgress,
    });

    const result = await runBoardBatchFullSyncJob(deps as never, {
      jobId: "batch-1",
      acquireThrottle: () => ({
        acquired: false,
        holder: {
          ownerKey: "scheduled:other",
          triggerSource: "scheduled" as const,
          acquiredAt: new Date("2026-05-04T10:00:00.000Z"),
        },
      }),
      releaseThrottle: vi.fn(),
    });

    expect(markJobPaused).toHaveBeenCalledWith(
      "batch-1",
      "等待全局抓取窗口，当前板块 IWhisper",
    );
    expect(updateJobProgress).not.toHaveBeenCalled();
    expect(deps.markJobRunning).not.toHaveBeenCalled();
    expect(result.status).toBe("paused");
  });

  it("re-checks cancellation between boards so later boards do not start", async () => {
    const metadata = createBatchJobMetadata({
      selectedBoardNames: ["JobInfo", "IWhisper"],
      orderedBoardNames: ["IWhisper", "JobInfo"],
    });
    const findJobById = vi
      .fn()
      .mockResolvedValueOnce({
        id: "batch-1",
        status: "pending",
        metadataJson: metadata,
      })
      .mockResolvedValueOnce({
        id: "batch-1",
        status: "running",
        metadataJson: metadata,
      })
      .mockResolvedValueOnce({
        id: "batch-1",
        status: "cancelled",
        metadataJson: markBoardCompleted(metadata, {
          boardName: "IWhisper",
          processedThreads: 2,
          processedReplies: 5,
        }),
      });
    const runByrSyncImport = vi.fn().mockResolvedValue({
      importedThreads: 2,
      importedReplies: 5,
      skippedReplies: 0,
    });
    const deps = makeDeps({
      metadata,
      findJobById,
      runByrSyncImport,
    });

    const result = await runBoardBatchFullSyncJob(deps as never, {
      jobId: "batch-1",
      ...makeThrottle(),
    });

    expect(runByrSyncImport).toHaveBeenCalledTimes(1);
    expect(runByrSyncImport).toHaveBeenCalledWith(
      expect.objectContaining({
        boardName: "IWhisper",
      }),
    );
    expect(deps.markJobSucceeded).not.toHaveBeenCalled();
    expect(result.status).toBe("cancelled");
  });

  it("uses each board's configured full sync window instead of a hardcoded value", async () => {
    const getBoardFullSyncWindowMinutes = vi
      .fn()
      .mockImplementation((boardName: string) => (boardName === "IWhisper" ? 45 : 90));
    const deps = makeDeps({
      getBoardFullSyncWindowMinutes,
    });

    const result = await runBoardBatchFullSyncJob(deps as never, {
      jobId: "batch-1",
      ...makeThrottle(),
    });

    expect(deps.runByrSyncImport).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        boardName: "IWhisper",
        windowMinutes: 45,
      }),
    );
    expect(deps.runByrSyncImport).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        boardName: "JobInfo",
        windowMinutes: 90,
      }),
    );
    expect(result.status).toBe("succeeded");
  });
});
