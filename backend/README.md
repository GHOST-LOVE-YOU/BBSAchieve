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
