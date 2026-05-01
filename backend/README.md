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
cd /home/yinyra/code/bbsAchieve/backend
uv run pytest -q
uv run byr-bbs login
uv run byr-bbs board --name IWhisper --page 1
uv run byr-bbs thread --board IWhisper --article-id 8830220 --page 2
```

旧的 `byr-auth` 命令仍然可用，但共享 CLI 已迁移到 `byr_cli/`。

## 同步 API

当前仓库已经具备可直接运行的同步 API，入口为 `byr-sync-api`。

1. 启动本地 Redis：

   ```bash
   docker run --rm --name byr-sync-redis -p 6379:6379 redis:7
   ```

2. 在 `backend/.env` 中补充同步 API 需要的配置：

   ```env
   BYR_SYNC_API_TOKEN=your-sync-api-token
   BYR_SYNC_REDIS_URL=redis://localhost:6379/0
   ```

3. 启动同步 API：

   ```bash
   uv run byr-sync-api
   ```

4. 访问接口：

   - `GET /healthz`
   - `GET /api/sync/updates`
   - `GET /api/sync/backfill`

同步接口会复用本地北邮人账号登录态，因此 `BBS_USERNAME` 和 `BBS_PASSWORD` 仍然需要在 `backend/.env` 中配置。`BYR_SYNC_API_TOKEN` 用于保护同步接口，`BYR_SYNC_REDIS_URL` 默认指向 `redis://127.0.0.1:6379/0`。
