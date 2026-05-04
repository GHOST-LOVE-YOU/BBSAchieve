import { describe, expect, it } from "vitest";

import {
  boardSyncBoards,
  getBoardFullSyncDefinition,
  getScheduledBoardTasks,
} from "@/src/server/boardSync/boardRegistry";

describe("boardRegistry", () => {
  it("exposes non-IWhisper boards with full-sync and scheduled settings", () => {
    expect(boardSyncBoards.length).toBeGreaterThan(0);

    const firstBoard = boardSyncBoards[0];
    expect(firstBoard).toMatchObject({
      boardName: expect.any(String),
      fullSyncEnabled: true,
      fullSyncWindowMinutes: expect.any(Number),
      scheduledSyncEnabled: expect.any(Boolean),
      scheduledIntervalMinutes: expect.any(Number),
      scheduledWindowMinutes: expect.any(Number),
    });
  });

  it("returns a full-sync definition by board name", () => {
    const board = boardSyncBoards[0]!;
    expect(getBoardFullSyncDefinition(board.boardName)).toMatchObject({
      boardName: board.boardName,
      fullSyncWindowMinutes: board.fullSyncWindowMinutes,
    });
  });

  it("builds scheduled tasks for enabled boards only", () => {
    const tasks = getScheduledBoardTasks();
    expect(tasks.some((task) => task.boardName === "IWhisper")).toBe(false);
    expect(tasks.every((task) => task.enabled)).toBe(true);
  });
});
