import Link from "next/link";
import { createPublicReadingService } from "@/src/server/reading/publicReadingService";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const result = await createPublicReadingService().listBoards();

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-semibold">论坛首页</h1>
      <div className="mt-6 space-y-4">
        {result.boards.map((board) => (
          <section key={board.id} className="rounded-xl border border-zinc-200 p-4">
            <Link className="text-xl font-medium" href={`/boards/${board.slug}`}>
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
