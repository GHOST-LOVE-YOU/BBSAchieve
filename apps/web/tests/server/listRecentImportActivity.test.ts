import { describe, expect, it, vi } from "vitest";

import { listRecentImportActivity } from "@/src/server/admin/listRecentImportActivity";

describe("listRecentImportActivity", () => {
  it("merges imports and jobs and sorts by most recent activity first", async () => {
    const importFindMany = vi.fn(async () => [
      {
        id: "import-1",
        sourceLabel: "北邮人同步",
        status: "completed",
        startedAt: new Date("2026-05-02T09:00:00.000Z"),
        finishedAt: new Date("2026-05-02T09:10:00.000Z"),
        importedThreads: 3,
        importedReplies: 10,
        errorMessage: null,
      },
      {
        id: "import-2",
        sourceLabel: "镜像补拉",
        status: "failed",
        startedAt: new Date("2026-05-02T08:00:00.000Z"),
        finishedAt: new Date("2026-05-02T08:05:00.000Z"),
        importedThreads: 1,
        importedReplies: 0,
        errorMessage: "Sync API request failed: 401",
      },
    ]);
    const importJobFindMany = vi.fn(async () => [
      {
        id: "job-1",
        jobType: "byr_board_full_sync",
        sourceLabel: "JobInfo",
        status: "running",
        createdAt: new Date("2026-05-02T09:30:00.000Z"),
        startedAt: new Date("2026-05-02T09:35:00.000Z"),
        finishedAt: null,
        processedThreads: 4,
        processedReplies: 12,
        progressNote: null,
        errorMessage: null,
      },
    ]);

    const result = await listRecentImportActivity({
      import: { findMany: importFindMany } as any,
      importJob: { findMany: importJobFindMany } as any,
    });

    expect(importFindMany).toHaveBeenCalledWith({
      orderBy: { startedAt: "desc" },
      take: 20,
      select: {
        id: true,
        sourceLabel: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        importedThreads: true,
        importedReplies: true,
        errorMessage: true,
      },
    });
    expect(importJobFindMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        jobType: true,
        sourceLabel: true,
        status: true,
        createdAt: true,
        startedAt: true,
        finishedAt: true,
        processedThreads: true,
        processedReplies: true,
        progressNote: true,
        errorMessage: true,
      },
    });
    expect(result.map((item) => item.id)).toEqual([
      "import-job:job-1",
      "import:import-1",
      "import:import-2",
    ]);
    expect(result[0]).toMatchObject({
      kind: "import_job",
      title: "JobInfo",
      status: "running",
      happenedAt: "2026-05-02T09:35:00.000Z",
    });
    expect(result[1]).toMatchObject({
      kind: "import",
      title: "北邮人同步",
      status: "completed",
      happenedAt: "2026-05-02T09:10:00.000Z",
    });
  });

  it("renders board full-sync jobs with board names as titles", async () => {
    const result = await listRecentImportActivity({
      import: { findMany: vi.fn(async () => []) } as any,
      importJob: {
        findMany: vi.fn(async () => [
          {
            id: "job-1",
            jobType: "byr_board_full_sync",
            sourceLabel: "JobInfo",
            status: "paused",
            createdAt: new Date("2026-05-04T10:00:00.000Z"),
            startedAt: null,
            finishedAt: null,
            processedThreads: 0,
            processedReplies: 0,
            progressNote: "skipped by global throttle",
            errorMessage: null,
          },
        ]),
      } as any,
    });

    expect(result[0]).toMatchObject({
      id: "import-job:job-1",
      kind: "import_job",
      title: "JobInfo",
      status: "paused",
      detail: "skipped by global throttle",
    });
  });
});
