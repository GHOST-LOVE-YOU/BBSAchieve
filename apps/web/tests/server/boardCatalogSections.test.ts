import { describe, expect, it } from "vitest";

import {
  boardCatalog,
  boardCatalogSections,
} from "@/src/server/boardSync/boardCatalog";

describe("boardCatalog sections", () => {
  it("keeps homepage section order and derives a flat ordered board list", () => {
    expect(boardCatalogSections.length).toBeGreaterThan(1);
    expect(boardCatalogSections[0]?.sectionName).toBeTruthy();
    expect(boardCatalogSections[0]?.boards.length).toBeGreaterThan(0);
    expect(boardCatalog.length).toBeGreaterThan(boardCatalogSections.length);
    expect(boardCatalog[0]?.sectionName).toBe(boardCatalogSections[0]?.sectionName);
  });

  it("marks all catalog boards full-sync enabled but only whitelisted boards scheduled", () => {
    expect(boardCatalog.every((board) => board.fullSyncEnabled)).toBe(true);
    expect(
      boardCatalog
        .filter((board) => board.scheduledSyncEnabled)
        .map((board) => board.boardName),
    ).toEqual(["IWhisper", "JobInfo"]);
  });
});
