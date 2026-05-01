import { describe, expect, it } from "vitest";

import { getBoardSummaries } from "../src";
import { createReadingFlowDeps } from "../src/fixtures/readingFlowDeps";

describe("getBoardSummaries", () => {
  it("returns shared forum fixture summaries", async () => {
    const result = await getBoardSummaries(createReadingFlowDeps());

    expect(result.status).toBe("success");
    if (result.status !== "success") {
      throw new Error("expected success");
    }

    expect(result.boards).toEqual([
      {
        id: "board:job",
        slug: "job",
        name: "Jobs and Offers",
        description: "Signals for roles, openings, and practical next steps.",
        threadCount: 2,
        latestThreadTitle: "Reading path for mirrored posts",
      },
      {
        id: "board:hot",
        slug: "hot",
        name: "Hot Reading",
        description: "Fast-moving threads and the replies that follow them.",
        threadCount: 1,
        latestThreadTitle: "Follow up on the hot thread",
      },
    ]);
  });

  it("orders threads by parsed time instead of string order", async () => {
    const deps = createReadingFlowDeps();
    deps.threads.listByBoard = async (boardId: string) => {
      if (boardId !== "board:job") {
        return [];
      }

      return [
        {
          id: "thread:time-late",
          boardId: "board:job",
          authorUserId: "user:alice",
          title: "Later in time",
          body: "Later by timestamp but smaller as a string.",
          publishedAt: "2026-05-01T08:00:00+02:00",
        },
        {
          id: "thread:time-early",
          boardId: "board:job",
          authorUserId: "user:alice",
          title: "Earlier in time",
          body: "Earlier by timestamp but larger as a string.",
          publishedAt: "2026-05-01T06:30:00Z",
        },
      ];
    };

    const result = await getBoardSummaries(deps);

    expect(result.status).toBe("success");
    if (result.status !== "success") {
      throw new Error("expected success");
    }

    expect(result.boards[0].latestThreadTitle).toBe("Earlier in time");
  });
});
