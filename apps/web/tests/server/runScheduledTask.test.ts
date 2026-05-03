import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  fetchSyncOriginalPost: vi.fn(),
  fetchSyncThreadSnapshot: vi.fn(),
  fetchSyncUpdates: vi.fn(),
  mapSyncPayload: vi.fn(),
  importSyncBatch: vi.fn(),
}));

vi.mock("@/src/server/imports/fetchSyncUpdates", () => ({
  fetchSyncUpdates: routeMocks.fetchSyncUpdates,
}));

vi.mock("@/src/server/imports/fetchSyncOriginalPost", () => ({
  fetchSyncOriginalPost: routeMocks.fetchSyncOriginalPost,
}));

vi.mock("@/src/server/imports/fetchSyncThreadSnapshot", () => ({
  fetchSyncThreadSnapshot: routeMocks.fetchSyncThreadSnapshot,
}));

vi.mock("@/src/server/imports/mapSyncPayload", () => ({
  mapSyncPayload: routeMocks.mapSyncPayload,
}));

vi.mock("@/src/server/imports/importSyncBatch", () => ({
  importSyncBatch: routeMocks.importSyncBatch,
}));

import { getScheduledTask } from "@/src/server/scheduler/taskRegistry";
import { runScheduledTask } from "@/src/server/scheduler/runScheduledTask";

const emptyBatch = {
  sourceType: "byr_sync_api" as const,
  sourceLabel: "IWhisper",
  boards: [],
  botUsers: [],
  threads: [],
  replies: [],
};

function createSchedulerPrismaMock(options?: { failCreateOnce?: boolean }) {
  const runs = new Map<
    string,
    {
      id: string;
      taskKey: string;
      taskTitle: string;
      triggerSource: "scheduled" | "manual";
      status: "running" | "succeeded" | "failed" | "skipped";
      startedAt: Date;
      finishedAt: Date | null;
      durationMs: number | null;
      intervalMinutes: number;
      windowMinutes: number;
      boardName: string;
      importedThreads: number;
      importedReplies: number;
      skippedReason: string | null;
      errorMessage: string | null;
      metadataJson?: unknown;
    }
  >();
  let idCounter = 1;
  let shouldFailCreate = options?.failCreateOnce ?? false;

  return {
    thread: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    scheduledTaskRun: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        if (shouldFailCreate) {
          shouldFailCreate = false;
          throw new Error("create boom");
        }

        const run = {
          id: `run-${idCounter++}`,
          taskKey: data.taskKey as string,
          taskTitle: data.taskTitle as string,
          triggerSource: data.triggerSource as "scheduled" | "manual",
          status: data.status as "running",
          startedAt: data.startedAt as Date,
          finishedAt: null,
          durationMs: null,
          intervalMinutes: data.intervalMinutes as number,
          windowMinutes: data.windowMinutes as number,
          boardName: data.boardName as string,
          importedThreads: 0,
          importedReplies: 0,
          skippedReason: null,
          errorMessage: null,
        };
        runs.set(run.id, run);
        return run;
      }),
      findUniqueOrThrow: vi.fn(async ({ where }: { where: { id: string } }) => {
        const run = runs.get(where.id);
        if (!run) {
          throw new Error(`missing run ${where.id}`);
        }
        return run;
      }),
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string; status: "running" };
          data: Record<string, unknown>;
        }) => {
          const run = runs.get(where.id);
          if (!run || run.status !== where.status) {
            return { count: 0 };
          }

          Object.assign(run, data);
          return { count: 1 };
        },
      ),
      update: vi.fn(),
    },
  };
}

describe("runScheduledTask", () => {
  beforeEach(() => {
    routeMocks.fetchSyncOriginalPost.mockReset();
    routeMocks.fetchSyncThreadSnapshot.mockReset();
    routeMocks.fetchSyncUpdates.mockReset();
    routeMocks.mapSyncPayload.mockReset();
    routeMocks.importSyncBatch.mockReset();
  });

  it("runs the sync task and records a successful history row", async () => {
    const task = getScheduledTask("iwhisper_recent_sync");
    const prisma = createSchedulerPrismaMock();
    routeMocks.fetchSyncUpdates.mockResolvedValue({
      board_name: "IWhisper",
      window_minutes: 30,
      scanned_pages: 2,
      cutoff_at: "2026-05-03T21:40:00",
      threads: [],
    });
    routeMocks.mapSyncPayload.mockReturnValue(emptyBatch);
    routeMocks.importSyncBatch.mockResolvedValue({
      importId: "import-1",
      importedThreads: 2,
      importedReplies: 3,
      skippedReplies: 0,
    });

    const result = await runScheduledTask({
      prisma: prisma as never,
      task: task!,
      triggerSource: "scheduled",
    });

    expect(routeMocks.fetchSyncUpdates).toHaveBeenCalledWith({
      boardName: "IWhisper",
      windowMinutes: 30,
    });
    expect(result.status).toBe("succeeded");
    expect(result.importedThreads).toBe(2);
    expect(result.importedReplies).toBe(3);
  });

  it("skips when the same task is already running", async () => {
    const task = getScheduledTask("iwhisper_recent_sync")!;
    const prisma = createSchedulerPrismaMock();
    routeMocks.fetchSyncUpdates.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              board_name: "IWhisper",
              window_minutes: 30,
              scanned_pages: 2,
              cutoff_at: "2026-05-03T21:40:00",
              threads: [],
            });
          }, 0);
        }),
    );
    routeMocks.mapSyncPayload.mockReturnValue(emptyBatch);
    routeMocks.importSyncBatch.mockResolvedValue({
      importId: "import-1",
      importedThreads: 2,
      importedReplies: 3,
      skippedReplies: 0,
    });

    const firstRun = runScheduledTask({
      prisma: prisma as never,
      task,
      triggerSource: "scheduled",
    });
    const secondRun = await runScheduledTask({
      prisma: prisma as never,
      task,
      triggerSource: "scheduled",
    });

    await firstRun;

    expect(secondRun.status).toBe("skipped");
    expect(secondRun.skippedReason).toBe("previous run still active");
  });

  it("releases the running guard when creating the run record fails", async () => {
    const task = getScheduledTask("iwhisper_recent_sync")!;
    const prisma = createSchedulerPrismaMock({ failCreateOnce: true });
    routeMocks.fetchSyncUpdates.mockResolvedValue({
      board_name: "IWhisper",
      window_minutes: 30,
      scanned_pages: 2,
      cutoff_at: "2026-05-03T21:40:00",
      threads: [],
    });
    routeMocks.mapSyncPayload.mockReturnValue(emptyBatch);
    routeMocks.importSyncBatch.mockResolvedValue({
      importId: "import-1",
      importedThreads: 2,
      importedReplies: 3,
      skippedReplies: 0,
    });

    await expect(
      runScheduledTask({
        prisma: prisma as never,
        task,
        triggerSource: "scheduled",
      }),
    ).rejects.toThrow("create boom");

    const secondRun = await runScheduledTask({
      prisma: prisma as never,
      task,
      triggerSource: "scheduled",
    });

    expect(secondRun.status).toBe("succeeded");
    expect(secondRun.skippedReason).toBeNull();
    expect(routeMocks.fetchSyncUpdates).toHaveBeenCalledTimes(1);
  });
});
