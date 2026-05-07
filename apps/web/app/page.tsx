import { LoginLink, LogoutLink } from "@kinde-oss/kinde-auth-nextjs/server";
import Link from "next/link";

import { createPublicReadingService } from "@/src/server/reading/publicReadingService";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const result = await createPublicReadingService().listBoards();

  return (
    <main className="min-h-screen p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-semibold">论坛首页</h1>
        <nav className="flex flex-wrap items-center gap-3 text-sm" aria-label="认证操作">
          <LoginLink
            className="rounded border border-zinc-300 px-3 py-2 text-zinc-900"
            postLoginRedirectURL="/"
          >
            登录 / 切换账号
          </LoginLink>
          <LogoutLink
            className="rounded border border-zinc-300 px-3 py-2 text-zinc-900"
            postLogoutRedirectURL="/"
          >
            登出
          </LogoutLink>
        </nav>
      </header>
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
