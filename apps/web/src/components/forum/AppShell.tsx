import Link from "next/link";
import {
  Bell,
  Bookmark,
  Bot,
  Folder,
  Home,
  Settings,
  User,
  Users,
} from "lucide-react";

import { SearchTrigger } from "@/src/components/forum/SearchTrigger";
import { ThemeToggle } from "@/src/components/forum/ThemeToggle";
import { cn } from "@/src/lib/utils";
import {
  boardCatalogSections,
  type BoardCatalogSection,
} from "@/src/server/boardSync/boardCatalog";

export type AppShellProps = {
  children: React.ReactNode;
  /** Currently active route key — used to highlight nav. */
  activeKey?:
    | "home"
    | "feed-bot"
    | "feed-real"
    | "notifications"
    | "profile"
    | "search"
    | { kind: "board"; slug: string }
    | { kind: "section"; slug: string };
  unreadNotificationCount?: number;
};

export function AppShell({
  children,
  activeKey,
  unreadNotificationCount = 0,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-[color:var(--canvas)] text-[color:var(--ink)]">
      <Topbar unreadCount={unreadNotificationCount} activeKey={activeKey} />
      <div className="grid min-h-[calc(100vh-64px)] grid-cols-1 lg:grid-cols-[280px_1fr]">
        <Sidebar
          activeKey={activeKey}
          unreadNotificationCount={unreadNotificationCount}
        />
        <main className="bg-[color:var(--canvas)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[960px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

function Topbar({
  unreadCount,
  activeKey,
}: {
  unreadCount: number;
  activeKey?: AppShellProps["activeKey"];
}) {
  const searchActive = activeKey === "search";
  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b border-[color:var(--hairline)] bg-[color:var(--canvas)] px-4 sm:px-6 lg:px-8">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[color:var(--ink)] text-sm font-bold text-[color:var(--on-primary)]">
          B
        </span>
        <span className="text-base font-semibold tracking-tight">
          BYR <em className="not-italic font-semibold text-[color:var(--primary)]">Achieve</em>
        </span>
      </Link>
      <SearchTrigger className="flex-1 max-w-[560px]" highlight={searchActive} />
      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle />
        <Link
          href="/notifications"
          aria-label="通知"
          className="relative grid h-9 w-9 place-items-center rounded-full text-[color:var(--ink-secondary)] transition-colors hover:bg-[color:var(--canvas-soft)]"
        >
          <Bell aria-hidden className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute right-2 top-2 inline-block h-2 w-2 rounded-full bg-[color:var(--error)] ring-2 ring-[color:var(--canvas)]" />
          ) : null}
        </Link>
      </div>
    </header>
  );
}

function Sidebar({
  activeKey,
  unreadNotificationCount,
}: {
  activeKey?: AppShellProps["activeKey"];
  unreadNotificationCount: number;
}) {
  const isHome = activeKey === "home";
  const isFeedBot = activeKey === "feed-bot";
  const isFeedReal = activeKey === "feed-real";
  const isNotifs = activeKey === "notifications";
  const isProfile = activeKey === "profile";
  const activeSectionSlug =
    typeof activeKey === "object" && activeKey?.kind === "section"
      ? activeKey.slug
      : null;
  const activeBoardSlug =
    typeof activeKey === "object" && activeKey?.kind === "board"
      ? activeKey.slug
      : null;

  return (
    <aside className="hidden border-r border-[color:var(--hairline)] bg-[color:var(--canvas)] lg:block">
      <div className="sticky top-16 max-h-[calc(100vh-64px)] overflow-y-auto px-3.5 py-5">
        <nav className="space-y-5" aria-label="主导航">
          <NavGroup>
            <NavItem
              icon={<Home aria-hidden className="h-4 w-4" />}
              label="首页"
              href="/"
              active={isHome}
            />
            <NavItem
              icon={<Bell aria-hidden className="h-4 w-4" />}
              label="通知中心"
              href="/notifications"
              active={isNotifs}
              badge={unreadNotificationCount > 0 ? unreadNotificationCount : undefined}
            />
            <NavItem
              icon={<User aria-hidden className="h-4 w-4" />}
              label="个人中心"
              href="/me"
              active={isProfile}
            />
          </NavGroup>

          <NavGroup title="信息流">
            <NavItem
              icon={<Bot aria-hidden className="h-4 w-4" />}
              label="机器人信息流"
              href="/?feed=bot"
              active={isFeedBot}
            />
            <NavItem
              icon={<Users aria-hidden className="h-4 w-4" />}
              label="真实用户信息流"
              href="/?feed=real"
              active={isFeedReal}
            />
          </NavGroup>

          <NavGroup title="分区">
            {boardCatalogSections.map((section) => (
              <SectionGroup
                key={section.sectionSlug}
                section={section}
                activeSectionSlug={activeSectionSlug}
                activeBoardSlug={activeBoardSlug}
              />
            ))}
          </NavGroup>

          <NavGroup title="快捷入口">
            <NavItem
              icon={<Bookmark aria-hidden className="h-4 w-4" />}
              label="我的订阅"
              href="/me#subscriptions"
            />
            <NavItem
              icon={<Settings aria-hidden className="h-4 w-4" />}
              label="偏好设置"
              href="/me#preferences"
            />
          </NavGroup>
        </nav>
      </div>
    </aside>
  );
}

