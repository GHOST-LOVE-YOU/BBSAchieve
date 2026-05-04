import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  import: {
    findMany: vi.fn(),
  },
  importJob: {
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
import { boardSyncBoards } from "@/src/server/boardSync/boardRegistry";

const fullSyncBoards = boardSyncBoards.filter((board) => board.fullSyncEnabled);

describe("admin imports page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders board full-sync actions without old import controls", async () => {
    prismaMock.import.findMany.mockResolvedValue([]);
    prismaMock.importJob.findMany.mockResolvedValue([
      {
        id: "job-1",
        jobType: "byr_board_full_sync",
        sourceType: "byr_sync_api",
        sourceLabel: "JobInfo",
        status: "paused",
        cursorThreadKey: null,
        processedThreads: 0,
        processedReplies: 0,
        skippedReplies: 0,
        errorMessage: null,
        startedAt: null,
        finishedAt: null,
      },
    ]);
    vi.mocked(listRecentImportActivity).mockResolvedValue([]);

    render(await AdminImportsPage());

    const boardFullSyncButtons = screen.getAllByRole("button", {
      name: /开始抓取 .* 全量内容/u,
    });

    expect(boardFullSyncButtons).toHaveLength(fullSyncBoards.length);
    expect(boardFullSyncButtons.map((button) => button.textContent)).toEqual(
      fullSyncBoards.map((board) => `开始抓取 ${board.boardName} 全量内容`),
    );
    expect(screen.queryByRole("button", { name: /旧库导入/u })).toBeNull();
    expect(screen.getByText("板块全量抓取任务")).toBeTruthy();

    const boardFullSyncForms = boardFullSyncButtons.map((button) => button.closest("form"));
    expect(boardFullSyncForms.map((form) => form?.getAttribute("action"))).toEqual(
      fullSyncBoards.map(() => "/admin/api/import-jobs/byr-board-full-sync"),
    );
    expect(
      boardFullSyncForms.map((form) =>
        form?.querySelector<HTMLInputElement>('input[name="boardName"]')?.value,
      ),
    ).toEqual(fullSyncBoards.map((board) => board.boardName));
  });

  it("renders the sync entry, recent activity, and import jobs including board full-sync tasks", async () => {
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
        jobType: "byr_board_full_sync",
        sourceType: "byr_sync_api",
        sourceLabel: "JobInfo",
        status: "running",
        cursorThreadKey: "2026-05-02T10:00:00.000Z|post-2",
        processedThreads: 3,
        processedReplies: 8,
        skippedReplies: 1,
        errorMessage: null,
        startedAt: new Date("2026-05-02T09:00:00.000Z"),
        finishedAt: null,
      },
    ]);
    vi.mocked(listRecentImportActivity).mockResolvedValue([
      {
        id: "import-job:job-1",
        kind: "import_job",
        title: "JobInfo",
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

    expect(screen.getByRole("heading", { name: "导入导出" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "同步北邮人数据" })).toBeTruthy();
    for (const board of fullSyncBoards) {
      expect(
        screen.getByRole("button", { name: `开始抓取 ${board.boardName} 全量内容` }),
      ).toBeTruthy();
    }
    expect(screen.getByText("最近导入活动")).toBeTruthy();
    expect(screen.getByText("JobInfo · 任务")).toBeTruthy();
    expect(screen.getByText("IWhisper updates")).toBeTruthy();
    expect(screen.getAllByText("状态：completed")).toHaveLength(2);
    expect(screen.getByText("帖子：3")).toBeTruthy();
    expect(screen.getByText("回复：10")).toBeTruthy();
    expect(screen.getByText("Sync API request failed: 401")).toBeTruthy();
    expect(screen.getByText("板块全量抓取任务")).toBeTruthy();
    expect(screen.getByText("byr_board_full_sync")).toBeTruthy();
    expect(screen.queryByText(/legacy_/u)).toBeNull();
    expect(screen.getByText("running")).toBeTruthy();
    expect(screen.getByText("2026-05-02T10:00:00.000Z|post-2")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("8")).toBeTruthy();
    expect(screen.queryByText("LEGACY_DATABASE_URL missing")).toBeNull();
    expect(screen.queryByRole("button", { name: "继续" })).toBeNull();
    expect(screen.getAllByRole("button", { name: "停止" })).toHaveLength(1);

    expect(prismaMock.importJob.findMany).toHaveBeenCalledWith({
      where: { jobType: "byr_board_full_sync" },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const boardFullSyncButtons = screen.getAllByRole("button", {
      name: /开始抓取 .* 全量内容/u,
    });
    expect(boardFullSyncButtons).toHaveLength(fullSyncBoards.length);
    const boardFullSyncForms = boardFullSyncButtons.map((button) => button.closest("form"));
    expect(boardFullSyncForms.map((form) => form?.getAttribute("action"))).toEqual(
      fullSyncBoards.map(() => "/admin/api/import-jobs/byr-board-full-sync"),
    );
    expect(
      boardFullSyncForms.map((form) =>
        form?.querySelector<HTMLInputElement>('input[name="boardName"]')?.value,
      ),
    ).toEqual(fullSyncBoards.map((board) => board.boardName));
  });
});
