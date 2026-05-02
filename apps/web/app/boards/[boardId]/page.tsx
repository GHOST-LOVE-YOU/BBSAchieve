import Link from "next/link";
import { notFound } from "next/navigation";

import { getBoardDetail } from "@bbs/state";
import { createPrismaReadingFlowDeps } from "@bbs/state/runtime";

import { createReadingRepository } from "@/src/server/reading/readingRepository";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const result = await getBoardDetail(
    boardId,
    createPrismaReadingFlowDeps(createReadingRepository()),
  );

  if (result.status === "notFound") {
    notFound();
  }

  if (result.status !== "success") {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-3xl font-semibold">版面帖子</h1>
        <p className="mt-4 text-base text-zinc-700">读取版面失败。</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-semibold">{result.board.name}</h1>
      <p className="mt-4 text-base text-zinc-700">{result.board.description}</p>
      <div className="mt-6 space-y-4">
        {result.threads.map((thread) => (
          <section key={thread.id} className="rounded-xl border border-zinc-200 p-4">
            <Link
              className="text-lg font-medium"
              href={`/threads/${thread.id.replace(/^thread:/, "")}`}
            >
              {thread.title}
            </Link>
            <p className="mt-2 text-sm text-zinc-500">{thread.authorName}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
