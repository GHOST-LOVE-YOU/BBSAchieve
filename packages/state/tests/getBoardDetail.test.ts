import { describe, expect, it } from "vitest";

import { getBoardDetail } from "../src";
import { createReadingFlowDeps } from "../src/fixtures/readingFlowDeps";

describe("getBoardDetail", () => {
  it("returns board detail with threads", async () => {
    const result = await getBoardDetail("board:job", createReadingFlowDeps());

    expect(result.status).toBe("success");
    if (result.status !== "success") {
      throw new Error("expected success");
    }

    expect(result.board).toEqual({
      id: "board:job",
      slug: "job",
      name: "Jobs and Offers",
      description: "Signals for roles, openings, and practical next steps.",
    });
    expect(result.threads.map((thread) => thread.id)).toEqual([
      "thread:read-path",
      "thread:first-offer",
    ]);
  });

  it("returns notFound for missing board", async () => {
    const result = await getBoardDetail("missing-board", createReadingFlowDeps());

    expect(result).toEqual({ status: "notFound" });
  });
});
