import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-semibold">管理员总览</h1>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-900"
          href="/admin/imports"
        >
          导入导出
        </Link>
        <Link
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-900"
          href="/admin/scheduled-tasks"
        >
          定时任务
        </Link>
      </div>
    </main>
  );
}
