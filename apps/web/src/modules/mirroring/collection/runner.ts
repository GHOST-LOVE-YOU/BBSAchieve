import type { PrismaClient, Prisma, MirrorRun } from "@prisma/client";
import { initializeProgress } from "./progress";
import { PAGE_BUDGET, type BoardDefinition } from "../config";
import { planActions } from "../planning/actions";
import { parseSourceTime } from "../source/time";
import { SourceError, type SourceClient } from "../source/types";
type Candidate = { id: string; fingerprint: string; startPage?: number };
export async function collectSlice(
  db: PrismaClient,
  source: SourceClient,
  definition: BoardDefinition,
  initial: MirrorRun,
  budget = PAGE_BUDGET,
  ensureLease: () => Promise<void> = async () => {},
) {
  let run = initial;
  const initialRequests = source.stats.requests,
    initialHits = source.stats.cacheHits;
  try {
    for (let step = 0; step < budget; step++) {
      await ensureLease();
      const pending = run.pendingThreads as unknown as Candidate[];
      if (pending.length === 0) {
        if (run.boardComplete) {
          await db.$transaction([
            db.mirrorRun.update({
              where: { id: run.id },
              data: {
                status: "collected",
                finishedAt: new Date(),
                errorMessage: null,
              },
            }),
            db.mirrorBoardState.update({
              where: { boardName: definition.name },
              data: {
                lastCompletedAt: run.windowEnd,
                nextRunAt: new Date(
                  Date.now() + definition.intervalMinutes * 60_000,
                ),
                lastError: null,
              },
            }),
          ]);
          return;
        }
        const page = await source.board(definition.name, run.nextBoardPage);
        await ensureLease();
        const candidates: Candidate[] = [];
        let anyRecent = false;
        const states = await db.mirrorThreadState.findMany({
          where: {
            boardName: definition.name,
            sourceThreadId: { in: page.data.posts.map((t) => t.gid) },
          },
        });
        const stateMap = new Map(states.map((s) => [s.sourceThreadId, s]));
        for (const thread of page.data.posts) {
          if (thread.tag === "top") continue;
          let recent = true;
          try {
            recent =
              parseSourceTime(thread.replyTime, page.observedAt) >=
              run.windowStart;
          } catch {
            /* 展示时间异常时保守纳入，详情解析仍严格校验。 */
          }
          if (!recent) continue;
          anyRecent = true;
          const fingerprint = `${thread.replyCount}:${thread.replyTime}`;
          const cached = stateMap.get(thread.gid);
          if (
            cached?.fingerprint === fingerprint &&
            Date.now() - cached.checkedAt.getTime() < 60_000
          )
            continue;
          const progress = cached?.progressInitialized
            ? cached
            : await db.$transaction((tx) =>
                initializeProgress(tx, definition.name, thread.gid),
              );
          candidates.push({
            id: thread.gid,
            fingerprint,
            startPage:
              Math.floor((progress.collectedThroughFloor + 1) / 10) + 1,
          });
        }
        run = await db.mirrorRun.update({
          where: { id: run.id },
          data: {
            pendingThreads: candidates,
            nextBoardPage: run.nextBoardPage + 1,
            nextThreadPage: candidates[0]?.startPage ?? 1,
            boardComplete:
              !anyRecent ||
              page.data.pagination.current >= page.data.pagination.total,
            pagesFetched: { increment: 1 },
            status: "collecting",
          },
        });
        continue;
      }
      const current = pending[0];
      try {
        const page = await source.article(
          definition.name,
          current.id,
          run.nextThreadPage,
        );
        if (
          page.data.gid !== current.id ||
          page.data.pagination.current !== run.nextThreadPage
        )
          throw new SourceError("format", "源站返回了非预期的帖子或页码");
        await ensureLease();
        const actions = planActions(
          definition.name,
          page.data,
          page.observedAt,
          run.windowStart,
          run.windowEnd,
        );
        const complete =
          page.data.pagination.current >= page.data.pagination.total;
        const nextPage = complete
          ? (pending[1]?.startPage ?? 1)
          : run.nextThreadPage + 1;
        // 原子任务持久化与采集页码一起提交；发布失败不会倒退采集，也不会丢失待发布任务。
        run = await db.$transaction(async (tx) => {
          const progress = await initializeProgress(
            tx,
            definition.name,
            current.id,
          );
          let through = progress.collectedThroughFloor;
          for (const action of [...actions].sort(
            (a, b) => a.sourceFloor - b.sourceFloor,
          )) {
            if (action.sourceFloor <= through) continue;
            if (action.sourceFloor !== through + 1)
              throw new SourceError(
                "format",
                `源站楼层缺口：期望 ${through + 1}，收到 ${action.sourceFloor}`,
              );
            through = action.sourceFloor;
          }
          await tx.mirrorThreadState.update({
            where: {
              boardName_sourceThreadId: {
                boardName: definition.name,
                sourceThreadId: current.id,
              },
            },
            data: { collectedThroughFloor: through },
          });
          const created = await tx.mirrorAction.createMany({
            data: actions.map((action) => ({
              runId: run.id,
              boardName: definition.name,
              sourceThreadId: action.sourceThreadId,
              sourcePostId: action.sourcePostId,
              kind: action.kind,
              summary: (action.kind === "thread"
                ? action.title
                : action.body
              ).slice(0, 160),
              payload: action as unknown as Prisma.InputJsonValue,
            })),
            skipDuplicates: true,
          });
          if (complete)
            await tx.mirrorThreadState.upsert({
              where: {
                boardName_sourceThreadId: {
                  boardName: definition.name,
                  sourceThreadId: current.id,
                },
              },
              create: {
                boardName: definition.name,
                sourceThreadId: current.id,
                fingerprint: current.fingerprint,
                checkedAt: new Date(),
              },
              update: {
                fingerprint: current.fingerprint,
                checkedAt: new Date(),
              },
            });
          return tx.mirrorRun.update({
            where: { id: run.id },
            data: {
              status: "collecting",
              pagesFetched: { increment: 1 },
              actionsCreated: { increment: created.count },
              threadsScanned: { increment: complete ? 1 : 0 },
              nextThreadPage: nextPage,
              pendingThreads: complete ? pending.slice(1) : pending,
            },
          });
        });
      } catch (error) {
        await db.mirrorAnomaly.create({
          data: {
            boardName: definition.name,
            sourceThreadId: current.id,
            stage: "collection",
            message:
              error instanceof SourceError
                ? error.message
                : "采集事务异常，请核对源站和本地进度",
          },
        });
        if (!(error instanceof SourceError) || error.code !== "missing")
          throw error;
        if (run.nextThreadPage > 1) {
          try {
            const head = await source.article(definition.name, current.id, 1);
            if (head.data.pagination.total >= run.nextThreadPage)
              throw new SourceError(
                "format",
                "源站分页状态不一致，稍后从保存的位置重试",
              );
            run = await db.mirrorRun.update({
              where: { id: run.id },
              data: { nextThreadPage: Math.max(1, head.data.pagination.total) },
            });
            continue;
          } catch (headError) {
            if (
              !(headError instanceof SourceError) ||
              headError.code !== "missing"
            )
              throw headError;
          }
        }
        run = await db.mirrorRun.update({
          where: { id: run.id },
          data: {
            pendingThreads: pending.slice(1),
            nextThreadPage: 1,
            skippedThreads: { increment: 1 },
            threadsScanned: { increment: 1 },
          },
        });
      }
    }
  } finally {
    await db.mirrorRun.update({
      where: { id: run.id },
      data: {
        requestsMade: { increment: source.stats.requests - initialRequests },
        cacheHits: { increment: source.stats.cacheHits - initialHits },
      },
    });
  }
}
