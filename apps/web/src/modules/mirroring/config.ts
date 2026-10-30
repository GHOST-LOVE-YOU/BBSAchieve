export type BoardDefinition = {
  name: string;
  slug: string;
  title: string;
  intervalMinutes: number;
  windowMinutes: number;
};
export const mirrorBoards: readonly BoardDefinition[] = [
  {
    name: "IWhisper",
    slug: "iwhisper",
    title: "悄悄话",
    intervalMinutes: 60,
    windowMinutes: 90,
  },
  {
    name: "JobInfo",
    slug: "job-info",
    title: "招聘信息",
    intervalMinutes: 43_200,
    windowMinutes: 44_640,
  },
];
export function getMirrorBoard(name: string) {
  const board = mirrorBoards.find((b) => b.name === name);
  if (!board) throw new Error("未配置的采集版面");
  return board;
}
export const mirrorEnabled = () => process.env.MIRROR_ENABLED === "true";
export const PAGE_BUDGET = 8;
export const TICK_MS = 30_000;
export const LEASE_MS = 120_000;
