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

  it("returns null when a board is missing from the catalog-derived registry", () => {
    expect(getBoardFullSyncDefinition("MissingBoard")).toBeNull();
  });

  it("keeps scheduled task derivation aligned with the catalog order", () => {
    expect(getScheduledBoardTasks().map((task) => task.boardName)).toEqual(
      boardSyncBoards.filter((board) => board.scheduledSyncEnabled).map((board) => board.boardName),
    );
  });
});
