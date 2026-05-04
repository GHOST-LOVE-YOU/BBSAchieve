import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  createBoardBatchFullSyncJob: vi.fn(),
  findJobById: vi.fn(),
  markJobFailed: vi.fn(),
  markJobPaused: vi.fn(),
  markJobRunning: vi.fn(),
  markJobCancelled: vi.fn(),
  markJobSucceeded: vi.fn(),
  updateJobProgress: vi.fn(),
  scheduleBoardBatchFullSync: vi.fn(),
  scheduleBoardBatchFullSyncRun: vi.fn(),
  prisma: {},
}));

vi.mock("@/src/server/db/client", () => ({
  prisma: routeMocks.prisma,
}));

vi.mock("@/src/server/imports/importJobStore", () => ({
  createBoardBatchFullSyncJob: routeMocks.createBoardBatchFullSyncJob,
  findJobById: routeMocks.findJobById,
  markJobFailed: routeMocks.markJobFailed,
  markJobPaused: routeMocks.markJobPaused,
  markJobRunning: routeMocks.markJobRunning,
  markJobCancelled: routeMocks.markJobCancelled,
  markJobSucceeded: routeMocks.markJobSucceeded,
  updateJobProgress: routeMocks.updateJobProgress,
}));

vi.mock("@/src/server/imports/scheduleBoardBatchFullSync", () => ({
  scheduleBoardBatchFullSync: routeMocks.scheduleBoardBatchFullSync,
  scheduleBoardBatchFullSyncRun: routeMocks.scheduleBoardBatchFullSyncRun,
}));

import { POST as startPOST } from "../app/admin/api/import-jobs/byr-board-full-sync-batch/route";
import { POST as resumePOST } from "../app/admin/api/import-jobs/[jobId]/resume/route";
import { POST as stopPOST } from "../app/admin/api/import-jobs/[jobId]/stop/route";

