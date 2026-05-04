import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { scheduleBoardFullSync } from "@/src/server/imports/scheduleBoardFullSync";

describe("scheduleBoardFullSync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("logs unexpected background failures instead of swallowing them", async () => {
    const error = new Error("background boom");
    const run = vi.fn(async () => {
      throw error;
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    scheduleBoardFullSync(run);
    await vi.runAllTimersAsync();

    expect(run).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      "scheduleBoardFullSync background run failed",
      error,
    );
  });
});
