import type { SourceClient, ArticlePage } from "../source/types";
export class FixtureSource implements SourceClient {
  stats = { requests: 0, cacheHits: 0 };
  private observedAt = new Date();
  async board(_name: string, page: number) {
    this.stats.requests++;
    return {
      observedAt: this.observedAt,
      data: {
        posts:
          page === 1
            ? [
                {
                  gid: "99000001",
                  title: "本地演示：周末一起散步",
                  replyTime: "刚刚",
                  replyCount: 14,
                  tag: false,
                },
              ]
            : [],
        pagination: { current: page, total: 1 },
      },
    };
  }
  async article(_name: string, id: string, page: number) {
    this.stats.requests++;
    const all: ArticlePage["articles"] = Array.from({ length: 14 }, (_, i) => ({
      id: String(Number(id) + i),
      pos: i,
      subject: i === 0,
      time: `${20 - i}分钟前`,
      content:
        i === 0
          ? "<p>这是模拟源站的内容，用来验证分页、机器人发布与通知。</p>"
          : `<p>第 ${i} 条演示回复，一起看看新消息。</p>`,
      poster: { id: i % 2 === 0 ? "演示机器人甲" : "演示机器人乙" },
    }));
    return {
      observedAt: this.observedAt,
      data: {
        gid: id,
        title: "本地演示：周末一起散步",
        anony: true,
        articles: all.slice((page - 1) * 10, page * 10),
        pagination: { current: page, total: 2 },
      },
    };
  }
}
