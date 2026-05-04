import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  import: {
    findMany: vi.fn(),
  },
  importJob: {
    findMany: vi.fn(),
  },
  recentActivity: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/src/server/db/client", () => ({
  prisma: prismaMock,
}));

vi.mock("@/src/server/admin/listRecentImportActivity", () => ({
  listRecentImportActivity: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  },
}));

import AdminImportsPage from "../app/admin/imports/page";
import { listRecentImportActivity } from "@/src/server/admin/listRecentImportActivity";

describe("admin imports page", () => {
  it("renders the sync entry, recent activity, and recent imports", async () => {
    prismaMock.import.findMany.mockResolvedValue([
      {
        id: "import-1",
        sourceLabel: "IWhisper updates",
        status: "completed",
        importedThreads: 3,
        importedReplies: 10,
        errorMessage: null,
      },
      {
        id: "import-2",
        sourceLabel: "mirror-archive",
        status: "failed",
        importedThreads: 1,
        importedReplies: 0,
        errorMessage: "Sync API request failed: 401",
      },
    ]);
    prismaMock.importJob.findMany.mockResolvedValue([
      {
        id: "job-1",
        jobType: "legacy_iwhisper_migration",
        sourceType: "legacy_postgres",
        sourceLabel: "legacy iwhisper",
        status: "running",
        cursorThreadKey: "2026-05-02T10:00:00.000Z|post-2",
        processedThreads: 3,
        processedReplies: 8,
        skippedReplies: 1,
        errorMessage: null,
        startedAt: new Date("2026-05-02T09:00:00.000Z"),
        finishedAt: null,
      },
      {
        id: "job-2",
        jobType: "legacy_iwhisper_migration",
        sourceType: "legacy_postgres",
        sourceLabel: "legacy iwhisper",
        status: "paused",
        cursorThreadKey: null,
        processedThreads: 0,
        processedReplies: 0,
        skippedReplies: 0,
        errorMessage: "LEGACY_DATABASE_URL missing",
        startedAt: new Date("2026-05-01T09:00:00.000Z"),
        finishedAt: null,
      },
    ]);
    vi.mocked(listRecentImportActivity).mockResolvedValue([
      {
        id: "import-job:job-1",
        kind: "import_job",
        title: "legacy iwhisper",
        status: "running",
        happenedAt: "2026-05-02T09:00:00.000Z",
        detail: "帖子 3，回复 8",
      },
      {
        id: "import:import-1",
        kind: "import",
        title: "IWhisper updates",
        status: "completed",
        happenedAt: "2026-05-02T08:50:00.000Z",
        detail: "帖子 3，回复 10",
      },
    ]);

    render(await AdminImportsPage());

    expect(screen.getByText("导入导出")).toBeTruthy();
    expect(screen.getByRole("button", { name: "同步北邮人数据" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "从旧库导入 iwhisper" })).toBeTruthy();
    expect(screen.getByText("最近导入活动")).toBeTruthy();
    expect(screen.getByText("legacy iwhisper · 任务")).toBeTruthy();
    expect(screen.getByText("IWhisper updates")).toBeTruthy();
    expect(screen.getAllByText("状态：completed")).toHaveLength(2);
    expect(screen.getByText("帖子：3")).toBeTruthy();
    expect(screen.getByText("回复：10")).toBeTruthy();
    expect(screen.getByText("Sync API request failed: 401")).toBeTruthy();
    expect(screen.getByText("旧库迁移任务")).toBeTruthy();
    expect(screen.getAllByText("legacy_iwhisper_migration")).toHaveLength(2);
    expect(screen.getByText("running")).toBeTruthy();
    expect(screen.getByText("2026-05-02T10:00:00.000Z|post-2")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("8")).toBeTruthy();
    expect(screen.getByText("LEGACY_DATABASE_URL missing")).toBeTruthy();
    expect(screen.getByRole("button", { name: "继续" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "停止" })).toHaveLength(2);

    const boardFullSyncButton = screen.getByRole("button", { name: "从旧库导入 iwhisper" });
    const boardFullSyncForm = boardFullSyncButton.closest("form");
    expect(boardFullSyncForm?.getAttribute("action")).toBe("/admin/api/import-jobs/byr-board-full-sync");
    const boardNameInput = boardFullSyncForm?.querySelector('input[name="boardName"]');
    expect(boardNameInput?.getAttribute("value")).toBe("JobInfo");
  });
});
