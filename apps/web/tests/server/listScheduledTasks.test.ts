import { describe, expect, it, vi } from "vitest";

import { listScheduledTasks } from "@/src/server/admin/listScheduledTasks";
import { scheduledTasks } from "@/src/server/scheduler/taskRegistry";

describe("listScheduledTasks", () => {
  it("queries latest runs for all code-defined tasks", async () => {
    const findMany = vi.fn().mockResolvedValue([]);

    await listScheduledTasks({
      scheduledTaskRun: { findMany },
    } as never);

    expect(findMany).toHaveBeenCalledWith({
      where: {
        taskKey: {
          in: scheduledTasks.map((task) => task.taskKey),
        },
      },
      orderBy: { startedAt: "desc" },
    });
  });

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
      where: {
        taskKey: {
          in: scheduledTasks.map((task) => task.taskKey),
        },
      },
      orderBy: { startedAt: "desc" },
    });
    expect(result.map((task) => task.taskKey)).toEqual(
      scheduledTasks.map((task) => task.taskKey),
    );
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          taskKey: "iwhisper_recent_sync",
          title: "IWhisper 最近内容同步",
          intervalMinutes: 20,
          windowMinutes: 30,
          latestRun: expect.objectContaining({
            status: "succeeded",
            importedThreads: 2,
            importedReplies: 3,
          }),
        }),
        expect.objectContaining({
          taskKey: "job-info_recent_sync",
          title: "JobInfo 最近内容同步",
          intervalMinutes: 120,
          windowMinutes: 180,
          latestRun: null,
        }),
      ]),
    );
  });

  it("returns the latest run for a task even when older global runs crowd out a top-20 slice", async () => {
    const crowdedRuns = Array.from({ length: 20 }, (_, index) => ({
      id: `other-run-${index + 1}`,
      taskKey: `other_task_${index + 1}`,
      status: "succeeded",
      startedAt: new Date(`2026-05-03T22:${String(index).padStart(2, "0")}:00.000Z`),
      finishedAt: new Date(`2026-05-03T22:${String(index).padStart(2, "0")}:10.000Z`),
      importedThreads: 0,
      importedReplies: 0,
      errorMessage: null,
    }));
    const latestTaskRun = {
      id: "run-2",
      taskKey: "iwhisper_recent_sync",
      status: "failed",
      startedAt: new Date("2026-05-03T21:00:00.000Z"),
      finishedAt: new Date("2026-05-03T21:00:05.000Z"),
      importedThreads: 1,
      importedReplies: 4,
      errorMessage: "boom",
    };
    const findMany = vi.fn().mockResolvedValue([...crowdedRuns, latestTaskRun]);

    const result = await listScheduledTasks({
      scheduledTaskRun: {
        findMany,
      },
    } as never);

    expect(findMany).toHaveBeenCalledWith({
      where: {
        taskKey: {
          in: scheduledTasks.map((task) => task.taskKey),
        },
      },
      orderBy: { startedAt: "desc" },
    });
    expect(result[0]).toMatchObject({
      taskKey: "iwhisper_recent_sync",
      latestRun: {
        id: "run-2",
        status: "failed",
        importedThreads: 1,
        importedReplies: 4,
        errorMessage: "boom",
      },
    });
  });
});
