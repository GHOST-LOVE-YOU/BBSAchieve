# BYR Backend

This backend currently focuses on three collection capabilities:

- `byr_auth`: login state and cookie reuse.
- `byr_boards`: board list fetching and parsing.
- `byr_threads`: thread detail fetching and parsing.

It does not yet include a frontend, notification flow, or a final database design.

## Setup

1. Create `backend/.env` with:

   ```env
   BBS_USERNAME=your-username
   BBS_PASSWORD=your-password
   ```

2. Run commands from `backend/`.

## Common Commands

```bash
cd /home/yinyra/code/bbsAchieve/backend
uv run pytest -q
uv run byr-bbs login
uv run byr-bbs board --name IWhisper --page 1
uv run byr-bbs thread --board IWhisper --article-id 8830220 --page 2
```

The legacy `byr-auth` command still works, but the shared CLI now lives in `byr_cli/`.

## Sync API Setup

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
