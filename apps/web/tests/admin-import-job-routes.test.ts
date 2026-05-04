import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  createBoardFullSyncJob: vi.fn(),
  findJobById: vi.fn(),
  markJobFailed: vi.fn(),
  markJobPaused: vi.fn(),
  markJobRunning: vi.fn(),
  markJobCancelled: vi.fn(),
  markJobSucceeded: vi.fn(),
  updateJobProgress: vi.fn(),
  scheduleBoardFullSync: vi.fn(),
  prisma: {},
}));

vi.mock("@/src/server/db/client", () => ({
  prisma: routeMocks.prisma,
}));

vi.mock("@/src/server/imports/importJobStore", () => ({
  createBoardFullSyncJob: routeMocks.createBoardFullSyncJob,
  findJobById: routeMocks.findJobById,
  markJobFailed: routeMocks.markJobFailed,
  markJobPaused: routeMocks.markJobPaused,
  markJobRunning: routeMocks.markJobRunning,
  markJobCancelled: routeMocks.markJobCancelled,
  markJobSucceeded: routeMocks.markJobSucceeded,
  updateJobProgress: routeMocks.updateJobProgress,
}));

vi.mock("@/src/server/imports/scheduleBoardFullSync", () => ({
  scheduleBoardFullSync: routeMocks.scheduleBoardFullSync,
}));

import { POST as startPOST } from "../app/admin/api/import-jobs/byr-board-full-sync/route";
import { POST as resumePOST } from "../app/admin/api/import-jobs/[jobId]/resume/route";
import { POST as stopPOST } from "../app/admin/api/import-jobs/[jobId]/stop/route";

describe("admin import job routes", () => {
  const request = new Request("http://localhost/admin/api/import-jobs");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts a board full-sync job for a hard-coded board", async () => {
    routeMocks.createBoardFullSyncJob.mockResolvedValue({ id: "job-1" });
    const formData = new FormData();
    formData.set("boardName", "JobInfo");
    const request = new Request("http://localhost/admin/api/import-jobs/byr-board-full-sync", {
      method: "POST",
      body: formData,
    });

    const response = await startPOST(request);

    expect(routeMocks.createBoardFullSyncJob).toHaveBeenCalledWith(routeMocks.prisma, {
      boardName: "JobInfo",
      fullSyncWindowMinutes: 60 * 24 * 365 * 10,
    });
    expect(routeMocks.scheduleBoardFullSync).toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ ok: true, jobId: "job-1" });
  });

  it("returns 400 for an unknown board full-sync request", async () => {
    const formData = new FormData();
    formData.set("boardName", "UnknownBoard");
    const request = new Request("http://localhost/admin/api/import-jobs/byr-board-full-sync", {
      method: "POST",
      body: formData,
    });

    const response = await startPOST(request);

    expect(routeMocks.createBoardFullSyncJob).not.toHaveBeenCalled();
    expect(routeMocks.scheduleBoardFullSync).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Board full sync is not enabled",
    });
  });

  it("resumes a paused job by marking it running and kicking off the runner", async () => {
    routeMocks.findJobById.mockResolvedValue({
      id: "job-2",
      status: "paused",
      cursorThreadKey: "cursor-2",
    });
    routeMocks.markJobRunning.mockResolvedValue({});

    const response = await resumePOST(request, {
      params: Promise.resolve({ jobId: "job-2" }),
    });

    expect(routeMocks.findJobById).toHaveBeenCalledWith(routeMocks.prisma, "job-2");
    expect(routeMocks.markJobRunning).toHaveBeenCalledWith(routeMocks.prisma, "job-2", "cursor-2");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      jobId: "job-2",
    });
  });

  it("resumes a board full-sync job through the board full-sync scheduler path", async () => {
    routeMocks.findJobById.mockResolvedValue({
      id: "job-board-1",
      jobType: "byr_board_full_sync",
      status: "paused",
      cursorThreadKey: null,
      metadataJson: {
        boardName: "JobInfo",
      },
    });

    const response = await resumePOST(request, {
      params: Promise.resolve({ jobId: "job-board-1" }),
    });

    expect(routeMocks.findJobById).toHaveBeenCalledWith(routeMocks.prisma, "job-board-1");
    expect(routeMocks.markJobRunning).toHaveBeenCalledWith(routeMocks.prisma, "job-board-1");
    expect(routeMocks.scheduleBoardFullSync).toHaveBeenCalled();
    expect(routeMocks.markJobRunning.mock.invocationCallOrder[0]).toBeLessThan(
      routeMocks.scheduleBoardFullSync.mock.invocationCallOrder[0],
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      jobId: "job-board-1",
    });
  });

  it("stops a job by pausing it", async () => {
    routeMocks.findJobById.mockResolvedValue({
      id: "job-3",
      status: "running",
      cursorThreadKey: "cursor-3",
    });
    routeMocks.markJobPaused.mockResolvedValue({});

    const response = await stopPOST(request, {
      params: Promise.resolve({ jobId: "job-3" }),
    });

    expect(routeMocks.findJobById).toHaveBeenCalledWith(routeMocks.prisma, "job-3");
    expect(routeMocks.markJobPaused).toHaveBeenCalledWith(routeMocks.prisma, "job-3");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      jobId: "job-3",
      status: "paused",
    });
  });
});
