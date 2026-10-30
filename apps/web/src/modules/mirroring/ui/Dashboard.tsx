import Link from "next/link";
import { ArrowLeft, ChevronDown, Clock3, Radio } from "lucide-react";
import { getMirrorDashboard } from "./data";
import { controlBoard } from "./actions";
import { RefreshStatus, TaskButton } from "./LiveControls";
const labels: Record<string, string> = {
  queued: "等待采集",
  collecting: "正在采集",
  collected: "采集完成",
  failed: "需要处理",
  pending: "等待发布",
  retrying: "等待重试",
  published: "已发布",
};
const time = (date: Date | null | undefined) =>
  date
    ? new Intl.DateTimeFormat("zh-CN", {
        timeZone: "Asia/Shanghai",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date)
    : "尚未执行";
function Control({
  boardName,
  command,
  children,
  disabled = false,
  primary = false,
}: {
  boardName: string;
  command: string;
  children: React.ReactNode;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <form action={controlBoard}>
      <input type="hidden" name="boardName" value={boardName} />
      <input type="hidden" name="command" value={command} />
      <TaskButton disabled={disabled} primary={primary}>
        {children}
      </TaskButton>
    </form>
  );
}
export async function MirrorDashboard() {
  const data = await getMirrorDashboard();
  return (
    <main className="min-h-screen bg-[color:var(--canvas)] px-4 py-6 text-[color:var(--ink)] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin"
          className="inline-flex min-h-10 items-center gap-2 text-sm text-[color:var(--ink-secondary)] hover:text-[color:var(--primary)]"
        >
          <ArrowLeft size={15} aria-hidden />
          管理中心
        </Link>
        <header className="mt-5 flex flex-wrap items-end justify-between gap-4 border-b border-[color:var(--hairline)] pb-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              采集与机器人发布
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--ink-secondary)]">
              先采集内容，再由机器人逐条发布。这里分别记录两个阶段的进度。
            </p>
          </div>
          <RefreshStatus />
        </header>
        <div
          role="status"
          className="my-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[color:var(--ink-secondary)]"
        >
          <span className="inline-flex items-center gap-2">
            <Radio size={15} aria-hidden />
            <span>{data.enabled ? "后台调度已开启" : "后台调度未开启"}</span>
          </span>
          {data.fixture ? (
            <span className="rounded-md bg-[color:var(--canvas-soft)] px-2 py-1 text-xs">
              本机模拟数据
            </span>
          ) : null}
          <span className="sm:ml-auto">每 10 秒刷新 · 北京时间</span>
        </div>
        {!data.enabled ? (
          <p className="mb-6 rounded-xl border border-[color:var(--hairline)] px-4 py-3 text-sm leading-6">
            任务可以加入队列；启用后台调度后才会自动执行。本机调试也可运行{" "}
            <code>pnpm mirror:tick</code> 执行一轮。
          </p>
        ) : null}
        <div className="space-y-6">
          {data.boards.map(
            ({
              definition,
              state,
              latest,
              actions,
              pending,
              failed,
              published,
            }) => (
              <section
                key={definition.name}
                className="overflow-hidden rounded-xl border border-[color:var(--hairline)] bg-[color:var(--surface)]"
              >
                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-semibold">
                          {definition.title}
                        </h2>
                        <span
                          className={`rounded-md px-2 py-1 text-xs font-medium ${failed || latest?.status === "failed" ? "bg-[color:var(--tag-mauve-bg)] text-[color:var(--tag-mauve-ink)]" : "bg-[color:var(--canvas-soft)] text-[color:var(--ink-secondary)]"}`}
                        >
                          {state?.paused
                            ? "已暂停"
                            : latest
                              ? (labels[latest.status] ?? latest.status)
                              : "等待首次执行"}
                        </span>
                      </div>
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-[color:var(--ink-tertiary)]">
                        <Clock3 size={13} aria-hidden />
                        {definition.name} · 每{" "}
                        {definition.intervalMinutes >= 1440
                          ? `${definition.intervalMinutes / 1440} 天`
                          : `${definition.intervalMinutes} 分钟`}{" "}
                        · 回看{" "}
                        {definition.windowMinutes >= 1440
                          ? `${definition.windowMinutes / 1440} 天`
                          : `${definition.windowMinutes} 分钟`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Control
                        boardName={definition.name}
                        command="run"
                        primary
                        disabled={
                          latest?.status === "collecting" ||
                          latest?.status === "queued"
                        }
                      >
                        立即采集
                      </Control>
                      <Control
                        boardName={definition.name}
                        command={state?.paused ? "resume" : "pause"}
                      >
                        {state?.paused ? "继续运行" : "暂停版面"}
                      </Control>
                      {failed > 0 ? (
                        <Control boardName={definition.name} command="retry">
                          重试失败任务
                        </Control>
                      ) : null}
                    </div>
                  </div>
                  <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-5 border-t border-[color:var(--hairline)] pt-5 sm:grid-cols-4">
                    {[
                      ["上次采集完成", time(state?.lastCompletedAt)],
                      [
                        "下次执行",
                        state?.paused
                          ? "已暂停"
                          : data.enabled
                            ? time(state?.nextRunAt)
                            : "调度未开启",
                      ],
                      ["待发布 / 失败", `${pending} / ${failed}`],
                      [
                        "本轮已发布",
                        `${published} / ${latest?.actionsCreated ?? 0}`,
                      ],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-xs text-[color:var(--ink-tertiary)]">
                          {label}
                        </dt>
                        <dd className="mt-1.5 text-sm font-medium tabular-nums">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {latest ? (
                    <p className="mt-5 text-xs leading-6 text-[color:var(--ink-secondary)]">
                      已读取 {latest.pagesFetched} 页 · 检查{" "}
                      {latest.threadsScanned} 个主题 · 跳过{" "}
                      {latest.skippedThreads} 个已消失主题 · 请求{" "}
                      {latest.requestsMade} 次 / 缓存命中 {latest.cacheHits} 次
                      {latest.status === "collecting"
                        ? ` · 版面下一页 ${latest.nextBoardPage}，帖子下一页 ${latest.nextThreadPage}`
                        : ""}
                    </p>
                  ) : (
                    <p className="mt-5 text-sm text-[color:var(--ink-tertiary)]">
                      首次执行后，这里会显示真实的采集进度。
                    </p>
                  )}
                  {latest?.errorMessage ? (
                    <p
                      role="alert"
                      className="mt-3 rounded-lg bg-[color:var(--canvas-soft)] px-3 py-2 text-sm leading-6"
                    >
                      {latest.errorMessage}
                      。修复后点击“立即采集”，将从保存的位置继续。
                    </p>
                  ) : null}
                </div>
                <details className="group border-t border-[color:var(--hairline)]">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-5 py-3 text-sm font-medium hover:bg-[color:var(--canvas-soft)] sm:px-6">
                    <span>
                      查看最近的原子任务{" "}
                      <span className="ml-1 text-[color:var(--ink-tertiary)]">
                        {actions.length}
                      </span>
                    </span>
                    <ChevronDown
                      size={16}
                      aria-hidden
                      className="transition-transform group-open:rotate-180"
                    />
                  </summary>
                  {actions.length === 0 ? (
                    <p className="px-6 py-8 text-center text-sm text-[color:var(--ink-secondary)]">
                      还没有待发布内容。采集成功后，帖子与回复会分别成为任务。
                    </p>
                  ) : (
                    <ul className="divide-y divide-[color:var(--hairline)] border-t border-[color:var(--hairline)]">
                      {actions.map((action) => (
                        <li key={action.id} className="px-5 py-4 sm:px-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="break-words text-sm leading-6">
                                <span className="mr-2 text-[color:var(--ink-tertiary)]">
                                  {action.kind === "thread" ? "发帖" : "回复"}
                                </span>
                                {action.summary || "（无文字内容）"}
                              </p>
                              <p className="mt-1 text-xs text-[color:var(--ink-tertiary)]">
                                源站 #{action.sourcePostId} ·{" "}
                                {time(action.createdAt)}
                                {action.attempts
                                  ? ` · 已重试 ${action.attempts} 次`
                                  : ""}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs text-[color:var(--ink-secondary)]">
                              {labels[action.status] ?? action.status}
                            </span>
                          </div>
                          {action.errorMessage ? (
                            <p className="mt-2 text-xs leading-5 text-[color:var(--ink-secondary)]">
                              {action.errorMessage}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </details>
              </section>
            ),
          )}
        </div>
      </div>
    </main>
  );
}
