import { prisma } from "@/src/server/db/client";
import { mirrorBoards, mirrorEnabled } from "../config";
export async function getMirrorDashboard() {
  const boards = await Promise.all(
    mirrorBoards.map(async (definition) => {
      const [state, latest, actions, backlog] = await Promise.all([
        prisma.mirrorBoardState.findUnique({
          where: { boardName: definition.name },
        }),
        prisma.mirrorRun.findFirst({
          where: { boardName: definition.name },
          orderBy: { startedAt: "desc" },
        }),
        prisma.mirrorAction.findMany({
          where: { boardName: definition.name },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            kind: true,
            status: true,
            summary: true,
            attempts: true,
            errorMessage: true,
            sourcePostId: true,
            createdAt: true,
            publishedAt: true,
          },
        }),
        prisma.mirrorAction.groupBy({
          by: ["status"],
          where: {
            boardName: definition.name,
            status: { in: ["pending", "retrying", "failed"] },
          },
          _count: true,
        }),
      ]);
      const published = latest
        ? await prisma.mirrorAction.count({
            where: { runId: latest.id, status: "published" },
          })
        : 0;
      return {
        definition,
        state,
        latest,
        actions,
        published,
        pending: backlog
          .filter((x) => x.status !== "failed")
          .reduce((n, x) => n + x._count, 0),
        failed: backlog.find((x) => x.status === "failed")?._count ?? 0,
      };
    }),
  );
  return {
    enabled: mirrorEnabled(),
    fixture: process.env.MIRROR_SOURCE === "fixture",
    boards,
  };
}
