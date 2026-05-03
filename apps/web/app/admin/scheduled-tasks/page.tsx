import Link from "next/link";

import { listScheduledTasks } from "@/src/server/admin/listScheduledTasks";

export const dynamic = "force-dynamic";

type AdminScheduledTasksPageProps = {
  searchParams?: Promise<{
    runTaskKey?: string;
    runStatus?: string;
    runMessage?: string;
  }>;
};

export default async function AdminScheduledTasksPage({
  searchParams,
}: AdminScheduledTasksPageProps = {}) {
  const tasks = await listScheduledTasks();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const runStatus = resolvedSearchParams?.runStatus;
  const runTaskKey = resolvedSearchParams?.runTaskKey;
  const runMessage = resolvedSearchParams?.runMessage;
  const activeTask = runTaskKey
    ? tasks.find((task) => task.taskKey === runTaskKey)
    : null;
  const runNotice =
    runStatus === "succeeded"
      ? `${activeTask?.title ?? "任务"}执行完成`
      : runStatus === "failed"
        ? `${activeTask?.title ?? "任务"}执行失败${runMessage ? `：${runMessage}` : ""}`
        : null;

  return (
    <main className="min-h-screen p-8">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-500">
          <Link href="/admin">返回总览</Link>
        </p>
        <h1 className="text-3xl font-semibold">定时任务</h1>
        {runNotice ? (
          <p
            className={
              runStatus === "failed" ? "text-sm text-red-600" : "text-sm text-zinc-600"
            }
          >
            {runNotice}
          </p>
        ) : null}
      </div>

      <section className="mt-8 grid gap-4">
        {tasks.map((task) => (
          <article
            key={task.taskKey}
            className="rounded-xl border border-zinc-200 p-4"
          >
            <h2 className="text-lg font-medium">{task.title}</h2>
            <p className="mt-1 text-sm text-zinc-500">{task.description}</p>
            <p className="mt-2 text-sm text-zinc-500">板块：{task.boardName}</p>
            <p className="mt-1 text-sm text-zinc-500">
              间隔：<span>{task.intervalMinutes} 分钟</span>
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              窗口：<span>{task.windowMinutes} 分钟</span>
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              代码启用：{task.enabled ? "是" : "否"}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              最近状态：{task.latestRun?.status ?? "暂无执行记录"}
            </p>
            <form
              action={`/admin/api/scheduled-tasks/${task.taskKey}/run`}
              method="post"
              className="mt-3"
            >
              <input
                type="hidden"
                name="redirectTo"
                value="/admin/scheduled-tasks"
              />
              <button
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
                type="submit"
              >
                立即执行一次
              </button>
            </form>
          </article>
        ))}
      </section>
    </main>
  );
}
