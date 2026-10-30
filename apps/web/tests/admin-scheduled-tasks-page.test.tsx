import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/src/modules/mirroring/ui/data", () => ({
  getMirrorDashboard: vi.fn(),
}));
vi.mock("@/src/modules/mirroring/ui/actions", () => ({
  controlBoard: vi.fn(),
}));
vi.mock("@/src/modules/mirroring/ui/LiveControls", () => ({
  RefreshStatus: () => null,
  TaskButton: ({ children }: { children: React.ReactNode }) => (
    <button>{children}</button>
  ),
}));
import Page, { dynamic } from "../app/admin/scheduled-tasks/page";
import { getMirrorDashboard } from "@/src/modules/mirroring/ui/data";
describe("定时任务概况", () => {
  it("保持动态渲染且如实显示调度关闭状态", async () => {
    expect(dynamic).toBe("force-dynamic");
    vi.mocked(getMirrorDashboard).mockResolvedValue({
      enabled: false,
      fixture: true,
      boards: [
        {
          definition: {
            name: "IWhisper",
            slug: "iwhisper",
            title: "悄悄话",
            intervalMinutes: 60,
            windowMinutes: 90,
          },
          state: null,
          latest: null,
          actions: [],
          published: 0,
          pending: 0,
          failed: 0,
        },
      ],
    });
    render(await Page());
    expect(screen.getByText("后台调度未开启")).toBeTruthy();
    expect(screen.getByText("等待首次执行")).toBeTruthy();
    expect(screen.getByText(/查看最近的原子任务/)).toBeTruthy();
  });
});
