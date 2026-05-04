import { describe, expect, it } from "vitest";

import { boardCatalog } from "@/src/server/boardSync/boardCatalog";
import { boardSyncBoards, getScheduledBoardTasks } from "@/src/server/boardSync/boardRegistry";

describe("boardCatalog", () => {
  it("contains IWhisper and other homepage boards as the canonical source", () => {
    expect(boardCatalog.length).toBeGreaterThan(1);
    expect(boardCatalog.some((board) => board.boardName === "IWhisper")).toBe(true);
    expect(boardCatalog.some((board) => board.boardName === "JobInfo")).toBe(true);
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
});
