# Web 应用

## 本地开发

```bash
npx pnpm@10.11.0 db:up
npx pnpm@10.11.0 --filter @bbs/web prisma:migrate
npx pnpm@10.11.0 --filter @bbs/web dev
```

默认会连接 `apps/web/.env` 中的本地 PostgreSQL：

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/bbsachieve"
```

开发服务器默认运行在本机 `3000` 端口，本地 PostgreSQL 暴露在 `5433` 端口。

## Docker 构建

在仓库根目录执行：

```bash
docker build -f apps/web/Dockerfile -t bbs-web:local .
```

如果你在 Dokploy 部署这个前端：

- 构建方式请选择 `Dockerfile`，不要使用 `Nixpacks`
- `Dockerfile` 路径填写 `apps/web/Dockerfile`
- 构建上下文使用仓库根目录 `.`

原因是当前仓库使用 `pnpm workspace`。`Nixpacks` 默认会在仓库根目录执行 `npm i`，会因为 `workspace:*` 依赖直接失败。

## Docker 运行

运行前请准备好运行时依赖的环境变量，例如 `BYR_SYNC_API_BASE_URL`、`BYR_SYNC_API_TOKEN`、`LEGACY_DATABASE_URL`、`DATABASE_URL`。

```bash
docker run --rm -p 3000:3000 \
  -e BYR_SYNC_API_BASE_URL=__ASK_USER_BEFORE_RUNNING__ \
  -e BYR_SYNC_API_TOKEN=__ASK_USER_BEFORE_RUNNING__ \
  -e LEGACY_DATABASE_URL=__ASK_USER_BEFORE_RUNNING__ \
  -e DATABASE_URL=__ASK_USER_BEFORE_RUNNING__ \
  bbs-web:local
```

容器启动后可通过本机 `3000` 端口访问应用。

当前镜像采用 Next.js `standalone` 运行方式，容器启动命令由 `apps/web/Dockerfile` 内部处理，不需要再额外改成 `next start`。
