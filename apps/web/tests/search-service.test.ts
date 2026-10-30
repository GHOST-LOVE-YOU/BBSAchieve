// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ raw: vi.fn() }));
vi.mock("@/src/server/db/client", () => ({ prisma: { $queryRaw: mocks.raw } }));
import { searchForum } from "@/src/server/forum/searchService";
describe("搜索分页", () => {
  it("按页分别返回结果和总数", async () => {
    mocks.raw.mockResolvedValue([{ count: 100n }]);
    const result = await searchForum({
      query: "工作",
      scope: "replies",
      page: 3,
      perPage: 25,
    });
    expect(result.page).toBe(3);
    expect(result.perPage).toBe(25);
    expect(result.totals.replies).toBe(100);
    expect(mocks.raw).toHaveBeenCalledTimes(2);
  });
});
