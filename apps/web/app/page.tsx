import Link from "next/link";

import { getBoardSummaries } from "@bbs/state";
import { createReadingFlowDeps } from "@bbs/state/runtime";

export default async function HomePage() {
  const result = await getBoardSummaries(createReadingFlowDeps());

  if (result.status !== "success") {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-3xl font-semibold">论坛首页</h1>
        <p className="mt-4 text-base text-zinc-700">读取版面失败。</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-semibold">论坛首页</h1>
      <div className="mt-6 space-y-4">
        {result.boards.map((board) => (
          <section key={board.id} className="rounded-xl border border-zinc-200 p-4">
            <Link className="text-xl font-medium" href={`/boards/${board.id}`}>
              {board.name}
            </Link>
            <p className="mt-2 text-sm text-zinc-700">{board.description}</p>
            <p className="mt-2 text-sm text-zinc-500">帖子数：{board.threadCount}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
