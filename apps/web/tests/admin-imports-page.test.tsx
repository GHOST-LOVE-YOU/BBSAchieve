import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  import: {
    findMany: vi.fn(),
  },
  importJob: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/src/server/db/client", () => ({
  prisma: prismaMock,
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  },
}));

import AdminImportsPage from "../app/admin/imports/page";

describe("admin imports page", () => {
  it("renders the sync entry and recent imports", async () => {
    prismaMock.import.findMany.mockResolvedValue([
      {
        id: "import-1",
        sourceLabel: "IWhisper updates",
        status: "completed",
        importedThreads: 3,
        importedReplies: 10,
        errorMessage: null,
      },
      {
        id: "import-2",
        sourceLabel: "mirror-archive",
        status: "failed",
        importedThreads: 1,
        importedReplies: 0,
        errorMessage: "Sync API request failed: 401",
      },
    ]);
    prismaMock.importJob.findMany.mockResolvedValue([
      {
        id: "job-1",
        jobType: "legacy_iwhisper_migration",
        sourceType: "legacy_postgres",
        sourceLabel: "legacy iwhisper",
        status: "running",
        cursorThreadKey: "2026-05-02T10:00:00.000Z|post-2",
        processedThreads: 3,
        processedReplies: 8,
        skippedReplies: 1,
        errorMessage: null,
        startedAt: new Date("2026-05-02T09:00:00.000Z"),
        finishedAt: null,
      },
      {
        id: "job-2",
        jobType: "legacy_iwhisper_migration",
        sourceType: "legacy_postgres",
        sourceLabel: "legacy iwhisper",
        status: "paused",
        cursorThreadKey: null,
        processedThreads: 0,
        processedReplies: 0,
        skippedReplies: 0,
        errorMessage: "LEGACY_DATABASE_URL missing",
        startedAt: new Date("2026-05-01T09:00:00.000Z"),
        finishedAt: null,
      },
    ]);

    render(await AdminImportsPage());

    expect(screen.getByText("导入导出")).toBeTruthy();
    expect(screen.getByRole("button", { name: "同步北邮人数据" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "从旧库导入 iwhisper" })).toBeTruthy();
    expect(screen.getByText("IWhisper updates")).toBeTruthy();
    expect(screen.getByText("状态：completed")).toBeTruthy();
    expect(screen.getByText("帖子：3")).toBeTruthy();
    expect(screen.getByText("回复：10")).toBeTruthy();
    expect(screen.getByText("Sync API request failed: 401")).toBeTruthy();
    expect(screen.getByText("旧库迁移任务")).toBeTruthy();
    expect(screen.getAllByText("legacy_iwhisper_migration")).toHaveLength(2);
    expect(screen.getByText("running")).toBeTruthy();
    expect(screen.getByText("2026-05-02T10:00:00.000Z|post-2")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("8")).toBeTruthy();
    expect(screen.getByText("LEGACY_DATABASE_URL missing")).toBeTruthy();
    expect(screen.getByRole("button", { name: "继续" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "停止" })).toHaveLength(2);
  });
});
