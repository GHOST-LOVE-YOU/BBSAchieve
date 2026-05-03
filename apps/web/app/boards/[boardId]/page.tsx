import Link from "next/link";
import { notFound } from "next/navigation";

import { listBoardThreads } from "@/src/server/reading/listBoardThreads";
import { createReadingRepository } from "@/src/server/reading/readingRepository";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ boardId: string }>;
  searchParams?: Promise<{ page?: string }>;
}) {
  const { boardId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const readingRepository = createReadingRepository();
  const board =
    (await readingRepository.findBoardById(boardId)) ??
    (await readingRepository.findBoardBySlug(boardId));

  if (!board) {
    notFound();
  }

  try {
    const pageParam = resolvedSearchParams?.page;
    const parsedPage =
      pageParam == null || pageParam === "" ? 1 : Number.parseInt(pageParam, 10);
    const result = await listBoardThreads({
      boardId: board.id,
      boardSlug: board.slug,
      limit: 20,
      page: parsedPage,
    });

    return (
      <main className="min-h-screen p-8">
        <h1 className="text-3xl font-semibold">{board.name}</h1>
        <p className="mt-4 text-base text-zinc-700">{board.description}</p>
        <p className="mt-2 text-sm text-zinc-500">
          第 {result.page} 页，共 {result.totalPages} 页 · {result.totalCount} 个帖子
        </p>
        <div className="mt-6 space-y-4">
          {result.threads.map((thread) => (
            <section key={thread.id} className="rounded-xl border border-zinc-200 p-4">
              <Link
                className="text-lg font-medium"
                href={`/threads/${thread.id.replace(/^thread:/, "")}`}
              >
                {thread.title ?? thread.id}
              </Link>
              <p className="mt-2 text-sm text-zinc-500">{thread.lastReplyAt ?? "暂无回复"}</p>
            </section>
          ))}
        </div>
        <div className="mt-6 flex gap-3">
          {result.hasPreviousPage ? (
            <Link
              className="inline-flex rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
              href={
                result.page - 1 === 1
                  ? `/boards/${board.slug}`
                  : `/boards/${board.slug}?page=${result.page - 1}`
              }
            >
              上一页
            </Link>
          ) : null}
          {result.hasNextPage ? (
            <Link
              className="inline-flex rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
              href={`/boards/${board.slug}?page=${result.page + 1}`}
            >
              下一页
            </Link>
          ) : null}
        </div>
      </main>
    );
  } catch {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-3xl font-semibold">版面帖子</h1>
        <p className="mt-4 text-base text-zinc-700">读取版面失败。</p>
      </main>
    );
  }
}
