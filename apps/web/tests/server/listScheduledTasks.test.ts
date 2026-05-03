import { describe, expect, it, vi } from "vitest";

import { listScheduledTasks } from "@/src/server/admin/listScheduledTasks";

describe("listScheduledTasks", () => {
  it("returns all code-defined tasks with their latest run", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "run-1",
        taskKey: "iwhisper_recent_sync",
        status: "succeeded",
        startedAt: new Date("2026-05-03T22:00:00.000Z"),
        finishedAt: new Date("2026-05-03T22:00:08.000Z"),
        importedThreads: 2,
        importedReplies: 3,
        errorMessage: null,
      },
    ]);

    const result = await listScheduledTasks({
      scheduledTaskRun: {
        findMany,
      },
    } as never);

    expect(findMany).toHaveBeenCalledWith({
      orderBy: { startedAt: "desc" },
      take: 20,
    });
    expect(result[0]).toMatchObject({
      taskKey: "iwhisper_recent_sync",
      title: "IWhisper 最近内容同步",
      intervalMinutes: 20,
      windowMinutes: 30,
      latestRun: {
        status: "succeeded",
        importedThreads: 2,
        importedReplies: 3,
      },
    });
  });
});
