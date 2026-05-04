import Link from "next/link";
import { notFound } from "next/navigation";

import { createPublicReadingService } from "@/src/server/reading/publicReadingService";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const service = createPublicReadingService();
  try {
    const board = await service.getBoard(boardId);

    if (!board) {
      notFound();
    }

    const result = await service.getBoardThreadsFeed({
      boardIdOrSlug: boardId,
      limit: 20,
    });

    if (!result) {
      notFound();
    }

    return (
      <main className="min-h-screen p-8">
        <h1 className="text-3xl font-semibold">{board.name}</h1>
        <p className="mt-4 text-base text-zinc-700">{board.description}</p>
        <div className="mt-6 space-y-4">
          {result.items.map((thread) => (
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
