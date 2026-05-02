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
        jobType: "legacy_iwhisper_migration",
        sourceLabel: "旧库 iwhisper",
        status: "running",
        createdAt: new Date("2026-05-02T09:30:00.000Z"),
        startedAt: new Date("2026-05-02T09:35:00.000Z"),
        finishedAt: null,
        processedThreads: 4,
        processedReplies: 12,
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
      title: "旧库 iwhisper",
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
});
