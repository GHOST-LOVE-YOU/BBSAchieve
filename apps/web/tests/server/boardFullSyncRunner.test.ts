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

  it("returns cancelled before starting when the job is already cancelled", async () => {
    const deps = {
      ...makeDeps(),
      findJobById: vi.fn(async () => ({
        ...makeJob(),
        status: "cancelled",
      })),
    };

    const result = await runBoardFullSyncJob(deps as never, makeInput());

    expect(result).toEqual({ status: "cancelled" });
    expect(runnerMocks.markJobRunning).not.toHaveBeenCalled();
    expect(runnerMocks.runByrSyncImport).not.toHaveBeenCalled();
  });

  it("marks the job running after acquiring the throttle", async () => {
    runnerMocks.runByrSyncImport.mockResolvedValueOnce({ importedThreads: 1 });

    await runBoardFullSyncJob(makeDeps() as never, makeInput());

    expect(runnerMocks.markJobRunning).toHaveBeenCalledWith("job-1");
  });

  it("returns cancelled when the running transition is rejected because the job was cancelled", async () => {
    const deps = {
      ...makeDeps(),
      markJobRunning: vi.fn(async () => ({ count: 0 })),
    };

    const result = await runBoardFullSyncJob(deps as never, makeInput());

    expect(result).toEqual({ status: "cancelled" });
    expect(runnerMocks.runByrSyncImport).not.toHaveBeenCalled();
  });

  it("runs sync import with board metadata and marks the job succeeded", async () => {
    runnerMocks.runByrSyncImport.mockResolvedValueOnce({ importedThreads: 1 });

    await runBoardFullSyncJob(makeDeps() as never, makeInput());

    expect(runnerMocks.runByrSyncImport).toHaveBeenCalledWith({
      prisma: { thread: {} },
      boardName: "JobInfo",
      windowMinutes: 999999,
      limit: 200,
    });
    expect(runnerMocks.markJobSucceeded).toHaveBeenCalledWith("job-1");
  });

  it("returns cancelled without marking success when the job is cancelled before completion", async () => {
    runnerMocks.runByrSyncImport.mockResolvedValueOnce({ importedThreads: 1 });
    const deps = {
      ...makeDeps(),
      findJobById: vi
        .fn()
        .mockResolvedValueOnce(makeJob())
        .mockResolvedValueOnce({
          ...makeJob(),
          status: "cancelled",
        }),
    };

    const result = await runBoardFullSyncJob(deps as never, makeInput());

    expect(result).toEqual({ status: "cancelled" });
    expect(runnerMocks.markJobSucceeded).not.toHaveBeenCalled();
  });

  it("marks the job failed when sync import throws", async () => {
    runnerMocks.runByrSyncImport.mockRejectedValueOnce(new Error("sync boom"));

    const result = await runBoardFullSyncJob(makeDeps() as never, makeInput());

    expect(result).toEqual({ status: "failed" });
    expect(runnerMocks.markJobFailed).toHaveBeenCalledWith("job-1", "sync boom");
  });

  it("returns cancelled without marking failure when the job is cancelled before an import error is handled", async () => {
    runnerMocks.runByrSyncImport.mockRejectedValueOnce(new Error("sync boom"));
    const deps = {
      ...makeDeps(),
      findJobById: vi
        .fn()
        .mockResolvedValueOnce(makeJob())
        .mockResolvedValueOnce({
          ...makeJob(),
          status: "cancelled",
        }),
    };

    const result = await runBoardFullSyncJob(deps as never, makeInput());

    expect(result).toEqual({ status: "cancelled" });
    expect(runnerMocks.markJobFailed).not.toHaveBeenCalled();
  });

  it("marks the job failed when required metadata is missing", async () => {
    const deps = {
      ...makeDeps(),
      findJobById: vi.fn(async () => ({
        id: "job-1",
        sourceLabel: "JobInfo",
        metadataJson: { boardName: "JobInfo" },
      })),
    };

    const result = await runBoardFullSyncJob(deps as never, makeInput());

    expect(result).toEqual({ status: "failed" });
    expect(runnerMocks.runByrSyncImport).not.toHaveBeenCalled();
    expect(runnerMocks.markJobFailed).toHaveBeenCalledWith(
      "job-1",
      "missing board full sync metadata: fullSyncWindowMinutes",
    );
  });

  it("marks the job failed when fullSyncWindowMinutes is not a positive finite number", async () => {
    const deps = {
      ...makeDeps(),
      findJobById: vi.fn(async () => ({
        id: "job-1",
        sourceLabel: "JobInfo",
        metadataJson: { boardName: "JobInfo", fullSyncWindowMinutes: 0 },
      })),
    };

    const result = await runBoardFullSyncJob(deps as never, makeInput());

    expect(result).toEqual({ status: "failed" });
    expect(runnerMocks.runByrSyncImport).not.toHaveBeenCalled();
    expect(runnerMocks.markJobFailed).toHaveBeenCalledWith(
      "job-1",
      "invalid board full sync metadata: fullSyncWindowMinutes",
    );
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
