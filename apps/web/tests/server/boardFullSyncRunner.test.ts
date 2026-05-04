import { beforeEach, describe, expect, it, vi } from "vitest";

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

function makeJob() {
  return {
    id: "job-1",
    sourceLabel: "JobInfo",
    metadataJson: { boardName: "JobInfo", fullSyncWindowMinutes: 999999 },
  };
}

function makeDeps() {
  return {
    findJobById: vi.fn(async () => makeJob()),
    markJobPaused: runnerMocks.markJobPaused,
    markJobRunning: runnerMocks.markJobRunning,
    markJobSucceeded: runnerMocks.markJobSucceeded,
    markJobFailed: runnerMocks.markJobFailed,
    prisma: { thread: {} },
  };
}

function makeInput(options?: {
  acquireThrottle?: () => { acquired: boolean; holder: unknown };
  releaseThrottle?: ReturnType<typeof vi.fn>;
}) {
  return {
    jobId: "job-1",
    ownerKey: "manual:JobInfo",
    acquireThrottle:
      options?.acquireThrottle ??
      (() => ({
        acquired: true,
        holder: {
          ownerKey: "manual:JobInfo",
          triggerSource: "manual",
          acquiredAt: new Date("2026-05-04T10:00:00.000Z"),
        },
      })),
    releaseThrottle: options?.releaseThrottle ?? vi.fn(),
  };
}

describe("runBoardFullSyncJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pauses immediately when global throttle is already held", async () => {
    const result = await runBoardFullSyncJob(
      makeDeps() as never,
      makeInput({
        acquireThrottle: () => ({
          acquired: false,
          holder: {
            ownerKey: "scheduled:IWhisper",
            triggerSource: "scheduled",
            acquiredAt: new Date("2026-05-04T10:00:00.000Z"),
          },
        }),
      }),
    );

    expect(result.status).toBe("paused");
    expect(runnerMocks.markJobPaused).toHaveBeenCalledWith(
      "job-1",
      "skipped by global throttle",
    );
    expect(runnerMocks.runByrSyncImport).not.toHaveBeenCalled();
  });

  it("marks the job running after acquiring the throttle", async () => {
    runnerMocks.runByrSyncImport.mockResolvedValueOnce({ importedThreads: 1 });

    await runBoardFullSyncJob(makeDeps() as never, makeInput());

    expect(runnerMocks.markJobRunning).toHaveBeenCalledWith("job-1");
  });

  it("runs sync import with board metadata and marks the job succeeded", async () => {
    runnerMocks.runByrSyncImport.mockResolvedValueOnce({ importedThreads: 1 });

    await runBoardFullSyncJob(makeDeps() as never, makeInput());

    expect(runnerMocks.runByrSyncImport).toHaveBeenCalledWith({
      prisma: { thread: {} },
      boardName: "JobInfo",
      windowMinutes: 999999,
    });
    expect(runnerMocks.markJobSucceeded).toHaveBeenCalledWith("job-1");
  });

  it("marks the job failed when sync import throws", async () => {
    runnerMocks.runByrSyncImport.mockRejectedValueOnce(new Error("sync boom"));

    const result = await runBoardFullSyncJob(makeDeps() as never, makeInput());

    expect(result).toEqual({ status: "failed" });
    expect(runnerMocks.markJobFailed).toHaveBeenCalledWith("job-1", "sync boom");
  });

  it("releases the throttle after a successful run", async () => {
    const releaseThrottle = vi.fn();
    runnerMocks.runByrSyncImport.mockResolvedValueOnce({ importedThreads: 1 });

    await runBoardFullSyncJob(
      makeDeps() as never,
      makeInput({ releaseThrottle }),
    );

    expect(releaseThrottle).toHaveBeenCalledWith("manual:JobInfo");
  });

  it("releases the throttle after a failed run", async () => {
    const releaseThrottle = vi.fn();
    runnerMocks.runByrSyncImport.mockRejectedValueOnce(new Error("sync boom"));

    await runBoardFullSyncJob(
      makeDeps() as never,
      makeInput({ releaseThrottle }),
    );

    expect(releaseThrottle).toHaveBeenCalledWith("manual:JobInfo");
  });
});
