import { notFound } from "next/navigation";

import { createReadingFlowDeps } from "../../../src/lib/readingFlowDeps";
import { getThreadDetail } from "@bbs/state";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const result = await getThreadDetail(threadId, createReadingFlowDeps());

  if (result.status === "notFound") {
    notFound();
  }

  if (result.status !== "success") {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-3xl font-semibold">帖子详情</h1>
        <p className="mt-4 text-base text-zinc-700">读取帖子失败。</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-semibold">{result.thread.title}</h1>
      <p className="mt-4 text-base text-zinc-700">{result.thread.body}</p>
      <p className="mt-2 text-sm text-zinc-500">{result.thread.authorName}</p>
      <div className="mt-6 space-y-4">
        {result.replies.map((reply) => (
          <section key={reply.id} className="rounded-xl border border-zinc-200 p-4">
            <p className="text-sm text-zinc-500">{reply.authorName}</p>
            <p className="mt-2 text-base">{reply.body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
