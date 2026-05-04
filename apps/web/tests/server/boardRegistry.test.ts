import { describe, expect, it } from "vitest";

import {
  boardSyncBoards,
  getBoardFullSyncDefinition,
  getScheduledBoardTasks,
} from "@/src/server/boardSync/boardRegistry";

describe("boardRegistry", () => {
  it("exposes the JobInfo board with concrete full-sync and scheduled settings", () => {
    expect(boardSyncBoards).toContainEqual({
      boardName: "JobInfo",
      boardSlug: "job-info",
      title: "JobInfo 全量与定时同步",
      description: "管理员手动全量抓取 JobInfo，并按固定间隔同步最近内容。",
      fullSyncEnabled: true,
      fullSyncWindowMinutes: 60 * 24 * 365 * 10,
      scheduledSyncEnabled: true,
      scheduledIntervalMinutes: 120,
      scheduledWindowMinutes: 180,
    });
  });

  it("returns a full-sync definition by board name", () => {
    expect(getBoardFullSyncDefinition("JobInfo")).toEqual({
      boardName: "JobInfo",
      boardSlug: "job-info",
      title: "JobInfo 全量与定时同步",
      description: "管理员手动全量抓取 JobInfo，并按固定间隔同步最近内容。",
      fullSyncEnabled: true,
      fullSyncWindowMinutes: 60 * 24 * 365 * 10,
      scheduledSyncEnabled: true,
      scheduledIntervalMinutes: 120,
      scheduledWindowMinutes: 180,
    });
  });

  it("builds the expected scheduled task for JobInfo only", () => {
    expect(getScheduledBoardTasks()).toEqual([
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
