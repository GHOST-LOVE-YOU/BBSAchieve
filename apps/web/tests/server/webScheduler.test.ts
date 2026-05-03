import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("startWebScheduler", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not start when WEB_SCHEDULER_ENABLED is false", async () => {
    vi.stubEnv("WEB_SCHEDULER_ENABLED", "false");
    const registerSpy = vi.fn();

    const { startWebScheduler } = await import(
      "@/src/server/scheduler/webScheduler"
    );

    await startWebScheduler({ scheduleTaskLoop: registerSpy });

    expect(registerSpy).not.toHaveBeenCalled();
  });

  it("starts only once per process", async () => {
    vi.stubEnv("WEB_SCHEDULER_ENABLED", "true");
    const registerSpy = vi.fn();

    const { startWebScheduler } = await import(
      "@/src/server/scheduler/webScheduler"
    );

    await startWebScheduler({ scheduleTaskLoop: registerSpy });
    await startWebScheduler({ scheduleTaskLoop: registerSpy });

    expect(registerSpy).toHaveBeenCalledTimes(1);
  });
});
