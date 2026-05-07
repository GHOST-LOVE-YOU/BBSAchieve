import { describe, expect, it } from "vitest";

import {
  createBatchJobMetadata,
  getCurrentBoardName,
  getCurrentBoardPage,
  markBoardCompleted,
  markBoardFailed,
  markBoardPageCompleted,
} from "@/src/server/imports/boardBatchJobMetadata";

describe("boardBatchJobMetadata", () => {
  it("rejects creating metadata with no ordered boards", () => {
    expect(() =>
      createBatchJobMetadata({
        selectedBoardNames: [],
        orderedBoardNames: [],
      }),
    ).toThrow("orderedBoardNames must not be empty");
  });

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
      currentBoardPageByName: {},
      perBoardStats: {},
    });
  });

  it("records partial board page progress before the board is complete", () => {
    const metadata = markBoardPageCompleted(
      createBatchJobMetadata({
        selectedBoardNames: ["Xyq"],
        orderedBoardNames: ["Xyq"],
      }),
      {
        boardName: "Xyq",
        nextPage: 4,
        processedThreads: 60,
        processedReplies: 12,
      },
    );

    expect(getCurrentBoardPage(metadata, "Xyq")).toBe(4);
    expect(metadata.currentBoardName).toBe("Xyq");
    expect(metadata.completedBoardNames).toEqual([]);
    expect(metadata.perBoardStats.Xyq).toEqual({
      processedThreads: 60,
      processedReplies: 12,
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

  it("rejects completing a board that is not the current board", () => {
    expect(() =>
      markBoardCompleted(
        createBatchJobMetadata({
          selectedBoardNames: ["JobInfo", "IWhisper"],
          orderedBoardNames: ["IWhisper", "JobInfo"],
        }),
        {
          boardName: "JobInfo",
          processedThreads: 3,
          processedReplies: 7,
        },
      ),
    ).toThrow('cannot complete board "JobInfo" while current board is "IWhisper"');
  });

  it("rejects completing the same board twice", () => {
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

    expect(() =>
      markBoardCompleted(metadata, {
        boardName: "IWhisper",
        processedThreads: 4,
        processedReplies: 8,
      }),
    ).toThrow('board "IWhisper" is already completed');
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

  it("rejects failing a board that is not the current board", () => {
    expect(() =>
      markBoardFailed(
        createBatchJobMetadata({
          selectedBoardNames: ["JobInfo", "IWhisper"],
          orderedBoardNames: ["IWhisper", "JobInfo"],
        }),
        "JobInfo",
      ),
    ).toThrow('cannot fail board "JobInfo" while current board is "IWhisper"');
  });

  it("rejects failing a board outside orderedBoardNames", () => {
    expect(() =>
      markBoardFailed(
        createBatchJobMetadata({
          selectedBoardNames: ["JobInfo", "IWhisper"],
          orderedBoardNames: ["IWhisper", "JobInfo"],
        }),
        "UnknownBoard",
      ),
    ).toThrow('board "UnknownBoard" is not in orderedBoardNames');
  });
});
