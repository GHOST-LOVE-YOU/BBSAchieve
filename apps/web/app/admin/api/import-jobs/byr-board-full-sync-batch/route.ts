import { NextResponse } from "next/server";

import { boardSyncBoards } from "@/src/server/boardSync/boardRegistry";
import { prisma } from "@/src/server/db/client";
import { createBoardBatchFullSyncJob } from "@/src/server/imports/importJobStore";
import { scheduleBoardBatchFullSync } from "@/src/server/imports/scheduleBoardBatchFullSync";

export async function POST(request: Request) {
  const formData = await request.formData();
  const selectedBoardNames = formData
    .getAll("boardNames")
    .map((value) => String(value))
    .filter((value) => value.trim().length > 0);

  if (selectedBoardNames.length === 0) {
    return NextResponse.json({ ok: false, error: "At least one board must be selected" }, { status: 400 });
  }

  const fullSyncBoards = boardSyncBoards.filter((board) => board.fullSyncEnabled);
  const knownBoardNames = new Set(boardSyncBoards.map((board) => board.boardName));
  const enabledBoardNames = new Set(fullSyncBoards.map((board) => board.boardName));

  if (selectedBoardNames.some((name) => !knownBoardNames.has(name))) {
    return NextResponse.json({ ok: false, error: "Unknown board selection" }, { status: 400 });
  }
  if (selectedBoardNames.some((name) => !enabledBoardNames.has(name))) {
    return NextResponse.json(
      { ok: false, error: "Board is not enabled for full sync" },
      { status: 400 },
    );
  }

  const orderedBoardNames = fullSyncBoards
    .map((board) => board.boardName)
    .filter((name) => selectedBoardNames.includes(name));

  const job = await createBoardBatchFullSyncJob(prisma, {
    selectedBoardNames,
    orderedBoardNames,
  });

  scheduleBoardBatchFullSync(job.id);

  return NextResponse.json({ ok: true, jobId: job.id });
}
