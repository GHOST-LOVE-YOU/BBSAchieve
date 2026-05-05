import { describe, expect, it } from "vitest";

import {
  boardSyncBoards,
  getBoardFullSyncDefinition,
  getScheduledBoardTasks,
} from "@/src/server/boardSync/boardRegistry";
import { boardCatalog } from "@/src/server/boardSync/boardCatalog";

describe("boardRegistry", () => {
  it("returns a full-sync definition by board name from the catalog-derived registry", () => {
    const jobInfo = boardCatalog.find((board) => board.boardName === "JobInfo");

    expect(jobInfo).toBeTruthy();
    expect(getBoardFullSyncDefinition("JobInfo")).toEqual(jobInfo);
  });

  it("uses a 30-year default full-sync window for catalog boards", () => {
    expect(getBoardFullSyncDefinition("Xyq")?.fullSyncWindowMinutes).toBe(
      60 * 24 * 365 * 30,
    );
  });

  it("returns null when a board is missing from the catalog-derived registry", () => {
    expect(getBoardFullSyncDefinition("MissingBoard")).toBeNull();
  });

  it("keeps scheduled task derivation aligned with the catalog order", () => {
    expect(getScheduledBoardTasks().map((task) => task.boardName)).toEqual(
      boardSyncBoards.filter((board) => board.scheduledSyncEnabled).map((board) => board.boardName),
    );
  });

  it("derives concrete scheduled task fields for JobInfo", () => {
    expect(getScheduledBoardTasks().find((task) => task.boardName === "JobInfo")).toEqual({
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
    });
  });
});
