import { describe, expect, it } from "vitest";

describe("workspace smoke", () => {
  it("runs from the monorepo root", () => {
    expect(true).toBe(true);
  });
});
