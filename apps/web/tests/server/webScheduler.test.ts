import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { boardCatalog } from "@/src/server/boardSync/boardCatalog";
import { scheduledTasks } from "@/src/server/scheduler/taskRegistry";

const enabledTaskCount = scheduledTasks.filter((task) => task.enabled).length;
const scheduledBoardNames = boardCatalog
  .filter((board) => board.scheduledSyncEnabled)
  .map((board) => board.boardName);

function resetWebSchedulerState() {
  delete (
    globalThis as typeof globalThis & {
      __bbsWebSchedulerState__?: unknown;
    }
  ).__bbsWebSchedulerState__;
}

describe("startWebScheduler", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    resetWebSchedulerState();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetWebSchedulerState();
  });

  it("registers one enabled task per explicitly scheduled board", async () => {
    expect(enabledTaskCount).toBe(scheduledBoardNames.length);
    expect(scheduledTasks.map((task) => task.boardName)).toEqual(
      scheduledBoardNames,
    );
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

    const firstModule = await import(
      "@/src/server/scheduler/webScheduler"
    );
    await firstModule.startWebScheduler({ scheduleTaskLoop: registerSpy });

    vi.resetModules();

    const secondModule = await import("@/src/server/scheduler/webScheduler");
    await secondModule.startWebScheduler({ scheduleTaskLoop: registerSpy });

    expect(registerSpy).toHaveBeenCalledTimes(enabledTaskCount);
  });

  it("allows retry when task registration fails before startup completes", async () => {
    vi.stubEnv("WEB_SCHEDULER_ENABLED", "true");
    const registerSpy = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("register boom");
      })
      .mockImplementation(() => undefined);

    const { startWebScheduler } = await import(
      "@/src/server/scheduler/webScheduler"
    );

    await expect(
      startWebScheduler({ scheduleTaskLoop: registerSpy }),
    ).rejects.toThrow("register boom");

    await startWebScheduler({ scheduleTaskLoop: registerSpy });

    expect(registerSpy).toHaveBeenCalledTimes(enabledTaskCount + 1);
  });
});

describe("instrumentation register", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    resetWebSchedulerState();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetWebSchedulerState();
  });

  it("starts the web scheduler only for the nodejs runtime", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    const startWebScheduler = vi.fn();

    vi.doMock("@/src/server/scheduler/webScheduler", () => ({
      startWebScheduler,
    }));

    const { register } = await import("@/instrumentation");
    await register();

    expect(startWebScheduler).toHaveBeenCalledTimes(1);
  });

  it("does not start the web scheduler outside the nodejs runtime", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");
    const startWebScheduler = vi.fn();

    vi.doMock("@/src/server/scheduler/webScheduler", () => ({
      startWebScheduler,
    }));

    const { register } = await import("@/instrumentation");
    await register();

    expect(startWebScheduler).not.toHaveBeenCalled();
  });
});
