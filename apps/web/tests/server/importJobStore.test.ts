import { describe, expect, it, vi } from "vitest";

import {
  createBoardFullSyncJob,
  markJobCancelled,
  markJobPaused,
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
  it("writes paused status, finished time, and progress note", async () => {
    const update = vi.fn(async () => ({ id: "job-1" }));
    const now = new Date("2026-05-04T07:00:00.000Z");

    vi.useFakeTimers();
    vi.setSystemTime(now);

    try {
      await markJobPaused(
        {
          importJob: { update },
        } as any,
        "job-1",
        "waiting for next window",
      );

      expect(update).toHaveBeenCalledWith({
        where: { id: "job-1" },
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

describe("markJobCancelled", () => {
  it("writes cancelled status and finished time", async () => {
    const update = vi.fn(async () => ({ id: "job-1" }));
    const now = new Date("2026-05-04T07:05:00.000Z");

    vi.useFakeTimers();
    vi.setSystemTime(now);

    try {
      await markJobCancelled(
        {
          importJob: { update },
        } as any,
        "job-1",
      );

      expect(update).toHaveBeenCalledWith({
        where: { id: "job-1" },
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
