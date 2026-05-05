import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  prisma: {},
  runScheduledTask: vi.fn(),
}));

const adminAuthGuardMock = vi.hoisted(() => ({
  requireAdminRouteUser: vi.fn(),
}));

vi.mock("@/src/server/db/client", () => ({
  prisma: routeMocks.prisma,
}));

vi.mock("@/src/server/auth/routeGuards", () => ({
  requireAdminRouteUser: adminAuthGuardMock.requireAdminRouteUser,
}));

vi.mock("@/src/server/scheduler/runScheduledTask", () => ({
  runScheduledTask: routeMocks.runScheduledTask,
}));

import { POST } from "../app/admin/api/scheduled-tasks/[taskKey]/run/route";

describe("admin scheduled tasks run route", () => {
  beforeEach(() => {
    routeMocks.runScheduledTask.mockReset();
    adminAuthGuardMock.requireAdminRouteUser.mockReset();
    adminAuthGuardMock.requireAdminRouteUser.mockResolvedValue({
      ok: true,
      identity: {
        provider: "kinde",
        subject: "kp_admin_user",
        orgCodes: ["org_ed7de8344b99"],
      },
    });
  });

  it("returns 403 before running a scheduled task when admin auth fails", async () => {
    adminAuthGuardMock.requireAdminRouteUser.mockResolvedValueOnce({
      ok: false,
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    });

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ taskKey: "iwhisper_recent_sync" }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    expect(routeMocks.runScheduledTask).not.toHaveBeenCalled();
  });

  it("runs a scheduled task immediately by task key", async () => {
    routeMocks.runScheduledTask.mockResolvedValue({
      id: "run-1",
      status: "succeeded",
    });

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ taskKey: "iwhisper_recent_sync" }),
    });

    expect(routeMocks.runScheduledTask).toHaveBeenCalledWith({
      prisma: routeMocks.prisma,
      task: expect.objectContaining({
        taskKey: "iwhisper_recent_sync",
      }),
      triggerSource: "manual",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      run: { id: "run-1", status: "succeeded" },
    });
  });

  it("returns a failure response when the run finishes with failed status", async () => {
    routeMocks.runScheduledTask.mockResolvedValue({
      id: "run-2",
      status: "failed",
      errorMessage: "sync boom",
    });

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ taskKey: "iwhisper_recent_sync" }),
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "sync boom",
      run: {
        id: "run-2",
        status: "failed",
        errorMessage: "sync boom",
      },
    });
  });

  it("redirects form submissions back to the admin page instead of rendering raw json", async () => {
    routeMocks.runScheduledTask.mockResolvedValue({
      id: "run-3",
      status: "succeeded",
    });

    const response = await POST(
      new Request("http://localhost/admin/api/scheduled-tasks/iwhisper_recent_sync/run", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
        body: "redirectTo=%2Fadmin%2Fscheduled-tasks",
      }),
      {
        params: Promise.resolve({ taskKey: "iwhisper_recent_sync" }),
      },
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "/admin/scheduled-tasks?runTaskKey=iwhisper_recent_sync&runStatus=succeeded",
    );
  });
});
