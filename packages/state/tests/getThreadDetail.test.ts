import { describe, expect, it } from "vitest";

import { getThreadDetail } from "../src";
import { createReadingFlowDeps } from "../src/fixtures/readingFlowDeps";

describe("getThreadDetail", () => {
  it("returns thread detail with ordered replies", async () => {
    const result = await getThreadDetail("thread:first-offer", createReadingFlowDeps());

    expect(result.status).toBe("success");
    if (result.status !== "success") {
      throw new Error("expected success");
    }

    expect(result.thread).toEqual({
      id: "thread:first-offer",
      title: "First offer from the mirror",
      body: "A new listing has been mirrored and is ready to read.",
      authorName: "Robot 1",
      publishedAt: "2026-05-01T08:00:00.000Z",
    });
    expect(result.replies.map((reply) => reply.id)).toEqual([
      "reply:first-offer-1",
      "reply:first-offer-2",
    ]);
  });

  it("returns notFound for missing thread", async () => {
    const result = await getThreadDetail("missing-thread", createReadingFlowDeps());

    expect(result).toEqual({ status: "notFound" });
  });

  it("returns error when the thread board is missing", async () => {
    const deps = createReadingFlowDeps();
    deps.boards.findById = async () => null;

    const result = await getThreadDetail("thread:first-offer", deps);

    expect(result.status).toBe("error");
    if (result.status !== "error") {
      throw new Error("expected error");
    }

    expect(result.message).toContain("board not found");
  });
});
