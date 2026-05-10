# BYR Achieve · 设计实现交接

本次改动按 `claude.ai/design` 导出的 BYR Achieve 设计稿与
`docs/设计师UI设计提示词（Web+Mobile）.md` 设计简报，对 Web 端进行了一次较大重构。
所有页面改用 shadcn/ui 风格组件，并接入真实的 Prisma 数据，无 mock 数据。

> 设计稿原文已解压到 `byr-achieve/` （仓库根目录之外），其 README 明确说明：
> 「Recreate them pixel-perfectly … Match the visual output; don't copy the
> prototype's internal structure unless it happens to fit.」 因此本实现只复刻视觉
> 与交互，不复制原型的 React 内部结构。

## 落地步骤（必须按顺序执行）

```bash
# 1) 安装新依赖（已加入 apps/web/package.json）
npx pnpm@10.11.0 install

# 2) 生成 Prisma Client（schema 新增了 Notification 模型 + sourceUserHints 字段）
npx pnpm@10.11.0 --filter @bbs/web prisma:generate

# 3) 跑迁移（已新增 20260510120000_add_notifications_and_bot_source_hints）
npx pnpm@10.11.0 --filter @bbs/web prisma:migrate

# 4) 类型检查 + 测试
npx pnpm@10.11.0 --filter @bbs/web typecheck
npx pnpm@10.11.0 vitest run apps/web/tests/public-routes.test.tsx

# 5) （可选）启动 dev
npx pnpm@10.11.0 --filter @bbs/web dev
```

> 运行环境注意：本地容器无法 `pnpm install` 也无法访问 Prisma engine 镜像，
> 因此本仓库中 `node_modules` 与 prisma client 还未更新。**必须由用户在自己的
> 环境里先跑 1-3 步，否则 typecheck 和 build 都会因为缺包/缺类型而失败。**

## 改动摘要

### 新增依赖（`apps/web/package.json`）

| 包 | 作用 |
| --- | --- |
| `@radix-ui/react-avatar` | 头像 fallback |
| `@radix-ui/react-dialog` | 顶栏搜索浮层 |
| `@radix-ui/react-popover` | 备用浮层 |
| `@radix-ui/react-scroll-area` | 备用滚动 |
| `@radix-ui/react-separator` | 分隔线 |
| `@radix-ui/react-slot` | shadcn Button asChild |
| `@radix-ui/react-tabs` | 信息流 / 排序 / 用户主页 tab |
| `@radix-ui/react-tooltip` | 备用 |
| `class-variance-authority` | shadcn 变体声明 |
| `clsx` + `tailwind-merge` | shadcn 标准 `cn` 工具 |
| `lucide-react` | 图标（Bell / Bot / Search …） |

### 数据库 schema

`apps/web/prisma/schema.prisma`：

- 新增 `enum NotificationType` 与 `model Notification`，并在 `User` / `Thread` /
  `Reply` / `ContentSubscription` 上挂回向关系。
- 在 `BotProfile` 上新增 `sourceUserHints String?`，作为「一个机器人对应多个源站
  用户」的纯展示元数据（不参与通知派发）。

迁移：`prisma/migrations/20260510120000_add_notifications_and_bot_source_hints/`。

### 后端服务（`apps/web/src/server/forum/`）

| 文件 | 职责 |
| --- | --- |
| `feedService.ts` | 机器人 / 真人 / 全量信息流，按 `lastReply` 或 `published` 排序，分页 |
| `searchService.ts` | 帖子 / 回复 / 机器人搜索（仅 bot 用户可被搜） |
| `userProfileService.ts` | 机器人/用户主页 + 其最近发帖、最近回复 |
| `subscriptionsService.ts` | 创建 / 取消 / 列出订阅，写入 `ContentSubscription` |
| `notificationsService.ts` | 通知列表、未读数、读取标记 |
| `threadDetailService.ts` | 帖子详情 + 回复分页 + viewer 已订阅状态 |

### 新 API 路由（均位于 `apps/web/app/api/public/...`）

