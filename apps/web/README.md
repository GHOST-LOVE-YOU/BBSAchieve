# Web 应用

## 本地开发

首次准备依赖：

```bash
npx pnpm@10.11.0 install
```

Web 本地开发默认使用 Docker 中的 PostgreSQL，不再默认直连云端库：

```bash
npx pnpm@10.11.0 db:up
```

默认会连接 [`.env`](/Users/ghost/code/BBSAchieve/apps/web/.env) 中的本地 PostgreSQL：

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/bbsachieve"
```

如果确实需要临时切回其他数据库，再手动覆盖 `DATABASE_URL` 即可。

首次启动本地库后，先跑一次迁移把表建好：

```bash
npx pnpm@10.11.0 --filter @bbs/web prisma:generate
npx pnpm@10.11.0 --filter @bbs/web prisma:migrate
```

启动 Web 开发服务器：

```bash
npx pnpm@10.11.0 --filter @bbs/web dev
```

开发服务器默认运行在本机 `3000` 端口，本地 PostgreSQL 暴露在 `5433` 端口。

## 常用校验

Web 侧真实数据导入相关的常用验证顺序是先跑 Prisma 生成/迁移，再跑导入与路由测试，最后做类型检查：

```bash
npx pnpm@10.11.0 --filter @bbs/web prisma:generate
npx pnpm@10.11.0 --filter @bbs/web prisma:migrate
npx pnpm@10.11.0 vitest run apps/web/tests/server/importSyncBatch.test.ts apps/web/tests/server/fetchSyncUpdates.test.ts
npx pnpm@10.11.0 vitest run apps/web/tests/admin-imports-route.test.ts apps/web/tests/admin-imports-page.test.tsx apps/web/tests/public-routes.test.tsx apps/web/tests/admin-create-bot-and-thread.test.tsx
npx pnpm@10.11.0 --filter @bbs/web typecheck
```

跨前端包的完整阅读链路校验可以按下面顺序执行：

```bash
npx pnpm@10.11.0 vitest run packages/domain/tests/entities.test.ts
npx pnpm@10.11.0 vitest run packages/state/tests/createBotAndThread.test.ts packages/state/tests/importForumData.test.ts packages/state/tests/getBoardSummaries.test.ts packages/state/tests/getBoardDetail.test.ts packages/state/tests/getThreadDetail.test.ts
npx pnpm@10.11.0 vitest run apps/web/tests/public-routes.test.tsx apps/web/tests/admin-create-bot-and-thread.test.tsx
npx pnpm@10.11.0 --filter @bbs/web typecheck
npx pnpm@10.11.0 --filter @bbs/web build
npx pnpm@10.11.0 --filter @bbs/mobile exec jest __tests__/mobile-routes.test.tsx --runInBand
npx pnpm@10.11.0 --filter @bbs/mobile typecheck
npx pnpm@10.11.0 --filter @bbs/mobile exec tsc --noEmit -p tsconfig.test.json
```

## 当前范围

- Web 公开区只读阅读链路
- Web `/admin` 内容运营骨架
- 共享领域模型、仓储接口、读取用例与本地运行时装配
- Mobile 最小只读阅读链路与通知/绑定占位通过 Web 公开 API 联调

## Docker 构建

在仓库根目录执行：

```bash
docker build -f Dockerfile.web -t bbs-web:local .
```

如果你在 Dokploy 部署这个前端：

- Git Provider 里的 `Build Path` 保持仓库根目录，使用 `.` 或留空，不要填 `apps/web`
- 构建方式请选择 `Dockerfile`，不要使用 `Nixpacks`
- `Dockerfile` 路径优先填写仓库根目录的 `Dockerfile.web`
- `Docker Context Path` 明确填写 `.`

原因是当前仓库使用 `pnpm workspace`。`Nixpacks` 默认会在仓库根目录执行 `npm i`，会因为 `workspace:*` 依赖直接失败；而如果 `Build Path` 填成 `apps/web`，或者 `Docker Context Path` 没有明确指到根目录，Docker 构建上下文里又会丢失根目录的 `pnpm-workspace.yaml` 和共享包清单，同样无法构建。

## Docker 运行

运行前请准备好运行时依赖的环境变量，例如 `BYR_SYNC_API_BASE_URL`、`BYR_SYNC_API_TOKEN`、`DATABASE_URL`、`WEB_SCHEDULER_ENABLED`、`WEB_SCHEDULER_RUN_ON_BOOT`。

其中：

- `WEB_SCHEDULER_ENABLED=false` 可用于本地禁用定时任务
- `WEB_SCHEDULER_RUN_ON_BOOT=true` 控制进程启动后是否立即执行一次

```bash
docker run --rm -p 3000:3000 \
  -e BYR_SYNC_API_BASE_URL=__ASK_USER_BEFORE_RUNNING__ \
  -e BYR_SYNC_API_TOKEN=__ASK_USER_BEFORE_RUNNING__ \
  -e DATABASE_URL=__ASK_USER_BEFORE_RUNNING__ \
  -e WEB_SCHEDULER_ENABLED=true \
  -e WEB_SCHEDULER_RUN_ON_BOOT=false \
  bbs-web:local
```

容器启动后可通过本机 `3000` 端口访问应用。

当前镜像采用 Next.js `standalone` 运行方式，容器启动命令由 `apps/web/Dockerfile` 内部处理，不需要再额外改成 `next start`。

## 管理入口

管理员可以通过 `/admin/imports` 查看固化在代码中的 BYR 首页板块目录。当前目录由 `apps/web/src/server/boardSync/boardCatalog.ts` 提供，按照首页分区顺序固化了全部板块，是 Web 侧手动全量抓取和定时同步的统一事实源。

在这个页面里，板块会按首页分区分组展示，默认一个都不勾选，每个分区支持“全选本分区 / 取消本分区”。勾选一个或多个板块后会创建一条批量全量抓取总任务，而不是为每个板块分别创建任务。总任务会按板块目录顺序串行抓取各板块，失败时停在当前板块，并可在任务列表中从失败板块继续；也可以在任务仍可操作时直接停止。

页面下方的任务列表展示的是这类批量总任务，会聚合显示当前板块、失败板块、累计帖子数和累计回复数，而不是旧的一板块一任务模型。

`/admin/scheduled-tasks` 展示的定时同步任务也由同一份板块目录派生，但只包含显式启用了 `scheduledSyncEnabled` 的板块。除 `IWhisper`、`JobInfo` 等白名单板块外，其它首页目录板块默认只允许手动全量抓取，不自动开启定时同步。旧库 `iwhisper` 导入入口已经移除。