describe("admin import job routes", () => {
  const request = new Request("http://localhost/admin/api/import-jobs");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates one batch job from multiple selected boards and reorders them by catalog order", async () => {
    routeMocks.createBoardBatchFullSyncJob.mockResolvedValue({ id: "job-batch-1" });
    const formData = new FormData();
    formData.append("boardNames", "JobInfo");
    formData.append("boardNames", "IWhisper");
    const request = new Request("http://localhost/admin/api/import-jobs/byr-board-full-sync-batch", {
      method: "POST",
      body: formData,
    });

    const response = await startPOST(request);

    expect(routeMocks.createBoardBatchFullSyncJob).toHaveBeenCalledWith(
      routeMocks.prisma,
      {
        selectedBoardNames: ["JobInfo", "IWhisper"],
        orderedBoardNames: ["IWhisper", "JobInfo"],
      },
    );
    expect(routeMocks.scheduleBoardBatchFullSync).toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ ok: true, jobId: "job-batch-1" });
  });

  it("returns 400 when no boards are selected", async () => {
    const formData = new FormData();
    const request = new Request("http://localhost/admin/api/import-jobs/byr-board-full-sync-batch", {
      method: "POST",
      body: formData,
    });

    const response = await startPOST(request);

    expect(routeMocks.createBoardBatchFullSyncJob).not.toHaveBeenCalled();
    expect(routeMocks.scheduleBoardBatchFullSyncRun).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "At least one board must be selected",
    });
  });

  it("returns 400 for an unknown board in the batch selection", async () => {
    const formData = new FormData();
    formData.append("boardNames", "UnknownBoard");
    const request = new Request("http://localhost/admin/api/import-jobs/byr-board-full-sync-batch", {
      method: "POST",
      body: formData,
    });

    const response = await startPOST(request);

    expect(routeMocks.createBoardBatchFullSyncJob).not.toHaveBeenCalled();
    expect(routeMocks.scheduleBoardBatchFullSync).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Unknown board selection",
    });
  });

  it("rejects resuming a non-batch full-sync job", async () => {
    routeMocks.findJobById.mockResolvedValue({
      id: "job-2",
      jobType: "some_other_job",
      status: "paused",
      cursorThreadKey: "cursor-2",
    });

    const response = await resumePOST(request, {
      params: Promise.resolve({ jobId: "job-2" }),
    });

    expect(routeMocks.findJobById).toHaveBeenCalledWith(routeMocks.prisma, "job-2");
    expect(routeMocks.markJobRunning).not.toHaveBeenCalled();
    expect(routeMocks.scheduleBoardBatchFullSync).not.toHaveBeenCalled();
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Only batch full sync jobs can be resumed",
    });
  });

  it("resumes a batch full-sync job through the batch scheduler path", async () => {
    routeMocks.findJobById.mockResolvedValue({
      id: "job-batch-1",
      jobType: "byr_board_full_sync_batch",
      status: "failed",
      metadataJson: {
        selectedBoardNames: ["JobInfo", "IWhisper"],
        orderedBoardNames: ["IWhisper", "JobInfo"],
        completedBoardNames: ["IWhisper"],
        currentBoardName: "JobInfo",
        failedBoardName: "JobInfo",
        currentBoardIndex: 1,
        perBoardStats: {
          IWhisper: {
            processedThreads: 2,
            processedReplies: 6,
          },
        },
      },
    });

    const response = await resumePOST(request, {
      params: Promise.resolve({ jobId: "job-batch-1" }),
    });

    expect(routeMocks.findJobById).toHaveBeenCalledWith(routeMocks.prisma, "job-batch-1");
    expect(routeMocks.markJobRunning).toHaveBeenCalledWith(routeMocks.prisma, "job-batch-1");
    expect(routeMocks.scheduleBoardBatchFullSyncRun).toHaveBeenCalledWith({
      jobId: "job-batch-1",
      alreadyMarkedRunning: true,
    });
    expect(routeMocks.markJobRunning.mock.invocationCallOrder[0]).toBeLessThan(
      routeMocks.scheduleBoardBatchFullSyncRun.mock.invocationCallOrder[0],
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      jobId: "job-batch-1",
    });
  });

  it("does not resume a batch full-sync job if the running transition is rejected after cancellation", async () => {
    routeMocks.findJobById.mockResolvedValue({
      id: "job-batch-2",
      jobType: "byr_board_full_sync_batch",
      status: "paused",
      metadataJson: {
        selectedBoardNames: ["JobInfo", "IWhisper"],
        orderedBoardNames: ["IWhisper", "JobInfo"],
        completedBoardNames: [],
        currentBoardName: "IWhisper",
        failedBoardName: null,
        currentBoardIndex: 0,
        perBoardStats: {},
      },
    });
    routeMocks.markJobRunning.mockResolvedValue({ count: 0 });

    const response = await resumePOST(request, {
      params: Promise.resolve({ jobId: "job-batch-2" }),
    });

    expect(routeMocks.findJobById).toHaveBeenCalledWith(routeMocks.prisma, "job-batch-2");
    expect(routeMocks.markJobRunning).toHaveBeenCalledWith(routeMocks.prisma, "job-batch-2");
    expect(routeMocks.scheduleBoardBatchFullSyncRun).not.toHaveBeenCalled();
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Job is no longer resumable",
    });
  });

  it("stops a board full-sync job by cancelling it", async () => {
    routeMocks.findJobById.mockResolvedValue({
      id: "job-3",
      status: "running",
      jobType: "byr_board_full_sync",
    });
    routeMocks.markJobCancelled.mockResolvedValue({});

    const response = await stopPOST(request, {
      params: Promise.resolve({ jobId: "job-3" }),
    });

    expect(routeMocks.findJobById).toHaveBeenCalledWith(routeMocks.prisma, "job-3");
    expect(routeMocks.markJobCancelled).toHaveBeenCalledWith(routeMocks.prisma, "job-3");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      jobId: "job-3",
      status: "cancelled",
    });
  });

  it("does not stop a board full-sync job if the cancel transition is rejected at write time", async () => {
    routeMocks.findJobById.mockResolvedValue({
      id: "job-5",
      status: "running",
      jobType: "byr_board_full_sync",
    });
    routeMocks.markJobCancelled.mockResolvedValue({ count: 0 });

    const response = await stopPOST(request, {
      params: Promise.resolve({ jobId: "job-5" }),
    });

    expect(routeMocks.findJobById).toHaveBeenCalledWith(routeMocks.prisma, "job-5");
    expect(routeMocks.markJobCancelled).toHaveBeenCalledWith(routeMocks.prisma, "job-5");
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Job is no longer stoppable",
    });
  });

  it("rejects stopping a non-board full-sync job", async () => {
    routeMocks.findJobById.mockResolvedValue({
      id: "job-4",
      status: "running",
      jobType: "some_other_job",
      cursorThreadKey: "cursor-4",
    });

    const response = await stopPOST(request, {
      params: Promise.resolve({ jobId: "job-4" }),
    });

    expect(routeMocks.findJobById).toHaveBeenCalledWith(routeMocks.prisma, "job-4");
    expect(routeMocks.markJobPaused).not.toHaveBeenCalled();
    expect(routeMocks.markJobCancelled).not.toHaveBeenCalled();
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Only board full sync jobs can be stopped",
    });
  });
});
