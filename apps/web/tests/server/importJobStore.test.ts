import { describe, expect, it, vi } from "vitest";

import { createBoardFullSyncJob } from "@/src/server/imports/importJobStore";

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
