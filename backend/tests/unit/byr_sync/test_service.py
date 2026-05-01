from byr_sync import InMemorySyncCache, THREAD_TTL_SECONDS


def test_save_thread_progress_sets_three_day_ttl() -> None:
    cache = InMemorySyncCache()

    progress = cache.save_thread_progress(
        board_name="test_board",
        article_id=123,
        reply_count=7,
    )

    assert progress.reply_count == 7
    assert progress.ttl_seconds == THREAD_TTL_SECONDS
