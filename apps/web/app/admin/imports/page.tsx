import Link from "next/link";

import { prisma } from "@/src/server/db/client";

export default async function AdminImportsPage() {
  const imports = await prisma.import.findMany({
    orderBy: { startedAt: "desc" },
    take: 20,
  });

  return (
    <main className="min-h-screen p-8">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-500">
          <Link href="/admin">返回总览</Link>
        </p>
        <h1 className="text-3xl font-semibold">导入导出</h1>
        <form action="/admin/api/imports/byr-sync" method="post">
          <button
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white"
            type="submit"
          >
            同步北邮人数据
          </button>
        </form>
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
    </main>
  );
}
