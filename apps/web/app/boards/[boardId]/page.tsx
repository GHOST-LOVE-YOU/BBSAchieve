import Link from "next/link";
import { notFound } from "next/navigation";

import { createPublicReadingService } from "@/src/server/reading/publicReadingService";
import { listBoardThreads } from "@/src/server/reading/listBoardThreads";

export const dynamic = "force-dynamic";

function parsePageParam(value: string | string[] | undefined): number {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (rawValue == null) {
    return 1;
  }

  const page = Number(rawValue);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ boardId: string }>;
  searchParams?: Promise<{ page?: string | string[] }>;
}) {
  const { boardId } = await params;
  const resolvedSearchParams = await searchParams;
  const requestedPage = parsePageParam(resolvedSearchParams?.page);
  const service = createPublicReadingService();
  try {
    const board = await service.getBoard(boardId);

    if (!board) {
      notFound();
    }

    const result = await listBoardThreads({
      boardId: board.id,
      boardSlug: board.slug,
      limit: 20,
      page: requestedPage,
    });

    return (
      <main className="min-h-screen p-8">
        <h1 className="text-3xl font-semibold">{board.name}</h1>
        <p className="mt-4 text-base text-zinc-700">{board.description}</p>
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
        {result.totalPages > 1 ? (
          <nav className="mt-8 flex items-center gap-4 text-sm text-zinc-700">
            {result.hasPreviousPage ? (
              <Link
                className="rounded border border-zinc-300 px-3 py-2 text-zinc-900"
                href={`/boards/${boardId}?page=${result.page - 1}`}
              >
                上一页
              </Link>
            ) : null}
            <span>
              第 {result.page} / {result.totalPages} 页
            </span>
            {result.hasNextPage ? (
              <Link
                className="rounded border border-zinc-300 px-3 py-2 text-zinc-900"
                href={`/boards/${boardId}?page=${result.page + 1}`}
              >
                下一页
              </Link>
            ) : null}
          </nav>
        ) : null}
      </main>
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      error.digest === "NEXT_NOT_FOUND"
    ) {
      throw error;
    }

    return (
      <main className="min-h-screen p-8">
        <h1 className="text-3xl font-semibold">版面帖子</h1>
        <p className="mt-4 text-base text-zinc-700">读取版面失败。</p>
      </main>
    );
  }
}
