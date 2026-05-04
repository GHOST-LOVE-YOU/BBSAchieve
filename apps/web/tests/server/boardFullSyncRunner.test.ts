import { describe, expect, it, vi } from "vitest";

const runnerMocks = vi.hoisted(() => ({
  runByrSyncImport: vi.fn(),
  markJobPaused: vi.fn(),
  markJobRunning: vi.fn(),
  markJobSucceeded: vi.fn(),
  markJobFailed: vi.fn(),
}));

vi.mock("@/app/admin/api/imports/byr-sync/route", () => ({
  runByrSyncImport: runnerMocks.runByrSyncImport,
}));

import { runBoardFullSyncJob } from "@/src/server/imports/boardFullSyncRunner";

describe("runBoardFullSyncJob", () => {
  it("pauses immediately when global throttle is already held", async () => {
    const result = await runBoardFullSyncJob(
      {
        findJobById: vi.fn(async () => ({
          id: "job-1",
          sourceLabel: "JobInfo",
          metadataJson: { boardName: "JobInfo", fullSyncWindowMinutes: 999999 },
        })),
        markJobPaused: runnerMocks.markJobPaused,
        markJobRunning: runnerMocks.markJobRunning,
        markJobSucceeded: runnerMocks.markJobSucceeded,
        markJobFailed: runnerMocks.markJobFailed,
      } as never,
      {
        jobId: "job-1",
        ownerKey: "manual:JobInfo",
        acquireThrottle: () => ({
          acquired: false,
          holder: {
            ownerKey: "scheduled:IWhisper",
            triggerSource: "scheduled",
            acquiredAt: new Date("2026-05-04T10:00:00.000Z"),
          },
        }),
        releaseThrottle: vi.fn(),
      },
    );

    expect(result.status).toBe("paused");
    expect(runnerMocks.markJobPaused).toHaveBeenCalled();
    expect(runnerMocks.runByrSyncImport).not.toHaveBeenCalled();
  });
});
