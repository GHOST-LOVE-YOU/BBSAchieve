from byr_sync import InMemorySyncCache, THREAD_TTL_SECONDS


def test_save_thread_progress_sets_three_day_ttl() -> None:
    cache = InMemorySyncCache()
    recent_post_ids = ["p1", "p2"]

    progress = cache.save_thread_progress(
        board_name="test_board",
        article_id="123",
        reply_count=7,
        recent_post_ids=recent_post_ids,
    )

    assert progress.reply_count == 7
    assert progress.ttl_seconds == THREAD_TTL_SECONDS
    assert progress.article_id == "123"
    assert cache.thread_progress["test_board:123"] is progress
    assert progress.recent_post_ids == ["p1", "p2"]

    recent_post_ids.append("p3")

    assert progress.recent_post_ids == ["p1", "p2"]
