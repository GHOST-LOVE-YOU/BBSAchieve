import { describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  createLegacyImportJob: vi.fn(),
  findJobById: vi.fn(),
  markJobPaused: vi.fn(),
  markJobRunning: vi.fn(),
  runLegacyMigrationJob: vi.fn(),
  prisma: {},
}));

vi.mock("@/src/server/db/client", () => ({
  prisma: routeMocks.prisma,
}));

vi.mock("@/src/server/imports/importJobStore", () => ({
  createLegacyImportJob: routeMocks.createLegacyImportJob,
  findJobById: routeMocks.findJobById,
  markJobPaused: routeMocks.markJobPaused,
  markJobRunning: routeMocks.markJobRunning,
}));

vi.mock("@/src/server/imports/legacyMigrationRunner", () => ({
  runLegacyMigrationJob: routeMocks.runLegacyMigrationJob,
}));

import { POST as startPOST } from "../app/admin/api/import-jobs/legacy-iwhisper/route";
import { POST as resumePOST } from "../app/admin/api/import-jobs/[jobId]/resume/route";
import { POST as stopPOST } from "../app/admin/api/import-jobs/[jobId]/stop/route";

describe("admin import job routes", () => {
  it("starts a legacy iwhisper migration job and kicks off the runner", async () => {
    routeMocks.createLegacyImportJob.mockResolvedValue({ id: "job-1" });

    const response = await startPOST();

    expect(routeMocks.createLegacyImportJob).toHaveBeenCalledWith(routeMocks.prisma);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      jobId: "job-1",
    });
  });

  it("resumes a paused job by marking it running and kicking off the runner", async () => {
    routeMocks.findJobById.mockResolvedValue({
      id: "job-2",
      status: "paused",
      cursorThreadKey: "cursor-2",
    });
    routeMocks.markJobRunning.mockResolvedValue({});

    const response = await resumePOST({}, { params: Promise.resolve({ jobId: "job-2" }) } as any);

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

    const response = await stopPOST({}, { params: Promise.resolve({ jobId: "job-3" }) } as any);

    expect(routeMocks.findJobById).toHaveBeenCalledWith(routeMocks.prisma, "job-3");
    expect(routeMocks.markJobPaused).toHaveBeenCalledWith(routeMocks.prisma, "job-3");
    expect(routeMocks.runLegacyMigrationJob).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      jobId: "job-3",
      status: "paused",
    });
  });
});
