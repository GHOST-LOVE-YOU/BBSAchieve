# 北邮人后端

当前后端主要聚焦于三类采集能力：

- `byr_auth`：登录态管理和 cookie 复用。
- `byr_boards`：版面页抓取与解析。
- `byr_threads`：帖子页抓取与解析。

它目前还不包含前端页面、通知流程或最终数据库设计。

## 使用说明

1. 在 `backend/.env` 中创建基础配置：

   ```env
   BBS_USERNAME=your-username
   BBS_PASSWORD=your-password
   ```

2. 在 `backend/` 目录下执行命令。

## 常用命令

```bash
cd backend
uv run pytest -q
uv run byr-bbs login
uv run byr-bbs board --name IWhisper --page 1
uv run byr-bbs thread --board IWhisper --article-id 8830220 --page 2
uv run byr-sync-cache
```

旧的 `byr-auth` 命令仍然可用，但共享 CLI 已迁移到 `byr_cli/`。

## 同步 API

当前仓库已经具备可直接运行的同步 API，入口为 `byr-sync-api`。它负责向 Web 提供两类能力：

- 主拉取：`/api/sync/updates`
- 指定帖子补拉：`/api/sync/backfill`

1. 启动本地 Redis：

   ```bash
   docker run --rm --name byr-sync-redis -p 6379:6379 redis:7
   ```

2. 在 `backend/.env` 中补充同步 API 需要的配置：

   ```env
   BYR_SYNC_API_TOKEN=__ASK_USER_BEFORE_RUNNING__
   BYR_SYNC_REDIS_URL=__ASK_USER_BEFORE_RUNNING__
   ```

3. 启动同步 API：

   ```bash
   uv run byr-sync-api
   ```

4. 访问接口：

- `GET /healthz`
- `GET /api/sync/updates`
- `GET /api/sync/backfill`

示例：

- `GET /api/sync/updates?board_name=IWhisper&window_minutes=30`

`/api/sync/updates` 既服务最近窗口同步，也服务 Web 端的批量全量抓取。全量抓取不会新增独立接口，而是通过更大的 `window_minutes` 复用同一条同步链路。为避免单次请求长时间不返回，Web 会带 `start_page` 和 `max_pages` 按板块页分块循环调用；后端会在响应中返回 `next_page` 和 `has_more` 供 Web 继续推进。为避免影响主站，抓取循环会在多页请求之间执行固定等待。

当前分支里，Web 会先在代码中固化一份首页板块目录，再由前端多选创建一条批量全量抓取总任务；后端不需要为每个板块暴露独立全量接口，只需继续把 `/api/sync/updates` 作为统一入口。Web 最近同步通常会带较小的 `limit`，而批量全量抓取会复用同一接口、传入更大的 `window_minutes`，并且不附带 `limit` 参数，让服务按时间窗口持续翻页。

`/api/sync/updates` 默认从第 1 页开始按最近活动顺序翻页，也可以通过 `start_page` 指定起始页，并通过 `max_pages` 限制本次最多扫描的板块页数。接口会在遇到窗口外主题后停止继续翻页；如果请求带了 `limit`，则会在达到条数后提前停止。版面列表中的 `HH:MM:SS` 按当天时间解析，`YYYY-MM-DD` 按当日 `23:59:59` 解析。

`/api/sync/backfill` 继续用于指定帖子补拉，供 Web 在已知帖子或回复需要追补时单独请求，不参与批量全量抓取的主流程。

同步接口会复用本地北邮人账号登录态，因此 `BBS_USERNAME` 和 `BBS_PASSWORD` 仍然需要在 `backend/.env` 中配置。`BYR_SYNC_API_TOKEN` 用于保护同步接口，`BYR_SYNC_REDIS_URL` 需要指向可用的 Redis 连接地址。

## 清理同步缓存

在 `backend/` 目录下可以直接使用快捷命令：

```bash
uv run byr-sync-cache
```

默认只会清理同步缓存前缀 `sync:thread:*`，不会直接清空整个 Redis。

如果只想清理某个版面的同步缓存：

```bash
uv run byr-sync-cache --board IWhisper
```

如果确认要清空当前 Redis db：

```bash
uv run byr-sync-cache --all
```

同样的能力也可以通过共享 CLI 使用：

```bash
uv run byr-bbs clear-sync-cache
```

## Docker 构建

当前 `backend/Dockerfile` 以 `backend/` 目录本身作为构建上下文。

如果你在仓库根目录执行：

```bash
docker build -f backend/Dockerfile -t bbs-sync-api:local backend
```

如果你已经进入 `backend/` 目录执行：

```bash
docker build -t bbs-sync-api:local .
```

如果你在 Dokploy 或其他平台上单独部署后端服务，请把 `Build Context` 设置为 `backend`；如果平台要求单独填写 Dockerfile 路径，则使用 `backend/Dockerfile` 或上下文内的 `Dockerfile`，两者都要和 `backend` 这个上下文保持一致。

## Docker 运行

运行前请准备好所需环境变量，例如 `BBS_USERNAME`、`BBS_PASSWORD`、`BYR_SYNC_API_TOKEN`、`BYR_SYNC_REDIS_URL`。

```bash
docker run --rm -p 8000:8000 \
  -e BBS_USERNAME=__ASK_USER_BEFORE_RUNNING__ \
  -e BBS_PASSWORD=__ASK_USER_BEFORE_RUNNING__ \
  -e BYR_SYNC_API_TOKEN=__ASK_USER_BEFORE_RUNNING__ \
  -e BYR_SYNC_REDIS_URL=__ASK_USER_BEFORE_RUNNING__ \
  bbs-sync-api:local
```

容器启动后，默认监听 `0.0.0.0:8000` 并对外提供同步 API。
