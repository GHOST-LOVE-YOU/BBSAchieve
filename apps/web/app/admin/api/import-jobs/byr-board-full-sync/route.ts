import { NextResponse } from "next/server";

import { getBoardFullSyncDefinition } from "@/src/server/boardSync/boardRegistry";
import { prisma } from "@/src/server/db/client";
import {
  createBoardFullSyncJob,
  findJobById,
  markJobFailed,
  markJobPaused,
  markJobRunning,
  markJobSucceeded,
} from "@/src/server/imports/importJobStore";
import { runBoardFullSyncJob } from "@/src/server/imports/boardFullSyncRunner";
import { scheduleBoardFullSync } from "@/src/server/imports/scheduleBoardFullSync";
import {
  releaseGlobalSyncThrottle,
  tryAcquireGlobalSyncThrottle,
} from "@/src/server/syncThrottle/globalSyncThrottle";

export async function POST(request: Request) {
  const formData = await request.formData();
  const boardName = String(formData.get("boardName") ?? "");
  const board = getBoardFullSyncDefinition(boardName);

  if (!board || !board.fullSyncEnabled) {
    return NextResponse.json({ ok: false, error: "Board full sync is not enabled" }, { status: 400 });
  }

  const job = await createBoardFullSyncJob(prisma, {
    boardName: board.boardName,
    fullSyncWindowMinutes: board.fullSyncWindowMinutes,
  });

  scheduleBoardFullSync(async () =>
    runBoardFullSyncJob(
      {
        prisma,
        findJobById: (jobId) => findJobById(prisma, jobId),
        markJobPaused: (jobId, progressNote) => markJobPaused(prisma, jobId, progressNote),
        markJobRunning: (jobId) => markJobRunning(prisma, jobId),
        markJobSucceeded: (jobId) => markJobSucceeded(prisma, jobId),
        markJobFailed: (jobId, errorMessage) => markJobFailed(prisma, jobId, errorMessage),
      },
      {
        jobId: job.id,
        ownerKey: `manual:${board.boardName}`,
        acquireThrottle: () =>
          tryAcquireGlobalSyncThrottle({
            ownerKey: `manual:${board.boardName}`,
            triggerSource: "manual",
          }),
        releaseThrottle: releaseGlobalSyncThrottle,
      },
    ),
  );

  return NextResponse.json({ ok: true, jobId: job.id });
}
