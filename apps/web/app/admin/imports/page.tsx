import Link from "next/link";

import { boardCatalog } from "@/src/server/boardSync/boardCatalog";
import { prisma } from "@/src/server/db/client";
import { listRecentImportActivity } from "@/src/server/admin/listRecentImportActivity";

export const dynamic = "force-dynamic";

export default async function AdminImportsPage() {
  const selectableBoards = boardCatalog.filter((board) => board.fullSyncEnabled);
  const imports = await prisma.import.findMany({
    orderBy: { startedAt: "desc" },
    take: 20,
  });
  const importJobs = await prisma.importJob.findMany({
    where: { jobType: "byr_board_full_sync_batch" },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  const recentActivity = await listRecentImportActivity(prisma);

  return (
    <main className="min-h-screen p-8">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-500">
          <Link href="/admin">返回总览</Link>
        </p>
        <h1 className="text-3xl font-semibold">导入导出</h1>
        <div className="grid gap-3">
          <form action="/admin/api/imports/byr-sync" method="post">
            <button
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white"
              type="submit"
            >
              同步北邮人数据
            </button>
          </form>
          <form
            action="/admin/api/import-jobs/byr-board-full-sync-batch"
            method="post"
            className="rounded-xl border border-zinc-200 p-4"
          >
            <fieldset className="grid gap-3">
              <legend className="text-sm font-medium text-zinc-900">选择要全量抓取的板块</legend>
              {selectableBoards.map((board) => (
                <div
                  key={board.boardName}
                  className="flex items-start gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                >
                  <input
                    id={`board-${board.boardSlug}`}
                    type="checkbox"
                    name="boardNames"
                    value={board.boardName}
                    defaultChecked
                    className="mt-0.5"
                    aria-describedby={`board-${board.boardSlug}-description`}
                  />
                  <span className="grid gap-1">
                    <label
                      htmlFor={`board-${board.boardSlug}`}
                      className="font-medium text-zinc-900"
                    >
                      {board.boardName}
                    </label>
                    <span
                      id={`board-${board.boardSlug}-description`}
                      className="text-zinc-500"
                    >
                      {board.description}
                    </span>
                  </span>
                </div>
              ))}
            </fieldset>
            <button
              className="mt-4 rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-900"
              type="submit"
            >
              开始全量抓取
            </button>
            <p className="mt-3 text-sm text-zinc-500">
              当前将按首页目录顺序串行抓取：{selectableBoards.map((board) => board.boardName).join("、")}
            </p>
          </form>
        </div>
      </div>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-medium">最近导入活动</h2>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-zinc-500">暂无最近导入活动。</p>
        ) : (
          <div className="grid gap-3">
            {recentActivity.slice(0, 6).map((item) => (
              <article key={item.id} className="rounded-xl border border-zinc-200 p-4">
                <p className="text-sm font-medium">
                  {item.title} · {item.kind === "import" ? "导入" : "任务"}
                </p>
                <p className="mt-1 text-sm text-zinc-500">状态：{item.status}</p>
                <p className="mt-1 text-sm text-zinc-500">时间：{item.happenedAt}</p>
                {item.detail ? (
                  <p className="mt-1 text-sm text-zinc-500">{item.detail}</p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-medium">最近导入记录</h2>
        {imports.length === 0 ? (
          <p className="text-sm text-zinc-500">暂无导入记录。</p>
        ) : (
          imports.map((item) => (
            <article key={item.id} className="rounded-xl border border-zinc-200 p-4">
              <p className="text-sm font-medium">{item.sourceLabel}</p>
              <p className="mt-1 text-sm text-zinc-500">状态：{item.status}</p>
              <p className="mt-1 text-sm text-zinc-500">帖子：{item.importedThreads}</p>
              <p className="mt-1 text-sm text-zinc-500">回复：{item.importedReplies}</p>
              {item.errorMessage ? (
                <p className="mt-1 text-sm text-red-600">{item.errorMessage}</p>
              ) : null}
            </article>
          ))
        )}
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-lg font-medium">板块全量抓取任务</h2>
        {importJobs.length === 0 ? (
          <p className="text-sm text-zinc-500">暂无导入任务。</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">类型</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">当前游标</th>
                  <th className="px-4 py-3 font-medium">已处理帖子</th>
                  <th className="px-4 py-3 font-medium">已处理回复</th>
                  <th className="px-4 py-3 font-medium">说明</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {importJobs.map((job) => (
                  <tr key={job.id} className="border-t border-zinc-200">
                    <td className="px-4 py-3">{job.jobType}</td>
                    <td className="px-4 py-3">{job.status}</td>
                    <td className="px-4 py-3">{job.cursorThreadKey ?? "—"}</td>
                    <td className="px-4 py-3">{job.processedThreads}</td>
                    <td className="px-4 py-3">{job.processedReplies}</td>
                    <td className="px-4 py-3 text-red-600">
                      {job.progressNote ?? job.errorMessage ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {(job.status === "paused" || job.status === "failed") ? (
                          <form action={`/admin/api/import-jobs/${job.id}/resume`} method="post">
                            <button
                              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs"
                              type="submit"
                            >
                              继续
                            </button>
                          </form>
                        ) : null}
                        {(job.status === "pending" || job.status === "running" || job.status === "paused" || job.status === "failed") ? (
                          <form action={`/admin/api/import-jobs/${job.id}/stop`} method="post">
                            <button
                              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs"
                              type="submit"
                            >
                              停止
                            </button>
                          </form>
                        ) : null}
                        <span className="text-xs text-zinc-400">开始入口在上方</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
