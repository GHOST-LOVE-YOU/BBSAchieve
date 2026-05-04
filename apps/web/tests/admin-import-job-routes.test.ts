import { describe, expect, it, vi } from "vitest";

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

  it("starts a board full-sync job for a hard-coded board", async () => {
    routeMocks.createBoardFullSyncJob.mockResolvedValue({ id: "job-1" });
    const formData = new FormData();
    formData.set("boardName", "JobInfo");
    const request = new Request("http://localhost/admin/api/import-jobs/byr-board-full-sync", {
      method: "POST",
      body: formData,
    });

    const response = await startPOST(request);

    expect(routeMocks.createBoardFullSyncJob).toHaveBeenCalled();
    expect(routeMocks.scheduleBoardFullSync).toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ ok: true, jobId: "job-1" });
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
