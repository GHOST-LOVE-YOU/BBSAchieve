import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
import {
  boardCatalog,
  boardCatalogSections,
} from "@/src/server/boardSync/boardCatalog";

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

  it("renders grouped homepage sections with unchecked board checkboxes", async () => {
    const { boardCatalogSections: runtimeBoardCatalogSections } = await import(
      "@/src/server/boardSync/boardCatalog"
    );
    const board = runtimeBoardCatalogSections
      .flatMap((section) => [...section.boards])
      .find((item) => item.boardName === "JobInfo");
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
      expect(screen.getByText("以下目录来自首页固化板块清单")).toBeTruthy();
      expect(screen.getByText("只会抓取已勾选板块，执行顺序按首页目录顺序。")).toBeTruthy();
      expect(screen.getByText("当前已选择 0 个板块")).toBeTruthy();
      expect(screen.getByText(boardCatalogSections[0]!.sectionName)).toBeTruthy();
      const enabledBoard = screen.getByRole("checkbox", { name: "悄悄话" });
      expect(enabledBoard).toBeTruthy();
      expect((enabledBoard as HTMLInputElement).checked).toBe(false);
      expect(enabledBoard.getAttribute("name")).toBe("boardNames");
      expect(enabledBoard.getAttribute("value")).toBe("IWhisper");
      expect(screen.queryByRole("checkbox", { name: "招聘信息专版" })).toBeNull();
      expect(screen.getAllByRole("button", { name: "全选本分区" })).toHaveLength(
        boardCatalogSections.length,
      );
      expect(screen.getAllByRole("button", { name: "取消本分区" })).toHaveLength(
        boardCatalogSections.length,
      );
      expect(screen.queryByRole("button", { name: /旧库导入/u })).toBeNull();
      expect(screen.queryByRole("button", { name: /开始抓取 .* 全量内容/u })).toBeNull();
      expect(screen.getByText("板块全量抓取任务")).toBeTruthy();
      expect(screen.getByRole("button", { name: "停止" })).toBeTruthy();
      expect(screen.getByText("waiting for slot")).toBeTruthy();

      const batchForm = batchStartButton.closest("form");
      const syncForm = screen
        .getByRole("button", { name: "同步北邮人数据" })
        .closest("form");
      expect(
        (syncForm?.querySelector('input[name="redirectTo"]') as HTMLInputElement | null)?.value,
      ).toBe("/admin/imports");
      expect(batchForm?.getAttribute("action")).toBe(
        "/admin/api/import-jobs/byr-board-full-sync-batch",
      );
      expect(
        (batchForm?.querySelector('input[name="redirectTo"]') as HTMLInputElement | null)?.value,
      ).toBe("/admin/imports");
      expect(
        Array.from(
          batchForm?.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="boardNames"]') ??
            [],
        ).map((input) => input.value),
      ).toEqual(
        runtimeBoardCatalogSections
          .flatMap((section) => [...section.boards])
          .filter((item) => item.fullSyncEnabled)
          .map((item) => item.boardName),
      );
      expect(
        batchForm?.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="boardNames"]')
          .length,
      ).toBe(
        runtimeBoardCatalogSections
          .flatMap((section) => [...section.boards])
          .filter((item) => item.fullSyncEnabled).length,
      );
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
    const stopForm = stopButton.closest("form");
    expect(stopForm?.getAttribute("action")).toBe(
      "/admin/api/import-jobs/job-pending/stop",
    );
    expect(
      (stopForm?.querySelector('input[name="redirectTo"]') as HTMLInputElement | null)?.value,
    ).toBe("/admin/imports");
    expect(screen.getByText("skipped by global throttle")).toBeTruthy();
  });

  it(
    "renders the sync entry, recent activity, and import jobs including board full-sync tasks",
    async () => {
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
      expect(screen.getByText("北邮校园")).toBeTruthy();
      expect(screen.getByText("信息社会")).toBeTruthy();
      expect(screen.getByText("生活时尚")).toBeTruthy();
    const renderedCheckboxes = screen.getAllByRole("checkbox");
    expect(renderedCheckboxes).toHaveLength(
      selectableBoards.filter((board) => board.fullSyncEnabled).length,
    );
    expect(renderedCheckboxes.every((checkbox) => !(checkbox as HTMLInputElement).checked)).toBe(
      true,
    );
    expect(screen.getByRole("checkbox", { name: "北邮教务处" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "招聘信息专版" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "悄悄话" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "全选本分区" })).toHaveLength(
      boardCatalogSections.length,
    );
    expect(screen.getAllByRole("button", { name: "取消本分区" })).toHaveLength(
      boardCatalogSections.length,
    );
    expect(screen.getByText("当前已选择 0 个板块")).toBeTruthy();
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
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    const batchForm = screen
      .getByRole("button", { name: "开始全量抓取" })
      .closest("form");
    expect(batchForm?.getAttribute("action")).toBe(
      "/admin/api/import-jobs/byr-board-full-sync-batch",
    );
    expect(
      (batchForm?.querySelector('input[name="redirectTo"]') as HTMLInputElement | null)?.value,
    ).toBe("/admin/imports");
    expect(
      Array.from(
        batchForm?.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="boardNames"]') ??
          [],
      ).map((input) => input.value),
    ).toEqual(selectableBoards.map((board) => board.boardName));
    expect(batchForm?.querySelector('input[type="hidden"][name="boardNames"]')).toBeNull();
    },
    15000,
  );

  it("selects and clears boards within a section", async () => {
    prismaMock.import.findMany.mockResolvedValue([]);
    prismaMock.importJob.findMany.mockResolvedValue([]);
    vi.mocked(listRecentImportActivity).mockResolvedValue([]);

    const user = userEvent.setup();
    await renderAdminImportsPage();

    const iwhisperCheckbox = screen.getByRole("checkbox", { name: "悄悄话" });
    const talkingCheckbox = screen.getByRole("checkbox", { name: "谈天说地" });
    const iwhisperSectionIndex = boardCatalogSections.findIndex((section) =>
      section.boards.some((board) => board.boardName === "IWhisper"),
    );
    expect(iwhisperSectionIndex).toBeGreaterThanOrEqual(0);
    const expectedSectionSelectionCount =
      boardCatalogSections[iwhisperSectionIndex]!.boards.filter((board) => board.fullSyncEnabled)
        .length;

    await user.click(screen.getAllByRole("button", { name: "全选本分区" })[iwhisperSectionIndex]!);

    expect((iwhisperCheckbox as HTMLInputElement).checked).toBe(true);
    expect((talkingCheckbox as HTMLInputElement).checked).toBe(true);
    expect(
      screen
        .getAllByRole("checkbox")
        .filter((checkbox) => (checkbox as HTMLInputElement).checked),
    ).toHaveLength(expectedSectionSelectionCount);

    await user.click(screen.getAllByRole("button", { name: "取消本分区" })[iwhisperSectionIndex]!);

    expect((iwhisperCheckbox as HTMLInputElement).checked).toBe(false);
    expect((talkingCheckbox as HTMLInputElement).checked).toBe(false);
    expect(
      screen
        .getAllByRole("checkbox")
        .filter((checkbox) => (checkbox as HTMLInputElement).checked),
    ).toHaveLength(0);
  });
});
