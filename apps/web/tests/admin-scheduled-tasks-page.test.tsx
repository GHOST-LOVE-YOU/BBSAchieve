import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/src/server/admin/listScheduledTasks", () => ({
  listScheduledTasks: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => {
    return (
      <a className={className} href={href}>
        {children}
      </a>
    );
  },
}));

import AdminScheduledTasksPage from "../app/admin/scheduled-tasks/page";
import { listScheduledTasks } from "@/src/server/admin/listScheduledTasks";

describe("admin scheduled tasks page", () => {
  it("renders scheduled tasks and latest run summaries", async () => {
    vi.mocked(listScheduledTasks).mockResolvedValue([
      {
        taskKey: "iwhisper_recent_sync",
        title: "IWhisper 最近内容同步",
        description: "每 20 分钟同步一次 IWhisper 最近 30 分钟内的内容",
        boardName: "IWhisper",
        intervalMinutes: 20,
        windowMinutes: 30,
        enabled: true,
        latestRun: {
          id: "run-1",
          status: "succeeded",
          importedThreads: 2,
          importedReplies: 3,
          errorMessage: null,
          startedAt: new Date("2026-05-03T22:00:00.000Z"),
          finishedAt: new Date("2026-05-03T22:00:08.000Z"),
        },
      },
    ]);

    render(await AdminScheduledTasksPage());

    expect(screen.getByText("定时任务")).toBeTruthy();
    expect(screen.getByText("IWhisper 最近内容同步")).toBeTruthy();
    expect(screen.getByText("20 分钟")).toBeTruthy();
    expect(screen.getByText("30 分钟")).toBeTruthy();
    expect(screen.getByText("最近状态：succeeded")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "立即执行一次" }),
    ).toBeTruthy();
  });
});
