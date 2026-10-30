// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { parseSourceTime } from "../../src/modules/mirroring/source/time";
import { planActions } from "../../src/modules/mirroring/planning/actions";
import { ByrMobileClient } from "../../src/modules/mirroring/source/client";
import { plainText } from "../../src/modules/mirroring/source/content";
import { localDevelopmentHost } from "../../src/modules/mirroring/dev/auth";
const now = new Date("2026-10-30T08:00:00Z");
describe("源站规范化", () => {
  it("以北京时间解释跨日和相对时间", () => {
    expect(parseSourceTime("今天 09:17", now).toISOString()).toBe(
      "2026-10-30T01:17:00.000Z",
    );
    expect(parseSourceTime("昨天 23:59", now).toISOString()).toBe(
      "2026-10-29T15:59:00.000Z",
    );
    expect(parseSourceTime("5分钟前", now).toISOString()).toBe(
      "2026-10-30T07:55:00.000Z",
    );
    expect(() => parseSourceTime("未知", now)).toThrow();
  });
  it("正文转为安全文本并保留换行和链接", () => {
    expect(
      plainText(
        '<script>alert(1)</script><p>A<br>B &amp; C</p><a href="https://example.com">附件</a>',
      ),
    ).toBe("A\nB & C\n附件 (https://example.com)");
  });
  it("按源站 ID 生成任务，保留窗口外的主帖依赖，不保留窗口外回复", () => {
    const page = {
      gid: "10",
      title: "测试",
      pagination: { current: 1, total: 1 },
      articles: [
        {
          id: "10",
          pos: 0,
          time: "昨天 10:00",
          content: "原帖",
          subject: true,
          poster: { id: "甲" },
        },
        {
          id: "11",
          pos: 1,
          time: "昨天 10:01",
          content: "旧回复",
          subject: false,
          poster: { id: "乙" },
        },
        {
          id: "12",
          pos: 2,
          time: "5分钟前",
          content: "新回复",
          subject: false,
          poster: { id: "乙" },
        },
      ],
    };
    const tasks = planActions(
      "IWhisper",
      page,
      now,
      new Date(now.getTime() - 3600000),
      now,
    );
    expect(tasks.map((x) => [x.kind, x.sourcePostId])).toEqual([
      ["thread", "10"],
      ["reply", "11"],
      ["reply", "12"],
    ]);
  });
  it("生产环境即使设置开发开关也不能绕过登录", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LOCAL_DEV_AUTH", "true");
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/db");
    expect(localDevelopmentHost("localhost:3000")).toBe(false);
    vi.unstubAllEnvs();
  });
});
describe("源站客户端", () => {
  const board = {
    success: true,
    data: { posts: [], pagination: { current: 1, total: 1 } },
  };
  it("登录一次、发送 Cookie、缓存响应且缓存保持原观察时间", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json(
          { success: true },
          { headers: { "set-cookie": "session=ok; Path=/" } },
        ),
      )
      .mockResolvedValueOnce(Response.json(board));
    const client = new ByrMobileClient(
      { username: "user", password: "password" },
      transport,
      0,
    );
    const first = await client.board("IWhisper", 1);
    const second = await client.board("IWhisper", 1);
    expect(transport).toHaveBeenCalledTimes(2);
    expect(second.observedAt).toEqual(first.observedAt);
    expect(client.stats.cacheHits).toBe(1);
    expect(
      (transport.mock.calls[1][1]?.headers as Record<string, string>).Cookie,
    ).toContain("session=ok");
  });
  it("会话失效只重新登录一次，避免无限登录循环", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ success: true }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ success: true }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    const client = new ByrMobileClient(
      { username: "u", password: "p" },
      transport,
      0,
    );
    await expect(client.board("IWhisper", 1)).rejects.toMatchObject({
      code: "auth",
    });
    expect(transport).toHaveBeenCalledTimes(4);
  });
  it("只将明确的删除提示识别为不存在", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ success: true }))
      .mockResolvedValueOnce(new Response("<html>文章不存在</html>"))
      .mockResolvedValueOnce(new Response("<html>网关维护</html>"));
    const client = new ByrMobileClient(
      { username: "u", password: "p" },
      transport,
      0,
    );
    await expect(client.article("IWhisper", "10", 1)).rejects.toMatchObject({
      code: "missing",
    });
    await expect(client.article("IWhisper", "10", 2)).rejects.toMatchObject({
      code: "format",
    });
  });
});
