"use server";
import { revalidatePath } from "next/cache";
import { requireAdminPageUser } from "@/src/server/auth/pageGuards";
import { prisma } from "@/src/server/db/client";
import { getMirrorBoard } from "../config";
import { initializeBoards, queueBoard } from "../scheduling/control";
export async function controlBoard(form: FormData) {
  await requireAdminPageUser();
  const boardName = String(form.get("boardName") ?? "");
  getMirrorBoard(boardName);
  const command = String(form.get("command") ?? "");
  if (!["run", "pause", "resume", "retry"].includes(command))
    throw new Error("不支持的操作");
  await initializeBoards(prisma);
  if (command === "pause" || command === "resume")
    await prisma.mirrorBoardState.update({
      where: { boardName },
      data: { paused: command === "pause" },
    });
  if (command === "run") {
    await prisma.mirrorBoardState.update({
      where: { boardName },
      data: { paused: false },
    });
    await queueBoard(prisma, boardName, "manual");
  }
  if (command === "retry")
    await prisma.mirrorAction.updateMany({
      where: { boardName, status: "failed" },
      data: {
        status: "pending",
        attempts: 0,
        errorMessage: null,
        nextAttemptAt: new Date(),
      },
    });
  revalidatePath("/admin/scheduled-tasks");
}
