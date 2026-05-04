import { describe, expect, it, vi } from "vitest";

import {
  createBoardFullSyncJob,
  markJobFailed,
  markJobCancelled,
  markJobPaused,
  markJobRunning,
  markJobSucceeded,
} from "@/src/server/imports/importJobStore";

describe("createBoardFullSyncJob", () => {
  it("stores only requested board full-sync metadata fields", async () => {
    const create = vi.fn(async () => ({ id: "job-1" }));

    await createBoardFullSyncJob(
      {
        importJob: { create },
      } as any,
      {
        boardName: "JobInfo",
        fullSyncWindowMinutes: 30,
        requestedBy: "scheduler",
      },
    );

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadataJson: {
          boardName: "JobInfo",
          fullSyncWindowMinutes: 30,
          requestedBy: "scheduler",
        },
      }),
    });
  });
});

describe("markJobPaused", () => {
  it("writes paused status, finished time, and progress note only when not cancelled", async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const now = new Date("2026-05-04T07:00:00.000Z");

    vi.useFakeTimers();
    vi.setSystemTime(now);

    try {
      await markJobPaused(
        {
          importJob: { updateMany },
        } as any,
        "job-1",
        "waiting for next window",
      );

      expect(updateMany).toHaveBeenCalledWith({
        where: {
          id: "job-1",
          status: {
            not: "cancelled",
          },
        },
        data: expect.objectContaining({
          status: "paused",
          progressNote: "waiting for next window",
          finishedAt: now,
        }),
      });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("markJobRunning", () => {
  it("updates running only when the job is still resumable", async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const now = new Date("2026-05-04T07:02:00.000Z");

    vi.useFakeTimers();
    vi.setSystemTime(now);

    try {
      await markJobRunning(
        {
          importJob: { updateMany },
        } as any,
        "job-1",
        "cursor-1",
      );

      expect(updateMany).toHaveBeenCalledWith({
        where: {
          id: "job-1",
          status: {
            in: ["pending", "paused", "failed"],
          },
        },
        data: expect.objectContaining({
          status: "running",
          startedAt: now,
          cursorThreadKey: "cursor-1",
          finishedAt: null,
          errorMessage: null,
          progressNote: null,
        }),
      });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("markJobSucceeded", () => {
  it("writes succeeded status only when the job is still running", async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const now = new Date("2026-05-04T07:03:00.000Z");

    vi.useFakeTimers();
    vi.setSystemTime(now);

    try {
      await markJobSucceeded(
        {
          importJob: { updateMany },
        } as any,
        "job-1",
      );

      expect(updateMany).toHaveBeenCalledWith({
        where: {
          id: "job-1",
          status: "running",
        },
        data: expect.objectContaining({
          status: "succeeded",
          finishedAt: now,
        }),
      });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("markJobFailed", () => {
  it("writes failed status only when the job is still running", async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const now = new Date("2026-05-04T07:04:00.000Z");

    vi.useFakeTimers();
    vi.setSystemTime(now);

    try {
      await markJobFailed(
        {
          importJob: { updateMany },
        } as any,
        "job-1",
        "sync boom",
      );

      expect(updateMany).toHaveBeenCalledWith({
        where: {
          id: "job-1",
          status: "running",
        },
        data: expect.objectContaining({
          status: "failed",
          finishedAt: now,
          errorMessage: "sync boom",
        }),
      });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("markJobCancelled", () => {
  it("writes cancelled status and finished time only when the job is still stoppable", async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const now = new Date("2026-05-04T07:05:00.000Z");

    vi.useFakeTimers();
    vi.setSystemTime(now);

    try {
      await markJobCancelled(
        {
          importJob: { updateMany },
        } as any,
        "job-1",
      );

      expect(updateMany).toHaveBeenCalledWith({
        where: {
          id: "job-1",
          status: {
            in: ["pending", "running", "paused", "failed"],
          },
        },
        data: expect.objectContaining({
          status: "cancelled",
          finishedAt: now,
        }),
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
