import { describe, expect, it } from "vitest";

import { getBoardSummaries } from "../src";
import { readingFlowDeps } from "../src/fixtures/readingFlowDeps";

describe("getBoardSummaries", () => {
  it("returns shared forum fixture summaries", async () => {
    const result = await getBoardSummaries(readingFlowDeps);

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
});
