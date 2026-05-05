import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const schedulerMocks = vi.hoisted(() => ({
  runBoardBatchFullSyncJob: vi.fn(),
  prisma: {
    importJob: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/src/server/db/client", () => ({
  prisma: schedulerMocks.prisma,
}));

vi.mock("@/src/server/imports/boardBatchFullSyncRunner", () => ({
  runBoardBatchFullSyncJob: schedulerMocks.runBoardBatchFullSyncJob,
}));

import { scheduleBoardBatchFullSync } from "@/src/server/imports/scheduleBoardBatchFullSync";

describe("scheduleBoardBatchFullSync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    schedulerMocks.runBoardBatchFullSyncJob.mockReset();
    schedulerMocks.prisma.importJob.updateMany.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("schedules the batch runner with the requested job id", async () => {
    schedulerMocks.runBoardBatchFullSyncJob.mockResolvedValue({ status: "succeeded" });

    scheduleBoardBatchFullSync("job-batch-1");
    await vi.runAllTimersAsync();

    expect(schedulerMocks.runBoardBatchFullSyncJob).toHaveBeenCalledTimes(1);
    expect(schedulerMocks.runBoardBatchFullSyncJob).toHaveBeenCalledWith(
      expect.objectContaining({
        prisma: schedulerMocks.prisma,
        findJobById: expect.any(Function),
        markJobRunning: expect.any(Function),
        updateJobProgress: expect.any(Function),
        markJobSucceeded: expect.any(Function),
        markJobFailed: expect.any(Function),
      }),
      expect.objectContaining({
        jobId: "job-batch-1",
        acquireThrottle: expect.any(Function),
        releaseThrottle: expect.any(Function),
      }),
    );
  });

  it("marks the job failed when the background runner throws unexpectedly", async () => {
    const error = new Error("background boom");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    schedulerMocks.runBoardBatchFullSyncJob.mockRejectedValue(error);
    schedulerMocks.prisma.importJob.updateMany.mockResolvedValue({ count: 1 });

    scheduleBoardBatchFullSync("job-batch-1");
    await vi.runAllTimersAsync();

    expect(schedulerMocks.prisma.importJob.updateMany).toHaveBeenCalledWith({
      where: {
        id: "job-batch-1",
        status: {
          in: ["pending", "running", "paused"],
        },
      },
      data: {
        status: "failed",
        finishedAt: expect.any(Date),
        errorMessage: "background boom",
      },
    });
    expect(consoleError).toHaveBeenCalledWith(
      "scheduleBoardBatchFullSync background run failed",
      error,
    );
  });

  it("marks a pending batch job failed when the runner crashes before it can enter running", async () => {
    const error = new Error("pre-run boom");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    schedulerMocks.runBoardBatchFullSyncJob.mockRejectedValue(error);
    schedulerMocks.prisma.importJob.updateMany.mockResolvedValue({ count: 1 });

    scheduleBoardBatchFullSync("job-batch-2");
    await vi.runAllTimersAsync();

    expect(schedulerMocks.prisma.importJob.updateMany).toHaveBeenCalledWith({
      where: {
        id: "job-batch-2",
        status: {
          in: ["pending", "running", "paused"],
        },
      },
      data: {
        status: "failed",
        finishedAt: expect.any(Date),
        errorMessage: "pre-run boom",
      },
    });
    expect(consoleError).toHaveBeenCalledWith(
      "scheduleBoardBatchFullSync background run failed",
      error,
    );
  });
});