| 方法 / 路径 | 说明 |
| --- | --- |
| `GET /api/public/feed` | 主信息流（`kind=bot|real|all`，`sort`，`page`） |
| `GET /api/public/search` | 站内搜索（`scope=posts|replies|users|all`） |
| `GET /api/public/users/:id` | 用户/机器人公开档案 |
| `GET /api/public/users/:id/threads` | 该用户的发帖分页 |
| `GET /api/public/users/:id/replies` | 该用户的回复分页 |
| `GET /api/public/subscriptions` | 当前用户的订阅列表（需登录） |
| `POST /api/public/subscriptions` | 创建订阅（需登录） |
| `DELETE /api/public/subscriptions/:id` | 取消订阅 |
| `GET /api/public/notifications` | 通知列表 + 过滤 |
| `POST /api/public/notifications/:id/read` | 单条标已读 |
| `POST /api/public/notifications/read-all` | 全部标已读 |

### 页面（`apps/web/app/`）

| 路径 | 内容 |
| --- | --- |
| `/` | 顶栏搜索 + 机器人/真人 tab + 排序 + 分页帖子列表 + 分区卡片 |
| `/boards/[boardId]` | 单版面（hero band + 帖子列表 + 排序 + 分页） |
| `/sections/[sectionSlug]` | 一级分区（来自 `boardCatalog`） |
| `/threads/[threadId]` | 主帖 + 镜像来源条 + 内容失效提示 + 回复楼层 + 订阅按钮（帖/楼） |
| `/users/[userId]` | 机器人/真人主页 + 最近发帖/最近回复 + 单条订阅入口 |
| `/notifications` | 通知中心（未读 dot + 类型过滤 + 全部已读） |
| `/me` | 个人中心（订阅列表 + 取消订阅 + 偏好提示） |
| `/search?q=...` | 完整搜索结果（帖子 / 回复 / 机器人） |

### shadcn-style UI 基元（`apps/web/src/components/ui/`）

`button.tsx`, `card.tsx`, `badge.tsx`, `input.tsx`, `avatar.tsx`, `tabs.tsx`,
`separator.tsx`，全部按 shadcn/ui 标准结构搭建（`cn` 来自 `src/lib/utils.ts`）。

### 复合组件（`apps/web/src/components/forum/`）

`AppShell`、`HeroBand`、`PostRow`、`Pagination`、`SearchTrigger`（⌘K 浮层）、
`SubscribeButton`、`UnsubscribeButton`、`NotificationRow`、`MarkAllReadButton`、
`UserAvatar`、`ThemeToggle`、`States`（empty / loading / error）。

### 设计令牌

`apps/web/app/globals.css` 把 `byr-achieve/project/styles.css` 的 light/dark 调色
板搬到 CSS 变量 + Tailwind v4 `@theme inline`：`--canvas`、`--surface`、
`--surface-blush/butter/sage/sky/peach/mauve`、`--tag-*-bg/ink`、shadcn 别名
（`--background` 等）。`<html>` 上的 `data-theme` 由 `<head>` 的内联脚本与
`ThemeToggle` 同步设置，避免 FOUC。

### 测试

`apps/web/tests/public-routes.test.tsx` 已重写：mock 新的
`feedService` / `threadDetailService` / `pageGuards` / `prisma`，覆盖：

- 首页默认 bot 信息流；`?feed=real` 切换为真人信息流。
- 版面页 hero + 列表渲染；不存在版面时 `notFound`。
- 帖子详情主帖 + 回复 + 订阅按钮渲染；UUID 路由参数；`notFound` 行为；登录守卫
  调用。

`tests/prisma-schema-subscriptions.test.ts` 与 `tests/public-api-routes.test.ts`
未做侵入式修改，因为它们覆盖的旧 schema/路由都仍然在仓库中。

## 已知未做项

- Telegram / 邮箱 / 浏览器三通道 + 事件路由矩阵（设计原稿里有，但相对独立、且
  涉及若干外部集成；本次未实现，`/me` 仅留通用偏好提示。）
- 通知后端的真实派发（仅有读取链路；写入由后续触发器/后台任务负责，需要在
  `byr_sync` / web scheduler 里追加）。
- 机器人详情页里的「认领」入口（设计原稿仅展示按钮，业务规则待定）。
- 暗色 / 浅色主题的具体微调，目前直接套用了 design 稿的两套调色板。

如需补齐，建议下一轮以 `notifications service` 写入端为起点。
