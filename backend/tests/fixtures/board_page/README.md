These fixtures are recorded from the live BYR board HTML instead of being hand-written.

Use them for parser tests that should reflect real DOM structure:

- `iwhisper_page_1.html`: current first page snapshot, covers sticky posts and a next-page link.
- `iwhisper_page_134.html`: current last page snapshot, covers the terminal page without a next-page link.

Refresh them with:

```bash
cd /home/yinyra/code/bbsAchieve/backend
uv run python scripts/record_board_page_fixtures.py --board IWhisper --pages 1 134
```

The recorder logs into the board using the project's existing auth flow, decodes the response from the page encoding, and writes UTF-8 HTML files into this directory.
