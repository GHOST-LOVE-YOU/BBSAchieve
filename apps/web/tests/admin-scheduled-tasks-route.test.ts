// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), queue: vi.fn() }));
vi.mock("@/src/server/auth/routeGuards", () => ({
  requireAdminRouteUser: mocks.auth,
}));
vi.mock("@/src/server/db/client", () => ({ prisma: {} }));
vi.mock("@/src/modules/mirroring/scheduling/control", () => ({
  queueBoard: mocks.queue,
}));
import { POST } from "../app/admin/api/scheduled-tasks/[taskKey]/run/route";
describe("手动定时任务入口", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ ok: true });
    mocks.queue.mockResolvedValue({ id: "run" });
  });
  it("未授权不入队", async () => {
    mocks.auth.mockResolvedValue({
      ok: false,
      response: new Response("Not Found", { status: 404 }),
    });
    expect(
      (
        await POST(new Request("http://localhost"), {
          params: Promise.resolve({ taskKey: "iwhisper_recent_sync" }),
        })
      ).status,
    ).toBe(404);
    expect(mocks.queue).not.toHaveBeenCalled();
  });
  it("只入队，不在 HTTP 请求中执行爬取", async () => {
    const r = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ taskKey: "iwhisper_recent_sync" }),
    });
    expect(r.status).toBe(202);
    expect(await r.json()).toEqual({
      ok: true,
      status: "queued",
      runId: "run",
    });
  });
  it("未知任务返回 404", async () => {
    expect(
      (
        await POST(new Request("http://localhost"), {
          params: Promise.resolve({ taskKey: "missing" }),
        })
      ).status,
    ).toBe(404);
  });
  it("表单提交仅跳回固定的管理页", async () => {
    const r = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: new URLSearchParams({ redirectTo: "https://evil.test" }),
      }),
      { params: Promise.resolve({ taskKey: "iwhisper_recent_sync" }) },
    );
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toBe("/admin/scheduled-tasks");
  });
});
