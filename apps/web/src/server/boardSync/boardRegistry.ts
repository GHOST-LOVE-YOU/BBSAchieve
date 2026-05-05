import { boardCatalog, type BoardCatalogEntry } from "./boardCatalog";

export type BoardSyncDefinition = BoardCatalogEntry;

export type DerivedScheduledBoardTask = {
  taskKey: string;
  title: string;
  description: string;
  sourceType: "byr_sync_api";
  sourceLabel: string;
  boardName: string;
  intervalMinutes: number;
  windowMinutes: number;
  enabled: true;
  runnerType: "byr_sync_recent_window";
};

export const boardSyncBoards: readonly BoardSyncDefinition[] = boardCatalog;

export function getBoardFullSyncDefinition(boardName: string) {
  return boardSyncBoards.find((board) => board.boardName === boardName) ?? null;
}

export function getScheduledBoardTasks(): DerivedScheduledBoardTask[] {
  return boardSyncBoards
    .filter((board) => board.scheduledSyncEnabled)
    .map((board) => ({
      taskKey: `${board.boardSlug}_recent_sync`,
      title: `${board.boardName} 最近内容同步`,
      description: `每 ${board.scheduledIntervalMinutes} 分钟同步一次 ${board.boardName} 最近 ${board.scheduledWindowMinutes} 分钟内容`,
      sourceType: "byr_sync_api" as const,
      sourceLabel: `${board.boardName} recent sync`,
      boardName: board.boardName,
      intervalMinutes: board.scheduledIntervalMinutes,
      windowMinutes: board.scheduledWindowMinutes,
      enabled: true,
      runnerType: "byr_sync_recent_window" as const,
    }));
}
