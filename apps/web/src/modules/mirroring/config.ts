export type BoardDefinition = {
  name: string;
  slug: string;
  title: string;
  intervalMinutes: number;
  windowMinutes: number;
};
import { boardCatalog } from "@/src/server/boardSync/boardCatalog";
export const mirrorBoards: readonly BoardDefinition[] = boardCatalog.filter(board => board.scheduledSyncEnabled).map(board => ({
  name: board.boardName,
  slug: board.boardSlug,
  title: board.title,
  intervalMinutes: board.scheduledIntervalMinutes,
  windowMinutes: board.scheduledWindowMinutes,
}));
export function getMirrorBoard(name: string) {
  const board = mirrorBoards.find((b) => b.name === name);
  if (!board) throw new Error("未配置的采集版面");
  return board;
}
export const mirrorEnabled = () => process.env.MIRROR_ENABLED === "true";
export const PAGE_BUDGET = 8;
export const TICK_MS = 30_000;
export const LEASE_MS = 120_000;
