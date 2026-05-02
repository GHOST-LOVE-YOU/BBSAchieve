import Link from "next/link";

import { prisma } from "@/src/server/db/client";

export default async function AdminImportsPage() {
  const imports = await prisma.import.findMany({
    orderBy: { startedAt: "desc" },
    take: 20,
  });
  const importJobs = await prisma.importJob.findMany({
    where: { sourceType: "legacy_postgres" },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <main className="min-h-screen p-8">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-500">
          <Link href="/admin">返回总览</Link>
        </p>
        <h1 className="text-3xl font-semibold">导入导出</h1>
        <div className="flex flex-wrap gap-3">
          <form action="/admin/api/imports/byr-sync" method="post">
            <button
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white"
              type="submit"
            >
              同步北邮人数据
            </button>
          </form>
          <form action="/admin/api/import-jobs/legacy-iwhisper" method="post">
            <button
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-900"
              type="submit"
            >
              从旧库导入 iwhisper
            </button>
          </form>
        </div>
      </div>

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
        <h2 className="text-lg font-medium">旧库迁移任务</h2>
        {importJobs.length === 0 ? (
          <p className="text-sm text-zinc-500">暂无旧库迁移任务。</p>
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
                  <th className="px-4 py-3 font-medium">错误摘要</th>
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
                      {job.errorMessage ?? "—"}
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
                        {(job.status === "running" || job.status === "paused" || job.status === "failed") ? (
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
