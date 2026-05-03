import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  prisma: {},
  runScheduledTask: vi.fn(),
}));

vi.mock("@/src/server/db/client", () => ({
  prisma: routeMocks.prisma,
}));

vi.mock("@/src/server/scheduler/runScheduledTask", () => ({
  runScheduledTask: routeMocks.runScheduledTask,
}));

import { POST } from "../app/admin/api/scheduled-tasks/[taskKey]/run/route";

describe("admin scheduled tasks run route", () => {
  beforeEach(() => {
    routeMocks.runScheduledTask.mockReset();
  });

  it("runs a scheduled task immediately by task key", async () => {
    routeMocks.runScheduledTask.mockResolvedValue({
      id: "run-1",
      status: "succeeded",
    });

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ taskKey: "iwhisper_recent_sync" }),
    });

    expect(routeMocks.runScheduledTask).toHaveBeenCalledWith({
      prisma: routeMocks.prisma,
      task: expect.objectContaining({
        taskKey: "iwhisper_recent_sync",
      }),
      triggerSource: "manual",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      run: { id: "run-1", status: "succeeded" },
    });
  });
});
