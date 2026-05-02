import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  import: {
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

    render(await AdminImportsPage());

    expect(screen.getByText("导入导出")).toBeTruthy();
    expect(screen.getByRole("button", { name: "同步北邮人数据" })).toBeTruthy();
    expect(screen.getByText("IWhisper updates")).toBeTruthy();
    expect(screen.getByText("状态：completed")).toBeTruthy();
    expect(screen.getByText("帖子：3")).toBeTruthy();
    expect(screen.getByText("回复：10")).toBeTruthy();
    expect(screen.getByText("Sync API request failed: 401")).toBeTruthy();
  });
});
