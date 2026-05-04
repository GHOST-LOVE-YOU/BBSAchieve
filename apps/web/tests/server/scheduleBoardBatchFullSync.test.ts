import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const schedulerMocks = vi.hoisted(() => ({
  runBoardBatchFullSyncJob: vi.fn(),
  prisma: {
    importJob: {
      findUnique: vi.fn(),
      update: vi.fn(),
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
});
