import Link from "next/link";

import { listScheduledTasks } from "@/src/server/admin/listScheduledTasks";

export default async function AdminScheduledTasksPage() {
  const tasks = await listScheduledTasks();

  return (
    <main className="min-h-screen p-8">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-500">
          <Link href="/admin">返回总览</Link>
        </p>
        <h1 className="text-3xl font-semibold">定时任务</h1>
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