function NavGroup({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {title ? (
        <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--ink-tertiary)]">
          {title}
        </div>
      ) : null}
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function NavItem({
  icon,
  label,
  href,
  active,
  badge,
  count,
  className,
}: {
  icon?: React.ReactNode;
  label: React.ReactNode;
  href: string;
  active?: boolean;
  badge?: number;
  count?: number;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-sm font-medium text-[color:var(--ink-secondary)] transition-colors",
        active
          ? "bg-[color:var(--canvas-cream)] text-[color:var(--ink)]"
          : "hover:bg-[color:var(--canvas-soft)] hover:text-[color:var(--ink)]",
        className,
      )}
    >
      {icon ? (
        <span
          className={cn(
            "grid h-4 w-4 place-items-center text-[color:var(--ink-tertiary)]",
            active && "text-[color:var(--ink)]",
          )}
        >
          {icon}
        </span>
      ) : null}
      <span className="flex-1 truncate">{label}</span>
      {badge != null ? (
        <span className="rounded-full bg-[color:var(--primary)] px-1.5 py-px text-[10.5px] font-semibold text-[color:var(--on-primary)]">
          {badge}
        </span>
      ) : count != null ? (
        <span className="text-[11.5px] tabular-nums text-[color:var(--ink-tertiary)]">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

function SectionGroup({
  section,
  activeSectionSlug,
  activeBoardSlug,
}: {
  section: BoardCatalogSection;
  activeSectionSlug: string | null;
  activeBoardSlug: string | null;
}) {
  const sectionActive = activeSectionSlug === section.sectionSlug;
  const containsActiveBoard =
    activeBoardSlug != null &&
    section.boards.some((board) => board.boardSlug === activeBoardSlug);
  const expandedByDefault = sectionActive || containsActiveBoard;

  return (
    <details className="group" open={expandedByDefault}>
      <summary
        className={cn(
          "flex cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2 text-sm font-medium text-[color:var(--ink-secondary)] transition-colors hover:bg-[color:var(--canvas-soft)] hover:text-[color:var(--ink)] [&::-webkit-details-marker]:hidden",
          sectionActive && "bg-[color:var(--canvas-cream)] text-[color:var(--ink)]",
        )}
      >
        <Folder
          aria-hidden
          className={cn(
            "h-4 w-4 text-[color:var(--ink-tertiary)]",
            sectionActive && "text-[color:var(--ink)]",
          )}
        />
        <Link
          href={`/sections/${section.sectionSlug}`}
          className="flex-1 truncate"
        >
          {section.sectionName}
        </Link>
        <span className="text-[11.5px] tabular-nums text-[color:var(--ink-tertiary)]">
          {section.boards.length}
        </span>
        <span
          aria-hidden
          className="text-[color:var(--ink-tertiary)] transition-transform group-open:rotate-90"
        >
          ›
        </span>
      </summary>
      <div className="ml-[18px] mt-0.5 space-y-0.5 border-l border-[color:var(--hairline-soft)] pl-3.5">
        {section.boards.slice(0, 12).map((board) => (
          <Link
            key={board.boardSlug}
            href={`/boards/${board.boardSlug}`}
            className={cn(
              "block rounded-[10px] px-2.5 py-1.5 text-[13px] text-[color:var(--ink-secondary)] transition-colors hover:bg-[color:var(--canvas-soft)] hover:text-[color:var(--ink)]",
              activeBoardSlug === board.boardSlug &&
                "bg-[color:var(--canvas-cream)] text-[color:var(--ink)]",
            )}
          >
            {board.title}
          </Link>
        ))}
        {section.boards.length > 12 ? (
          <Link
            href={`/sections/${section.sectionSlug}`}
            className="block rounded-[10px] px-2.5 py-1.5 text-[13px] text-[color:var(--ink-tertiary)] hover:bg-[color:var(--canvas-soft)] hover:text-[color:var(--ink)]"
          >
            查看全部 {section.boards.length} 个版面 →
          </Link>
        ) : null}
      </div>
    </details>
  );
}
