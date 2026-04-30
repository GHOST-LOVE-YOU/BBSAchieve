These fixtures are recorded from live BYR thread HTML instead of being hand-written.

Use them for parser tests that should reflect real DOM structure:

- `iwhisper_article_8830220_page_1.html`: anonymous multi-page thread, first page with the original post.
- `iwhisper_article_8830220_page_2.html`: anonymous multi-page thread, middle page with reply-only floors.
- `iwhisper_article_5738890_page_1.html`: named single-page thread in IWhisper.

Refresh them with:

```bash
cd /home/yinyra/code/bbsAchieve/backend
uv run python scripts/record_thread_page_fixtures.py
```

The recorder logs into the board using the project's existing auth flow, decodes the response from the page encoding, and writes UTF-8 HTML files into this directory.
