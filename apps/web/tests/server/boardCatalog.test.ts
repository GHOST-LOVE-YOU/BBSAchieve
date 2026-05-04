import { describe, expect, it } from "vitest";

import { boardCatalog } from "@/src/server/boardSync/boardCatalog";
import { boardSyncBoards, getScheduledBoardTasks } from "@/src/server/boardSync/boardRegistry";

describe("boardCatalog", () => {
  it("stores the homepage board catalog in a fixed canonical order with concrete settings", () => {
    expect(boardCatalog).toEqual([
      {
        boardName: "IWhisper",
        boardSlug: "iwhisper",
        title: "IWhisper 全量与定时同步",
        description: "悄悄话板块，支持全量和定时同步。",
        fullSyncEnabled: true,
        fullSyncWindowMinutes: 60 * 24 * 365 * 10,
        scheduledSyncEnabled: true,
        scheduledIntervalMinutes: 20,
        scheduledWindowMinutes: 30,
      },
      {
        boardName: "JobInfo",
        boardSlug: "job-info",
        title: "JobInfo 全量与定时同步",
        description: "管理员手动全量抓取 JobInfo，并按固定间隔同步最近内容。",
        fullSyncEnabled: true,
        fullSyncWindowMinutes: 60 * 24 * 365 * 10,
        scheduledSyncEnabled: true,
        scheduledIntervalMinutes: 120,
        scheduledWindowMinutes: 180,
      },
    ]);
  });

  it("drives boardSyncBoards from the full catalog", () => {
    expect(boardSyncBoards.map((board) => board.boardName)).toEqual(
      boardCatalog.map((board) => board.boardName),
    );
  });

  it("only derives scheduled tasks from explicitly enabled boards", () => {
    const scheduledTasks = getScheduledBoardTasks();
    expect(scheduledTasks.every((task) => task.enabled)).toBe(true);
    expect(scheduledTasks.map((task) => task.boardName)).toEqual(
      boardCatalog.filter((board) => board.scheduledSyncEnabled).map((board) => board.boardName),
    );
  });

  it("derives the expected scheduled task details for the fixed homepage boards", () => {
    expect(getScheduledBoardTasks()).toEqual([
      {
        taskKey: "iwhisper_recent_sync",
        title: "IWhisper 最近内容同步",
        description: "每 20 分钟同步一次 IWhisper 最近 30 分钟内容",
        sourceType: "byr_sync_api",
        sourceLabel: "IWhisper recent sync",
        boardName: "IWhisper",
        intervalMinutes: 20,
        windowMinutes: 30,
        enabled: true,
        runnerType: "byr_sync_recent_window",
      },
      {
        taskKey: "job-info_recent_sync",
        title: "JobInfo 最近内容同步",
        description: "每 120 分钟同步一次 JobInfo 最近 180 分钟内容",
        sourceType: "byr_sync_api",
        sourceLabel: "JobInfo recent sync",
        boardName: "JobInfo",
        intervalMinutes: 120,
        windowMinutes: 180,
        enabled: true,
        runnerType: "byr_sync_recent_window",
      },
    ]);
  });
});
