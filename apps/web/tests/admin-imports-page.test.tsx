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

import { listRecentImportActivity } from "@/src/server/admin/listRecentImportActivity";
import { boardCatalog } from "@/src/server/boardSync/boardCatalog";

const selectableBoards = boardCatalog;

async function renderAdminImportsPage() {
  const { default: AdminImportsPage } = await import("../app/admin/imports/page");
  render(await AdminImportsPage());
}

describe("admin imports page", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock("@/src/server/boardSync/boardRegistry");
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders only boards enabled for manual full sync in the batch selection", async () => {
    const { boardCatalog: runtimeBoardCatalog } = await import("@/src/server/boardSync/boardCatalog");
    const board = runtimeBoardCatalog.find((item) => item.boardName === "JobInfo");
    expect(board).toBeTruthy();
    const previousValue = board?.fullSyncEnabled;
    if (board) {
      board.fullSyncEnabled = false;
    }
    prismaMock.import.findMany.mockResolvedValue([]);
    prismaMock.importJob.findMany.mockResolvedValue([
      {
        id: "job-1",
        jobType: "byr_board_full_sync_batch",
        sourceType: "byr_sync_api",
        sourceLabel: "multi-board full sync",
        status: "pending",
        cursorThreadKey: null,
        processedThreads: 0,
        processedReplies: 0,
        progressNote: "waiting for slot",
        skippedReplies: 0,
        errorMessage: null,
        startedAt: null,
        finishedAt: null,
      },
    ]);
    vi.mocked(listRecentImportActivity).mockResolvedValue([]);

    try {
      await renderAdminImportsPage();

      const batchStartButton = screen.getByRole("button", { name: "开始全量抓取" });

      expect(screen.getByText("选择要全量抓取的板块")).toBeTruthy();
      const enabledBoard = screen.getByRole("checkbox", { name: "IWhisper" });
      expect(enabledBoard).toBeTruthy();
      expect(enabledBoard.getAttribute("name")).toBe("boardNames");
      expect(enabledBoard.getAttribute("value")).toBe("IWhisper");
      expect(screen.queryByRole("checkbox", { name: "JobInfo" })).toBeNull();
      expect(screen.queryByRole("button", { name: /旧库导入/u })).toBeNull();
      expect(screen.queryByRole("button", { name: /开始抓取 .* 全量内容/u })).toBeNull();
      expect(screen.getByText("板块全量抓取任务")).toBeTruthy();
      expect(screen.getByRole("button", { name: "停止" })).toBeTruthy();
      expect(screen.getByText("waiting for slot")).toBeTruthy();
      expect(screen.getByText("当前将按首页目录顺序串行抓取：IWhisper")).toBeTruthy();

      const batchForm = batchStartButton.closest("form");
      expect(batchForm?.getAttribute("action")).toBe(
        "/admin/api/import-jobs/byr-board-full-sync-batch",
      );
      expect(
        Array.from(
          batchForm?.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="boardNames"]') ??
            [],
        ).map((input) => input.value),
      ).toEqual(["IWhisper"]);
      expect(batchForm?.querySelector('input[type="hidden"][name="boardNames"]')).toBeNull();
    } finally {
      if (board && previousValue !== undefined) {
        board.fullSyncEnabled = previousValue;
      }
    }
  });

  it("renders a stop action for pending board full-sync jobs", async () => {
    prismaMock.import.findMany.mockResolvedValue([]);
    prismaMock.importJob.findMany.mockResolvedValue([
      {
        id: "job-pending",
        jobType: "byr_board_full_sync_batch",
        sourceType: "byr_sync_api",
        sourceLabel: "multi-board full sync",
        status: "pending",
        cursorThreadKey: null,
        processedThreads: 0,
        processedReplies: 0,
        progressNote: "skipped by global throttle",
        skippedReplies: 0,
        errorMessage: null,
        startedAt: null,
        finishedAt: null,
      },
    ]);
    vi.mocked(listRecentImportActivity).mockResolvedValue([]);

    await renderAdminImportsPage();

    const stopButton = screen.getByRole("button", { name: "停止" });
    expect(stopButton.closest("form")?.getAttribute("action")).toBe(
      "/admin/api/import-jobs/job-pending/stop",
    );
    expect(screen.getByText("skipped by global throttle")).toBeTruthy();
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
        jobType: "byr_board_full_sync_batch",
        sourceType: "byr_sync_api",
        sourceLabel: "multi-board full sync",
        status: "running",
        cursorThreadKey: "2026-05-02T10:00:00.000Z|post-2",
        processedThreads: 3,
        processedReplies: 8,
        progressNote: null,
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
      {
        id: "import-job:job-2",
        kind: "import_job",
        title: "IWhisper",
        status: "paused",
        happenedAt: "2026-05-02T08:40:00.000Z",
        detail: "skipped by global throttle",
      },
    ]);

    await renderAdminImportsPage();

    expect(screen.getByRole("heading", { name: "导入导出" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "同步北邮人数据" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "开始全量抓取" })).toBeTruthy();
    expect(screen.getByText("选择要全量抓取的板块")).toBeTruthy();
    for (const board of selectableBoards) {
      if (board.fullSyncEnabled) {
        expect(screen.getByRole("checkbox", { name: board.boardName })).toBeTruthy();
      } else {
        expect(screen.queryByRole("checkbox", { name: board.boardName })).toBeNull();
      }
    }
    expect(screen.getByText("最近导入活动")).toBeTruthy();
    expect(screen.getByText("JobInfo · 任务")).toBeTruthy();
    expect(screen.getByText("IWhisper · 任务")).toBeTruthy();
    expect(screen.getByText("IWhisper updates")).toBeTruthy();
    expect(screen.getAllByText("状态：completed")).toHaveLength(2);
    expect(screen.getByText("skipped by global throttle")).toBeTruthy();
    expect(screen.getByText("帖子：3")).toBeTruthy();
    expect(screen.getByText("回复：10")).toBeTruthy();
    expect(screen.getByText("Sync API request failed: 401")).toBeTruthy();
    expect(screen.getByText("板块全量抓取任务")).toBeTruthy();
    expect(screen.getByText("byr_board_full_sync_batch")).toBeTruthy();
    expect(screen.queryByText(/legacy_/u)).toBeNull();
    expect(screen.getByText("running")).toBeTruthy();
    expect(screen.getByText("2026-05-02T10:00:00.000Z|post-2")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("8")).toBeTruthy();
    expect(screen.queryByText("LEGACY_DATABASE_URL missing")).toBeNull();
    expect(screen.queryByRole("button", { name: "继续" })).toBeNull();
    expect(screen.getAllByRole("button", { name: "停止" })).toHaveLength(1);

    expect(prismaMock.importJob.findMany).toHaveBeenCalledWith({
      where: { jobType: "byr_board_full_sync_batch" },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const batchForm = screen
      .getByRole("button", { name: "开始全量抓取" })
      .closest("form");
    expect(batchForm?.getAttribute("action")).toBe(
      "/admin/api/import-jobs/byr-board-full-sync-batch",
    );
    expect(
      Array.from(
        batchForm?.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="boardNames"]') ??
          [],
      ).map((input) => input.value),
    ).toEqual(selectableBoards.map((board) => board.boardName));
    expect(batchForm?.querySelector('input[type="hidden"][name="boardNames"]')).toBeNull();
  });
});
