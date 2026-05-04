import { describe, expect, it, vi } from "vitest";

vi.mock("@/src/server/db/client", () => ({
  prisma: {},
}));

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
        jobType: "byr_board_full_sync_batch",
        sourceLabel: "multi-board full sync",
        status: "running",
        createdAt: new Date("2026-05-02T09:30:00.000Z"),
        startedAt: new Date("2026-05-02T09:35:00.000Z"),
        finishedAt: null,
        processedThreads: 4,
        processedReplies: 12,
        progressNote: null,
        errorMessage: null,
        metadataJson: {
          selectedBoardNames: ["IWhisper", "JobInfo"],
          orderedBoardNames: ["IWhisper", "JobInfo"],
          completedBoardNames: ["IWhisper"],
          currentBoardName: "JobInfo",
          failedBoardName: null,
          currentBoardIndex: 1,
          perBoardStats: {
            IWhisper: {
              processedThreads: 4,
              processedReplies: 12,
            },
          },
        },
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
        metadataJson: true,
      },
    });
    expect(result.map((item) => item.id)).toEqual([
      "import-job:job-1",
      "import:import-1",
      "import:import-2",
    ]);
    expect(result[0]).toMatchObject({
      kind: "import_job",
      title: "multi-board full sync",
      status: "running",
      happenedAt: "2026-05-02T09:35:00.000Z",
      detail: "当前板块 JobInfo",
    });
    expect(result[1]).toMatchObject({
      kind: "import",
      title: "北邮人同步",
      status: "completed",
      happenedAt: "2026-05-02T09:10:00.000Z",
    });
  });

  it("renders failed batch jobs from metadata even when the runner leaves a progress note", async () => {
    const result = await listRecentImportActivity({
      import: { findMany: vi.fn(async () => []) } as any,
      importJob: {
        findMany: vi.fn(async () => [
          {
            id: "job-1",
            jobType: "byr_board_full_sync_batch",
            sourceLabel: "multi-board full sync",
            status: "failed",
            createdAt: new Date("2026-05-04T10:00:00.000Z"),
            startedAt: new Date("2026-05-04T10:02:00.000Z"),
            finishedAt: new Date("2026-05-04T10:03:00.000Z"),
            processedThreads: 0,
            processedReplies: 0,
            progressNote: "板块 JobInfo 失败",
            errorMessage: "JobInfo exploded",
            metadataJson: {
              selectedBoardNames: ["IWhisper", "JobInfo"],
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
          },
        ]),
      } as any,
    });

    expect(result[0]).toMatchObject({
      id: "import-job:job-1",
      kind: "import_job",
      title: "multi-board full sync",
      status: "failed",
      detail: "失败板块 JobInfo",
    });
  });

  it("prefers progress notes over metadata detail for paused batch jobs", async () => {
    const result = await listRecentImportActivity({
      import: { findMany: vi.fn(async () => []) } as any,
      importJob: {
        findMany: vi.fn(async () => [
          {
            id: "job-2",
            jobType: "byr_board_full_sync_batch",
            sourceLabel: "multi-board full sync",
            status: "paused",
            createdAt: new Date("2026-05-04T10:00:00.000Z"),
            startedAt: new Date("2026-05-04T10:02:00.000Z"),
            finishedAt: new Date("2026-05-04T10:03:00.000Z"),
            processedThreads: 0,
            processedReplies: 0,
            progressNote: "等待全局抓取窗口，当前板块 JobInfo",
            errorMessage: null,
            metadataJson: {
              selectedBoardNames: ["IWhisper", "JobInfo"],
              orderedBoardNames: ["IWhisper", "JobInfo"],
              completedBoardNames: ["IWhisper"],
              currentBoardName: "JobInfo",
              failedBoardName: null,
              currentBoardIndex: 1,
              perBoardStats: {
                IWhisper: {
                  processedThreads: 2,
                  processedReplies: 6,
                },
              },
            },
          },
        ]),
      } as any,
    });

    expect(result[0]).toMatchObject({
      id: "import-job:job-2",
      kind: "import_job",
      title: "multi-board full sync",
      status: "paused",
      detail: "等待全局抓取窗口，当前板块 JobInfo",
    });
  });

  it("prefers progress notes over zeroed counters for pending jobs", async () => {
    const result = await listRecentImportActivity({
      import: { findMany: vi.fn(async () => []) } as any,
      importJob: {
        findMany: vi.fn(async () => [
          {
            id: "job-3",
            jobType: "byr_board_full_sync_batch",
            sourceLabel: "multi-board full sync",
            status: "pending",
            createdAt: new Date("2026-05-04T11:00:00.000Z"),
            startedAt: null,
            finishedAt: null,
            processedThreads: 0,
            processedReplies: 0,
            progressNote: "等待全局抓取窗口，当前板块 IWhisper",
            errorMessage: null,
            metadataJson: {
              selectedBoardNames: ["IWhisper", "JobInfo"],
              orderedBoardNames: ["IWhisper", "JobInfo"],
              completedBoardNames: [],
              currentBoardName: "IWhisper",
              failedBoardName: null,
              currentBoardIndex: 0,
              perBoardStats: {},
            },
          },
        ]),
      } as any,
    });

    expect(result[0]).toMatchObject({
      id: "import-job:job-3",
      status: "pending",
      detail: "等待全局抓取窗口，当前板块 IWhisper",
    });
  });
});
