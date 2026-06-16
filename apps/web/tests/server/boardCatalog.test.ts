import { describe, expect, it } from "vitest";

import {
  boardCatalog,
  boardCatalogSections,
} from "@/src/server/boardSync/boardCatalog";
import { boardSyncBoards, getScheduledBoardTasks } from "@/src/server/boardSync/boardRegistry";

describe("boardCatalog", () => {
  it("stores the homepage board catalog as sections and derives a flat canonical order", () => {
    expect(boardCatalogSections.length).toBeGreaterThan(1);
    expect(boardCatalog.length).toBeGreaterThan(boardCatalogSections.length);
    expect(boardCatalog[0]?.sectionName).toBe(boardCatalogSections[0]?.sectionName);
    expect(boardCatalog[0]?.sectionSlug).toBe(boardCatalogSections[0]?.sectionSlug);
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

  it("derives one scheduled task for every board with the configured sync windows", () => {
    const scheduledTasks = getScheduledBoardTasks();

    expect(scheduledTasks).toHaveLength(boardCatalog.length);
    expect(scheduledTasks.find((task) => task.boardName === "JobInfo")).toMatchObject({
      taskKey: "job-info_recent_sync",
      title: "JobInfo 最近内容同步",
      description: "每 43200 分钟同步一次 JobInfo 最近 44640 分钟内容",
      sourceType: "byr_sync_api",
      sourceLabel: "JobInfo recent sync",
      intervalMinutes: 43200,
      windowMinutes: 44640,
      enabled: true,
      runnerType: "byr_sync_recent_window",
    });
    expect(scheduledTasks.find((task) => task.boardName === "IWhisper")).toMatchObject({
      taskKey: "iwhisper_recent_sync",
      title: "IWhisper 最近内容同步",
      description: "每 60 分钟同步一次 IWhisper 最近 90 分钟内容",
      sourceType: "byr_sync_api",
      sourceLabel: "IWhisper recent sync",
      intervalMinutes: 60,
      windowMinutes: 90,
      enabled: true,
      runnerType: "byr_sync_recent_window",
    });
    expect(scheduledTasks.find((task) => task.boardName === "Advertising")).toMatchObject({
      intervalMinutes: 1440,
      windowMinutes: 1560,
    });
  });
});
