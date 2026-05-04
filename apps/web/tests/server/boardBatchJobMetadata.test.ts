import { describe, expect, it } from "vitest";

import {
  createBatchJobMetadata,
  getCurrentBoardName,
  markBoardCompleted,
  markBoardFailed,
} from "@/src/server/imports/boardBatchJobMetadata";

describe("boardBatchJobMetadata", () => {
  it("creates ordered metadata from selected boards", () => {
    const metadata = createBatchJobMetadata({
      selectedBoardNames: ["JobInfo", "IWhisper"],
      orderedBoardNames: ["IWhisper", "JobInfo"],
    });

    expect(metadata).toEqual({
      selectedBoardNames: ["JobInfo", "IWhisper"],
      orderedBoardNames: ["IWhisper", "JobInfo"],
      completedBoardNames: [],
      currentBoardName: "IWhisper",
      failedBoardName: null,
      currentBoardIndex: 0,
      perBoardStats: {},
    });
  });

  it("moves to the next board after success and records per-board stats", () => {
    const metadata = markBoardCompleted(
      createBatchJobMetadata({
        selectedBoardNames: ["JobInfo", "IWhisper"],
        orderedBoardNames: ["IWhisper", "JobInfo"],
      }),
      {
        boardName: "IWhisper",
        processedThreads: 3,
        processedReplies: 7,
      },
    );

    expect(metadata.completedBoardNames).toEqual(["IWhisper"]);
    expect(metadata.currentBoardName).toBe("JobInfo");
    expect(metadata.perBoardStats.IWhisper).toEqual({
      processedThreads: 3,
      processedReplies: 7,
    });
  });

  it("records the failed board and keeps the cursor there", () => {
    const metadata = markBoardFailed(
      createBatchJobMetadata({
        selectedBoardNames: ["JobInfo", "IWhisper"],
        orderedBoardNames: ["IWhisper", "JobInfo"],
      }),
      "IWhisper",
    );

    expect(metadata.failedBoardName).toBe("IWhisper");
    expect(getCurrentBoardName(metadata)).toBe("IWhisper");
  });
});
