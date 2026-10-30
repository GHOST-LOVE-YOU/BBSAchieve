import type { PrismaClient, Prisma, MirrorRun } from "@prisma/client";
import { PAGE_BUDGET, type BoardDefinition } from "../config";
import { planActions } from "../planning/actions";
import { parseSourceTime } from "../source/time";
import { SourceError, type SourceClient } from "../source/types";
type Candidate = { id: string; fingerprint: string };
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
          const cached = await db.mirrorThreadState.findUnique({
            where: {
              boardName_sourceThreadId: {
                boardName: definition.name,
                sourceThreadId: thread.gid,
              },
            },
          });
          if (
            cached?.fingerprint === fingerprint &&
            Date.now() - cached.checkedAt.getTime() < 60_000
          )
            continue;
          candidates.push({ id: thread.gid, fingerprint });
        }
        run = await db.mirrorRun.update({
          where: { id: run.id },
          data: {
            pendingThreads: candidates,
            nextBoardPage: run.nextBoardPage + 1,
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
        // 第一页确保主帖存在；随后从末页倒序扫描，遇到整页早于窗口即停止。
        // 不依赖“回复数 = 已采集数”，大热帖也无需每轮重扫全部历史。
        const isFirst = run.nextThreadPage === 1;
        const outsideWindow = page.data.articles.every(
          (post) =>
            parseSourceTime(post.time, page.observedAt) < run.windowStart,
        );
        const complete = isFirst
          ? page.data.pagination.total <= 1
          : run.nextThreadPage <= 2 || outsideWindow;
        const nextPage = complete
          ? 1
          : isFirst
            ? page.data.pagination.total
            : run.nextThreadPage - 1;
        // 原子任务持久化与采集页码一起提交；发布失败不会倒退采集，也不会丢失待发布任务。
        run = await db.$transaction(async (tx) => {
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
