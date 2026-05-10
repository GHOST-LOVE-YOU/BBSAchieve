/* BYR Achieve Mobile — app shell + screens
   重构要点：
   - 帖子流改为无限滚动，去掉分页器
   - 帖子详情：去掉「引用」按钮
   - 首页只展示机器人镜像信息流，按最新回复排序，无排序切换
   - 底部 4 栏：首页 / 浏览 / 通知 / 我（其中「浏览」即收藏入口）
   - 收藏：分「板块」与「帖子」两类；板块来自三级树 分区→子分区→板块
*/

const { useState, useEffect, useMemo, useRef, useCallback } = React;

/* ===========================================================
 * Pull-to-refresh
 * 监听最近的滚动容器（.m-body）：在 scrollTop===0 时下拉，
 * 内容跟随手指带阻尼下移；超过阈值松手 → 停留在临时高度并播放刷新动画 ~1.4s，
 * 完成后回弹消失。支持触屏 + 桌面鼠标拖拽（用于在原型中模拟）。
 * =========================================================== */
function PullToRefresh({ onRefresh, children }) {
  const wrapRef = useRef(null);
  const [pull, setPull] = useState(0);
  const [phase, setPhase] = useState("idle"); // idle | pulling | refreshing
  const dragging = useRef(false);
  const startY = useRef(0);
  const phaseRef = useRef("idle");
  const pullRef = useRef(0);
  phaseRef.current = phase;
  pullRef.current = pull;
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const wrap = wrapRef.current;
    const scroller = wrap?.parentElement;
    if (!scroller) return;
    const THRESHOLD = 64;
    const REST = 58;
    const MAX = 130;

    const start = (y) => {
      if (phaseRef.current === "refreshing") return;
      if (scroller.scrollTop > 0) return;
      dragging.current = true;
      startY.current = y;
    };
    const move = (y, e) => {
      if (!dragging.current) return;
      if (scroller.scrollTop > 0) {
        dragging.current = false;
        if (phaseRef.current === "pulling") { setPhase("idle"); setPull(0); }
        return;
      }
      const dy = y - startY.current;
      if (dy <= 0) {
        if (pullRef.current !== 0) setPull(0);
        return;
      }
      const damped = Math.min(MAX, Math.pow(dy, 0.86));
      if (phaseRef.current !== "pulling") setPhase("pulling");
      setPull(damped);
      if (e && e.cancelable) e.preventDefault();
    };
    const end = () => {
      if (!dragging.current) return;
      dragging.current = false;
      if (phaseRef.current !== "pulling") return;
      if (pullRef.current >= THRESHOLD) {
        setPhase("refreshing");
        setPull(REST);
        window.setTimeout(() => {
          try { onRefreshRef.current && onRefreshRef.current(); } catch (_) {}
          setPhase("idle");
          setPull(0);
        }, 1400);
      } else {
        setPhase("idle");
        setPull(0);
      }
    };

    const ts = (e) => start(e.touches[0].clientY);
    const tm = (e) => move(e.touches[0].clientY, e);
    const te = end;
    const ms = (e) => { if (e.button !== 0) return; start(e.clientY); };
    const mm = (e) => { if (dragging.current) move(e.clientY, e); };
    const me = end;

    scroller.addEventListener("touchstart", ts, { passive: true });
    scroller.addEventListener("touchmove", tm, { passive: false });
    scroller.addEventListener("touchend", te);
    scroller.addEventListener("touchcancel", te);
    scroller.addEventListener("mousedown", ms);
    window.addEventListener("mousemove", mm);
    window.addEventListener("mouseup", me);

    return () => {
      scroller.removeEventListener("touchstart", ts);
      scroller.removeEventListener("touchmove", tm);
      scroller.removeEventListener("touchend", te);
      scroller.removeEventListener("touchcancel", te);
      scroller.removeEventListener("mousedown", ms);
      window.removeEventListener("mousemove", mm);
      window.removeEventListener("mouseup", me);
    };
  }, []);

  const animating = phase !== "pulling";
  const ready = pull >= 64;
  // arrow circle progress (0..1) before refreshing
  const progress = Math.min(1, pull / 64);
  return (
    <div
      ref={wrapRef}
      className="m-ptr"
      style={{
        transform: `translateY(${pull}px)`,
        transition: animating ? "transform 360ms cubic-bezier(.2,.8,.2,1)" : "none",
      }}
    >
      <div className={`m-ptr-indicator ${phase}`} style={{ opacity: Math.min(1, pull / 24) }}>
        <div className={`m-ptr-circle ${phase === "refreshing" ? "spin" : ""}`}>
          {phase === "refreshing" ? (
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
              <circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeDasharray="50.3" strokeDashoffset="34"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"
              style={{ transform: `rotate(${ready ? 180 : 0}deg)`, transition: "transform 220ms ease" }}>
              <circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2"/>
              <circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeDasharray="50.3"
                strokeDashoffset={50.3 - 50.3 * progress}
                transform="rotate(-90 11 11)"/>
              <path d="M7.5 10.5 L11 13.5 L14.5 10.5" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                style={{ opacity: progress }}/>
            </svg>
          )}
        </div>
        <div className="m-ptr-label">
          {phase === "refreshing" ? "正在刷新…" : ready ? "松开刷新" : "下拉刷新"}
        </div>
      </div>
      {children}
    </div>
  );
}

/* ===========================================================
 * Bottom Sheet
 * =========================================================== */
function Sheet({ open, onClose, title, children }) {
  return (
    <div className={`m-sheet-overlay ${open ? "open" : ""}`} onClick={(e) => e.target.classList.contains("m-sheet-overlay") && onClose()}>
      <div className="m-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="m-sheet-handle"/>
        {title && (
          <div className="m-sheet-title">
            <span>{title}</span>
            <button className="x" onClick={onClose}><Icon name="x" size={14}/></button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/* ===========================================================
 * TopBar
 * =========================================================== */
function TopBar({ title, back, onBack, right, brand }) {
  return (
    <div className="m-topbar">
      {back ? (
        <button className="m-back" onClick={onBack}><Icon name="chevronLeft" size={20}/> 返回</button>
      ) : brand ? null : (
        <span style={{ width: 36 }}/>
      )}
      <div className="m-topbar-title" style={{ justifyContent: brand ? "flex-start" : "center", paddingLeft: brand ? 4 : 0 }}>
        {brand ? (
          <>
            <div className="brand-mark">B</div>
            <span style={{ fontWeight: 600 }}>BYR <em style={{ fontStyle: "normal", color: "var(--primary)" }}>Achieve</em></span>
          </>
        ) : (
          <span>{title}</span>
        )}
      </div>
      {right || <span style={{ width: 36 }}/>}
    </div>
  );
}

/* ===========================================================
 * Mobile post card
 * =========================================================== */
function MPostCard({ post, onClick }) {
  return (
    <div className="m-postcard" onClick={onClick}>
      <Avatar author={post.author} size={36}/>
      <div style={{ minWidth: 0 }}>
        <div className="pc-title">
          {post.pinned && <Pill tone="red">置顶</Pill>}
          {post.title}
        </div>
        <div className="pc-excerpt">{post.excerpt}</div>
        <div className="pc-meta">
          <span className="pc-section">{post.boardName}</span>
          <span className="author">{post.author.name}</span>
          <span>· {rel(post.lastReplyMin)}</span>
          <span className="replies"><Icon name="reply" size={11}/>{post.replies}</span>
        </div>
      </div>
    </div>
  );
}

/* ===========================================================
 * Infinite-scroll hook
 * Uses an IntersectionObserver on a sentinel div, triggers loadMore
 * if hasMore is true.
 * =========================================================== */
function InfiniteSentinel({ hasMore, onLoadMore, label = "加载更多…", endLabel = "—— 到底了 ——" }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!hasMore) return;
    const node = ref.current;
    if (!node) return;
    const root = node.closest(".m-body") || null;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) onLoadMore();
    }, { root, rootMargin: "200px" });
    obs.observe(node);
    return () => obs.disconnect();
  }, [hasMore, onLoadMore]);

  if (!hasMore) {
    return <div className="m-loader end" ref={ref}>{endLabel}</div>;
  }
  return (
    <div className="m-loader" ref={ref}>
      <span className="spinner"/> {label}
    </div>
  );
}

/* ===========================================================
 * HOME — 单一镜像信息流，无限滚动
 * =========================================================== */
function MHomePage({ ctx }) {
  const PAGE = 8;
  const [refreshKey, setRefreshKey] = useState(0);
  const [count, setCount] = useState(PAGE);
  const all = useMemo(() => makePosts(60, { bot: true, idStart: 100 + refreshKey * 1000 }), [refreshKey]);
  // already sorted by lastReplyMin in makePosts
  const visible = all.slice(0, count);
  const hasMore = count < all.length;
  const loadMore = useCallback(() => {
    setCount(c => Math.min(c + PAGE, all.length));
  }, [all.length]);
  const onRefresh = useCallback(() => {
    setCount(PAGE);
    setRefreshKey(k => k + 1);
  }, []);

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <div className="m-page">
        <div className="m-hero">
          <div className="t-eyebrow muted">机器人镜像信息流</div>
          <h2>今天，机器人替你巡视北邮人论坛</h2>
          <p>每条镜像内容都以机器人身份发帖回帖。按最新回复排序。</p>
          <div className="stat"><strong>{all.length}</strong> 今日镜像帖</div>
        </div>

        <div className="m-postlist">
          {visible.map(p => <MPostCard key={p.id} post={p} onClick={() => ctx.goPost(p)}/>)}
        </div>

        <InfiniteSentinel hasMore={hasMore} onLoadMore={loadMore}/>
      </div>
    </PullToRefresh>
  );
}

/* ===========================================================
 * POST DETAIL — 无限滚动回复，去掉「引用」
 * =========================================================== */
function MPostDetail({ ctx, isFavorited, toggleFavoritePost }) {
  const post = ctx.activePost || makePosts(1, { bot: true, idStart: 1 })[0];
  const PAGE = 10;
  const TOTAL = 87;
  const [refreshSalt, setRefreshSalt] = useState(0);
  const [count, setCount] = useState(PAGE);
  const [subFloors, setSubFloors] = useState({});
  const [postSub, setPostSub] = useState(false);
  const onRefresh = useCallback(() => {
    setCount(PAGE);
    setRefreshSalt(s => s + 1);
  }, []);

  const replies = useMemo(() => Array.from({ length: count }).map((_, i) => ({
    id: `r${i}`,
    floor: i + 2,
    author: post.isBot ? pick(window.BOTS, i) : pick(window.AUTHORS, i + 2),
    mins: 30 + i * 8,
    content: post.isBot
      ? ["（镜像）这位楼主提到的方案我之前在 17 楼也补充过类似的，原帖楼下还有一个引用了知乎相关讨论的链接。",
         "确实是这样，去年我也试过，主要的难点是导风的角度。",
         "mark 一下，蹲一个最终方案。",
         "楼主好棒呀，文章写得很清晰，期待续集。",
         "插个嘴：这个思路在隔壁帖子里有人补过更详细的图。",
         "👍 收藏了。"][i % 6]
      : ["官方说明已同步，遇到问题请通过工单反馈。",
         "感谢反馈，我们已经记下来了。",
         "+1，希望尽快推进。",
         "已收到，转给对应的同学跟进。"][i % 4],
  })), [count, post.isBot]);

  const hasMore = count < TOTAL;
  const loadMore = useCallback(() => {
    setCount(c => Math.min(c + PAGE, TOTAL));
  }, [TOTAL]);

  const fav = isFavorited(post.id);

  return (
    <PullToRefresh onRefresh={onRefresh}>
    <div className="m-page" data-refresh-salt={refreshSalt}>
      <div className="m-thread-head">
        {post.isBot && (
          <div className="m-thread-banner">
            🪞 镜像帖 · 同步于 {rel(post.postedMin)}
            <span style={{ marginLeft: "auto", color: "var(--primary)", fontWeight: 500 }}>查看源帖 →</span>
          </div>
        )}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Pill tone="mauve">{post.boardName ? `${post.sectionName} · ${post.boardName}` : post.sectionName}</Pill>
        </div>
        <div className="m-thread-title">{post.title}</div>
        <div className="m-thread-author">
          <Avatar author={post.author} size={40}/>
          <div>
            <div className="name">{post.author.name}</div>
            <div className="meta">{rel(post.postedMin)} · 浏览 {post.views} · {post.replies} 回复</div>
          </div>
        </div>
        <div className="m-thread-content">
          <p>{post.excerpt}</p>
          <p>下面是我整理的几点：</p>
          <p>1. 静音风扇 + 导风板，是目前最稳的方案。</p>
          <p>2. 改造时务必征得舍友同意。</p>
          <p>3. 预算有限的话，几十块的 USB 散热扇 + 厚纸板效果也能凑合。</p>
        </div>
        <div className="m-thread-actions">
          <button className={postSub ? "btn btn-secondary" : "btn btn-primary"} onClick={() => setPostSub(s => !s)}>
            <Icon name={postSub ? "check" : "bell"} size={13}/> {postSub ? "已订阅" : "订阅该帖"}
          </button>
          <button className={fav ? "btn btn-secondary" : "btn btn-secondary"}
            style={fav ? { color: "var(--primary)" } : null}
            onClick={() => toggleFavoritePost(post)}>
            <Icon name="bookmark" size={13}/> {fav ? "已收藏" : "收藏"}
          </button>
        </div>
      </div>

      <div className="m-replies-head">
        <span>{TOTAL} 条回复</span>
        <span style={{ flex: 1 }}/>
        <button className="m-chipbtn">
          <Icon name="user" size={12}/> 仅看楼主
        </button>
      </div>

      {replies.map(r => (
        <div key={r.id} className="m-reply">
          <Avatar author={r.author} size={36}/>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="name">{r.author.name}</span>
              <span className="meta">#{r.floor} · {rel(r.mins)}</span>
            </div>
            <div className="body">{r.content}</div>
            <div className="actions">
              <button className="btn btn-ghost btn-sm"
                onClick={() => setSubFloors(s => ({ ...s, [r.id]: !s[r.id] }))}>
                <Icon name={subFloors[r.id] ? "check" : "bell"} size={12}/>
                {subFloors[r.id] ? "已订阅" : "订阅楼"}
              </button>
            </div>
          </div>
        </div>
      ))}

      <InfiniteSentinel hasMore={hasMore} onLoadMore={loadMore} endLabel="—— 已加载全部 87 条回复 ——"/>

      <div style={{ height: 70 }}/>
    </div>
    </PullToRefresh>
  );
}

/* ===========================================================
 * BOT PROFILE
 * =========================================================== */
function MBotProfile({ ctx }) {
  const bot = ctx.activeBot || window.BOTS[0];
  const [tab, setTab] = useState("posts");
  const [subPosts, setSubPosts] = useState({});
  const [subReplies, setSubReplies] = useState({});

  const recentPosts = useMemo(() =>
    makePosts(8, { bot: true, offset: 1, idStart: 900 }).map(p => ({ ...p, author: bot })),
  [bot.id]);
  const recentReplies = useMemo(() => Array.from({ length: 8 }).map((_, i) => {
    const targets = makePosts(6, { bot: true, offset: 2, idStart: 950 });
    const t = targets[i % targets.length];
    const snippets = [
      "（镜像）我之前在 17 楼也补充过类似的方案。",
      "确实是这样，主要的难点是导风的角度。",
      "mark 一下，蹲一个最终方案。",
      "可以参考官方文档 4.2 节，里面有一张对比图。",
    ];
    return { id: `br${i}`, floor: 4 + i*2, target: t, mins: 8 + i*27, content: snippets[i % snippets.length] };
  }), [bot.id]);

  return (
    <div className="m-page">
      <div className="m-bot-hero">
        <Avatar author={bot} size={72}/>
        <h2>{bot.name}</h2>
        <div className="handle">@{bot.handle}</div>
        <p className="tagline">每隔 30 秒去北邮人论坛取一次新内容，转成发帖或回帖。点开下方条目可单独订阅。</p>
        <div className="pills">
          <Pill tone="blue">🤖 镜像</Pill>
          <Pill tone="turquoise">在线 8h12m</Pill>
          <Pill tone="green">{recentPosts.length + 128} 帖</Pill>
        </div>
      </div>

      <div className="m-segmented">
        <button className={`seg ${tab === "posts" ? "active" : ""}`} onClick={() => setTab("posts")}>
          📝 最近发帖 <span className="muted">{recentPosts.length}</span>
        </button>
        <button className={`seg ${tab === "replies" ? "active" : ""}`} onClick={() => setTab("replies")}>
          💬 最近回复 <span className="muted">{recentReplies.length}</span>
        </button>
      </div>

      <div className="m-postlist">
        {tab === "posts" && recentPosts.map(p => {
          const subbed = !!subPosts[p.id];
          return (
            <div key={p.id} className="m-postcard" style={{ gridTemplateColumns: "1fr" }}>
              <div>
                <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                  <Pill tone="mauve">发帖</Pill>
                  <span className="muted t-body-sm">{p.boardName}</span>
                </div>
                <div className="pc-title" onClick={() => ctx.goPost(p)}>{p.title}</div>
                <div className="pc-meta">
                  <span>{rel(p.postedMin)}</span>
                  <span>· {p.replies} 回复</span>
                  <button
                    className={subbed ? "btn btn-secondary btn-sm" : "btn btn-primary btn-sm"}
                    style={{ marginLeft: "auto" }}
                    onClick={(e) => { e.stopPropagation(); setSubPosts(s => ({ ...s, [p.id]: !s[p.id] })); }}>
                    <Icon name={subbed ? "check" : "bell"} size={12}/>
                    {subbed ? "已订阅" : "订阅"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {tab === "replies" && recentReplies.map(r => {
          const subbed = !!subReplies[r.id];
          return (
            <div key={r.id} className="m-postcard" style={{ gridTemplateColumns: "1fr" }}>
              <div>
                <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                  <Pill tone="blue">回复</Pill>
                  <span className="muted t-body-sm">#{r.floor} · {rel(r.mins)}</span>
                </div>
                <div className="t-body" style={{ fontSize: 14 }}>"{r.content}"</div>
                <div className="pc-meta" style={{ marginTop: 6 }}>
                  <span style={{ color: "var(--ink-secondary)", cursor: "pointer" }} onClick={() => ctx.goPost(r.target)}>
                    《{r.target.title.replace(/^\[镜像\]\s*/, "").slice(0, 18)}…》
                  </span>
                  <button
                    className={subbed ? "btn btn-secondary btn-sm" : "btn btn-primary btn-sm"}
                    style={{ marginLeft: "auto" }}
                    onClick={() => setSubReplies(s => ({ ...s, [r.id]: !s[r.id] }))}>
                    <Icon name={subbed ? "check" : "bell"} size={12}/>
                    {subbed ? "已订阅" : "订阅楼"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ height: 24 }}/>
    </div>
  );
}

/* ===========================================================
 * NOTIFICATIONS
 * =========================================================== */
function MNotifications({ ctx }) {
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState(window.NOTIFS);
  const filtered = items.filter(n => filter === "all" ? true : filter === "unread" ? n.unread : n.type === filter);
  const markAll = () => setItems(items.map(n => ({ ...n, unread: false })));
  const markOne = (id) => setItems(items.map(n => n.id === id ? { ...n, unread: false } : n));
  const unreadCount = items.filter(n => n.unread).length;

  return (
    <div className="m-page">
      <div style={{ padding: "12px 16px 8px" }}>
        <div className="t-eyebrow muted">通知中心</div>
        <h2 style={{ margin: "4px 0 4px", fontSize: 22, fontWeight: 500, letterSpacing: "-0.01em" }}>
          {unreadCount > 0 ? `${unreadCount} 条未读通知` : "已经全部看完啦"}
        </h2>
        <p className="muted t-body-sm" style={{ margin: 0 }}>通过你绑定的机器人收件箱送达 · 匿名</p>
      </div>

      <div className="m-subtabs">
        {[
          { k: "all", l: "全部" },
          { k: "unread", l: "未读" },
          { k: "reply", l: "回复" },
          { k: "mention", l: "@提及" },
          { k: "system", l: "系统" },
        ].map(t => (
          <button key={t.k} className={`m-subtab ${filter === t.k ? "active" : ""}`} onClick={() => setFilter(t.k)}>
            {t.l}{t.k === "unread" && unreadCount > 0 ? ` · ${unreadCount}` : ""}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="m-empty">
          <div className="ico">🔔</div>
          <div className="title">没有通知</div>
          <div className="sub">新内容会出现在这里</div>
        </div>
      ) : (
        <>
          {filtered.map(n => (
            <div key={n.id} className={`m-notif ${n.unread ? "unread" : ""}`} onClick={() => markOne(n.id)}>
              <div className="icon-circle" style={{ background: n.color }}>{n.ico}</div>
              <div>
                <div className="body">{n.body}</div>
                <div className="source">{n.source}</div>
              </div>
              <div className="time">{rel(n.time)}</div>
            </div>
          ))}
        </>
      )}

      {filtered.length > 0 && (
        <div style={{ padding: "16px", textAlign: "center" }}>
          <button className="btn btn-tertiary btn-sm" onClick={markAll}>
            <Icon name="check" size={13}/> 全部标为已读
          </button>
        </div>
      )}
      <div style={{ height: 30 }}/>
    </div>
  );
}

/* ===========================================================
 * BOARD POSTS — 板块下的帖子列表（无限滚动）
 * =========================================================== */
function MBoardPage({ ctx, board, isFavorited, toggleFavoriteBoard }) {
  const PAGE = 8;
  const [count, setCount] = useState(PAGE);
  const all = useMemo(() => makePosts(36, { bot: true, idStart: 600 + parseInt((board.id || "b0").replace(/\D/g, "") || "0") }).map(p => ({ ...p, boardName: board.name, sectionName: board.sectionName, sectionId: board.sectionId, subId: board.subId, subName: board.subName, boardId: board.id })), [board.id]);
  const visible = all.slice(0, count);
  const hasMore = count < all.length;
  const loadMore = useCallback(() => setCount(c => Math.min(c + PAGE, all.length)), [all.length]);
  const fav = isFavorited(board.id);

  return (
    <div className="m-page">
      <div className="m-hero" style={{ background: "var(--surface-peach)" }}>
        <div className="t-eyebrow muted">{board.sectionIcon} {board.sectionName} · {board.subName}</div>
        <h2>{board.name}</h2>
        <p>{board.desc}</p>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button
            className={fav ? "btn btn-secondary btn-sm" : "btn btn-primary btn-sm"}
            onClick={() => toggleFavoriteBoard(board.id)}>
            <Icon name="bookmark" size={13}/> {fav ? "已收藏板块" : "收藏板块"}
          </button>
          <span className="stat"><strong>{board.posts}</strong> 总帖数</span>
        </div>
      </div>

      <div className="m-postlist">
        {visible.map(p => <MPostCard key={p.id} post={p} onClick={() => ctx.goPost(p)}/>)}
      </div>

      <InfiniteSentinel hasMore={hasMore} onLoadMore={loadMore}/>
    </div>
  );
}

/* ===========================================================
 * BROWSE — 三级浏览：分区 / 子分区+板块 / (collected via favorite star)
 * =========================================================== */
function StarBtn({ on, onClick }) {
  return (
    <button className={`m-star ${on ? "on" : ""}`} onClick={(e) => { e.stopPropagation(); onClick(); }} title={on ? "取消收藏" : "收藏板块"}>
      <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 17.5l-1.18-1.07C4.6 12.6 2 10.25 2 7.4 2 5.07 3.78 3.25 6 3.25c1.27 0 2.49.6 3.27 1.55h1.46C11.51 3.85 12.73 3.25 14 3.25c2.22 0 4 1.82 4 4.15 0 2.85-2.6 5.2-6.82 9.03L10 17.5z"/>
      </svg>
    </button>
  );
}

function MBrowseSections({ ctx }) {
  const tones = ["var(--surface-blush)", "var(--surface-butter)", "var(--surface-sage)", "var(--surface-sky)", "var(--surface-peach)", "var(--surface-mauve)", "var(--surface-cream)"];
  return (
    <div className="m-page">
      <div className="m-fav-hero">
        <div className="t-eyebrow muted">浏览所有分区</div>
        <h2>找一个板块来收藏</h2>
        <div className="sub">分区 → 子分区 → 板块。点⭐收藏，板块会出现在「收藏」首页。</div>
      </div>

      <div className="m-list-header">全部分区</div>
      <div className="m-browse-list">
        {window.SECTIONS.map((s, i) => (
          <div key={s.id} className="m-browse-row" onClick={() => ctx.goBrowseSub(s.id)}>
            <div className="ico" style={{ background: tones[i % tones.length] }}>{s.icon}</div>
            <div>
              <div className="name">{s.name}</div>
              <div className="desc">{s.desc}</div>
              <div className="meta">
                {s.subs.length} 子分区 · {s.subs.reduce((a, sub) => a + sub.boards.length, 0)} 板块
              </div>
            </div>
            <Icon name="chevron" size={16} className="chev"/>
          </div>
        ))}
      </div>
    </div>
  );
}

function MBrowseSubsAndBoards({ ctx, sectionId, isFavorited, toggleFavoriteBoard }) {
  const sec = window.SECTIONS.find(s => s.id === sectionId) || window.SECTIONS[0];
  return (
    <div className="m-page">
      <div className="m-browse-crumb">
        <span>分区</span><span className="sep">›</span>
        <b>{sec.icon} {sec.name}</b>
      </div>
      <div className="m-fav-hero">
        <div className="t-eyebrow muted">{sec.icon} {sec.name}</div>
        <h2>子分区与板块</h2>
        <div className="sub">点⭐把板块加入收藏；点击板块进入帖子列表。</div>
      </div>

      {sec.subs.map(sub => (
        <div key={sub.id}>
          <div className="m-list-header">{sub.name}</div>
          <div className="m-browse-list">
            {sub.boards.map(b => {
              const fav = isFavorited(b.id);
              return (
                <div key={b.id} className="m-browse-row" onClick={() => ctx.goBoard({ ...b, sectionId: sec.id, sectionName: sec.name, sectionIcon: sec.icon, subId: sub.id, subName: sub.name })}>
                  <div className="ico" style={{ background: "var(--canvas-cream)", fontSize: 14, fontWeight: 600, color: "var(--ink-secondary)" }}>
                    {b.name.slice(0, 1)}
                  </div>
                  <div>
                    <div className="name">{b.name}</div>
                    <div className="desc">{b.desc}</div>
                    <div className="meta">{b.posts.toLocaleString()} 帖</div>
                  </div>
                  <StarBtn on={fav} onClick={() => toggleFavoriteBoard(b.id)}/>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div style={{ height: 24 }}/>
    </div>
  );
}

/* ===========================================================
 * FAVORITES — 收藏：板块 + 帖子
 * =========================================================== */
function MFavoritesPage({ ctx, favBoardIds, favPosts, toggleFavoriteBoard, toggleFavoritePost }) {
  const [tab, setTab] = useState("boards"); // boards | posts
  const favBoards = favBoardIds.map(id => window.findBoard(id)).filter(Boolean);

  return (
    <div className="m-page">
      <div className="m-fav-hero">
        <div className="t-eyebrow muted">我的收藏</div>
        <h2>{tab === "boards" ? `${favBoards.length} 个板块` : `${favPosts.length} 个帖子`}</h2>
        <div className="sub">板块 = 三级目录的最小单元（如「前端」「面经分享」）；帖子 = 你在帖子页点过收藏的内容。</div>
      </div>

      <div className="m-segmented">
        <button className={`seg ${tab === "boards" ? "active" : ""}`} onClick={() => setTab("boards")}>
          📌 板块 <span className="muted">{favBoards.length}</span>
        </button>
        <button className={`seg ${tab === "posts" ? "active" : ""}`} onClick={() => setTab("posts")}>
          🔖 帖子 <span className="muted">{favPosts.length}</span>
        </button>
      </div>

      {tab === "boards" && (
        <>
          <div className="m-fav-cta" onClick={ctx.goBrowse}>
            <div className="ico"><Icon name="folder" size={18}/></div>
            <div>
              <div>浏览所有分区，添加板块</div>
              <div className="meta">分区 → 子分区 → 板块（最小单元）</div>
            </div>
            <Icon name="chevron" size={16} className="chev"/>
          </div>

          {favBoards.length === 0 ? (
            <div className="m-fav-empty">
              <div className="ico">🌱</div>
              <div className="title">还没有收藏的板块</div>
              <div className="sub">点击上方按钮浏览全部分区，再点⭐把板块收藏到这里</div>
            </div>
          ) : (
            <div className="m-fav-list">
              {favBoards.map(b => (
                <div key={b.id} className="m-fav-row" onClick={() => ctx.goBoard(b)}>
                  <div className="ico" style={{ background: "var(--canvas-cream)", fontSize: 14, fontWeight: 600, color: "var(--ink-secondary)" }}>
                    {b.name.slice(0, 1)}
                  </div>
                  <div>
                    <div className="name">{b.name}</div>
                    <div className="meta">{b.sectionIcon} {b.sectionName} · {b.subName} · {b.posts.toLocaleString()} 帖</div>
                  </div>
                  <StarBtn on={true} onClick={() => toggleFavoriteBoard(b.id)}/>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "posts" && (
        <>
          {favPosts.length === 0 ? (
            <div className="m-fav-empty">
              <div className="ico">🔖</div>
              <div className="title">还没有收藏的帖子</div>
              <div className="sub">在帖子详情页点「收藏」，帖子会出现在这里</div>
            </div>
          ) : (
            <div className="m-postlist">
              {favPosts.map(p => (
                <MPostCard key={p.id} post={p} onClick={() => ctx.goPost(p)}/>
              ))}
            </div>
          )}
        </>
      )}

      <div style={{ height: 24 }}/>
    </div>
  );
}

/* ===========================================================
 * PROFILE
 * =========================================================== */
function MProfilePage({ ctx, themeToggle, currentTheme }) {
  const [pref, setPref] = useState({ replies: true, mentions: true, system: false, digest: true, weekend: false });
  const set = (k, v) => setPref(p => ({ ...p, [k]: v }));

  const [channels, setChannels] = useState({
    telegram: { on: true,  target: "@xiaye_98",        verified: true  },
    email:    { on: true,  target: "x***@bupt.edu.cn", verified: true  },
    browser:  { on: false, target: "未授权",            verified: false },
  });
  const [primary, setPrimary] = useState("telegram");
  const [routingSheet, setRoutingSheet] = useState(false);
  const [routing, setRouting] = useState({
    replies:  { telegram: true,  email: true,  browser: true  },
    mentions: { telegram: true,  email: false, browser: true  },
    system:   { telegram: false, email: true,  browser: false },
    digest:   { telegram: false, email: true,  browser: false },
  });
  const toggleRoute = (ev, ch) => setRouting(r => ({ ...r, [ev]: { ...r[ev], [ch]: !r[ev][ch] } }));

  const channelMeta = [
    { id: "telegram", name: "Telegram", brand: "#229ED9", icon: "paperPlane", desc: "通过 @ByrAchieveBot 推送" },
    { id: "email",    name: "邮箱",     brand: "#D97757", icon: "mail",       desc: "5 分钟聚合，避免打扰" },
    { id: "browser",  name: "App 通知",  brand: "#547358", icon: "smartphone", desc: "通过系统通知中心推送" },
  ];
  const eventLabels = {
    replies:  "新回复", mentions: "@ 提及", system: "系统消息", digest: "每日早间汇总",
  };

  const subs = [
    { id: "s1", title: "研究生宿舍空调改造方案讨论", floors: "全帖", time: 5 },
    { id: "s2", title: "保研 edge 复盘", floors: "12 楼回复", time: 25 },
    { id: "s3", title: "字节抖音电商前端 二面挂经", floors: "全帖", time: 200 },
    { id: "s4", title: "校园网频繁掉线官方说明", floors: "3 楼回复", time: 480 },
  ];

  const [bindSheet, setBindSheet] = useState(null);

  return (
    <div className="m-page">
      <div className="m-profile-hero">
        <div className="avatar" style={{ background: "#446aa7", color: "#fff" }}>夏</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="t-eyebrow muted">个人中心</div>
          <div className="name">你好，夏夜</div>
          <div className="sub">{Object.values(channels).filter(c => c.on).length} / 3 通道启用 · {subs.length} 项订阅</div>
        </div>
      </div>

      <div className="m-section-title">
        <div className="eyebrow">通知通道</div>
        <h3>在哪里收到新动态？</h3>
      </div>
      <div className="m-channels">
        {channelMeta.map(meta => {
          const ch = channels[meta.id];
          const isPrim = primary === meta.id && ch.on;
          return (
            <div key={meta.id} className={`m-channel ${ch.on ? "on" : "off"} ${isPrim ? "primary" : ""}`}
              onClick={() => setBindSheet(meta.id)}>
              <div className="ico" style={{ background: meta.brand }}>
                <Icon name={meta.icon} size={18}/>
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="name">
                  {meta.name}
                  {isPrim && <Pill tone="blue">主</Pill>}
                  {ch.on
                    ? (ch.verified ? <Pill tone="green">已启用</Pill> : <Pill tone="yellow">待验证</Pill>)
                    : <Pill tone="red">未启用</Pill>}
                </div>
                <div className="target">{ch.target}</div>
                <div className="t-body-sm muted" style={{ marginTop: 4 }}>{meta.desc}</div>
              </div>
              <Icon name="chevron" size={16} style={{ color: "var(--ink-tertiary)" }}/>
            </div>
          );
        })}
      </div>

      <div className="m-section-title" style={{ marginTop: 8 }}>
        <div className="eyebrow">事件路由</div>
        <h3>每类事件发到哪里？</h3>
      </div>
      <div className="m-cardgroup">
        {Object.entries(eventLabels).map(([k, l]) => {
          const enabled = channelMeta.filter(m => routing[k][m.id] && channels[m.id].on);
          return (
            <button key={k} className="row" style={{ width: "100%", textAlign: "left", background: "transparent" }}
              onClick={() => setRoutingSheet(k)}>
              <span className="label">
                {l}
                <small>{enabled.length === 0 ? "仅在通知中心" : enabled.map(m => m.name).join(" · ")}</small>
              </span>
              <span className="val">
                {enabled.length}/3 <Icon name="chevron" size={14} className="chev"/>
              </span>
            </button>
          );
        })}
      </div>

      <div className="m-section-title" style={{ marginTop: 8 }}>
        <div className="eyebrow">通知偏好</div>
        <h3>接收哪些事件？</h3>
      </div>
      <div className="m-cardgroup">
        {[
          { k: "replies", l: "新回复通知", s: "你订阅的帖子有新回复时" },
          { k: "mentions", l: "@ 提及与认领", s: "有人引用了你认领的回复" },
          { k: "system", l: "系统消息", s: "镜像源失效、机器人切换等" },
          { k: "digest", l: "每日早间汇总", s: "每天 9:00 推送" },
          { k: "weekend", l: "周末免打扰", s: "仅推送高优先通知" },
        ].map(it => (
          <div key={it.k} className="row">
            <span className="label">{it.l}<small>{it.s}</small></span>
            <div className={`switch ${pref[it.k] ? "on" : ""}`} onClick={() => set(it.k, !pref[it.k])}/>
          </div>
        ))}
      </div>

      <div className="m-section-title" style={{ marginTop: 8 }}>
        <div className="eyebrow">订阅管理</div>
        <h3>已订阅的帖子与楼层</h3>
      </div>
      <div className="m-cardgroup">
        {subs.map(s => (
          <div key={s.id} className="row">
            <span className="label">
              {s.title}
              <small>{s.floors} · 最近更新 {rel(s.time)}</small>
            </span>
            <button className="btn btn-ghost btn-sm" style={{ color: "var(--error)" }}>取消</button>
          </div>
        ))}
      </div>

      <div className="m-section-title" style={{ marginTop: 8 }}>
        <div className="eyebrow">外观</div>
        <h3>主题</h3>
      </div>
      <div className="m-cardgroup">
        <div className="row">
          <span className="label">深色模式<small>当前：{currentTheme === "dark" ? "深色" : "浅色"}</small></span>
          <div className={`switch ${currentTheme === "dark" ? "on" : ""}`} onClick={themeToggle}/>
        </div>
      </div>

      <div style={{ height: 20 }}/>

      <Sheet open={!!routingSheet} onClose={() => setRoutingSheet(null)} title={routingSheet ? `${eventLabels[routingSheet]} · 发送到` : ""}>
        {routingSheet && channelMeta.map(m => {
          const enabled = channels[m.id].on;
          const checked = routing[routingSheet][m.id] && enabled;
          return (
            <button key={m.id} className="m-sheet-row" style={{ width: "100%", textAlign: "left", background: "transparent", opacity: enabled ? 1 : 0.5 }}
              onClick={() => enabled && toggleRoute(routingSheet, m.id)}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: m.brand, color: "#fff", display: "grid", placeItems: "center" }}>
                <Icon name={m.icon} size={14}/>
              </div>
              <div style={{ flex: 1 }}>
                <div>{m.name}</div>
                <div className="t-body-sm muted">{enabled ? channels[m.id].target : "未启用 · 先在上方启用通道"}</div>
              </div>
              <div className={`switch ${checked ? "on" : ""}`}/>
            </button>
          );
        })}
      </Sheet>

      <Sheet open={!!bindSheet} onClose={() => setBindSheet(null)}
        title={bindSheet ? channelMeta.find(m => m.id === bindSheet).name + " · 设置" : ""}>
        {bindSheet === "telegram" && (
          <div style={{ padding: "4px 18px 12px" }}>
            <div className="t-eyebrow muted" style={{ marginBottom: 8 }}>绑定步骤</div>
            <ol className="channel-steps" style={{ margin: 0 }}>
              <li>在 Telegram 内打开 <code>@ByrAchieveBot</code></li>
              <li>发送下面的一次性绑定码（10 分钟内有效）</li>
              <li>机器人会回复你一句确认，绑定即完成</li>
            </ol>
            <div className="channel-code" style={{ marginTop: 12 }}>
              <span>/start</span><span style={{ opacity: 0.65 }}>byr-7K3M-29QF-XJ8L</span>
              <button className="copy-btn">复制</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setPrimary("telegram")}>
                <Icon name="check" size={13}/> {primary === "telegram" ? "当前为主通道" : "设为主通道"}
              </button>
              <span style={{ flex: 1 }}/>
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--error)" }}
                onClick={() => { setChannels(c => ({ ...c, telegram: { on: false, target: "未连接", verified: false } })); setBindSheet(null); }}>
                <Icon name="trash" size={13}/> 解绑
              </button>
            </div>
          </div>
        )}
        {bindSheet === "email" && (
          <div style={{ padding: "4px 18px 12px" }}>
            <div className="t-eyebrow muted" style={{ marginBottom: 8 }}>邮箱地址</div>
            <input className="input" placeholder="you@bupt.edu.cn" defaultValue={channels.email.target.includes("@") ? channels.email.target : ""}/>
            <div className="t-body-sm muted" style={{ marginTop: 6 }}>建议使用 @bupt.edu.cn 学校邮箱</div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary btn-sm">发送验证邮件</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setPrimary("email")}>设为主通道</button>
            </div>
          </div>
        )}
        {bindSheet === "browser" && (
          <div style={{ padding: "4px 18px 12px" }}>
            <div className="t-eyebrow muted" style={{ marginBottom: 8 }}>App 推送通知</div>
            <ol className="channel-steps" style={{ margin: 0 }}>
              <li>点击下方按钮，系统会弹出通知权限请求</li>
              <li>选择「允许」后即可在通知中心收到推送</li>
              <li>可在「设置 - 通知」中调整提醒方式与免打扰</li>
            </ol>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }}
              onClick={() => { setChannels(c => ({ ...c, browser: { on: true, target: "本机 · iPhone", verified: true } })); setBindSheet(null); }}>
              <Icon name="bell" size={13}/> 请求通知权限
            </button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

/* ===========================================================
 * SEARCH OVERLAY
 * =========================================================== */
function MSearchOverlay({ open, onClose, ctx }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("posts");
  const inputRef = useRef();
  useEffect(() => {
    if (open && inputRef.current) setTimeout(() => inputRef.current.focus(), 200);
  }, [open]);
  return (
    <div className={`m-search-overlay ${open ? "open" : ""}`}>
      <div className="m-search-header">
        <div className="m-search-input">
          <Icon name="search" size={16}/>
          <input ref={inputRef} placeholder="搜索帖子 / 回复 / 机器人"
            value={query} onChange={e => setQuery(e.target.value)}/>
          {query && <button onClick={() => setQuery("")} style={{ background: "transparent", color: "var(--ink-tertiary)" }}>
            <Icon name="x" size={14}/>
          </button>}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>取消</button>
      </div>

      <div className="m-search-tabs">
        {[{ k: "posts", l: "帖子" }, { k: "replies", l: "回复" }, { k: "users", l: "机器人" }].map(t => (
          <button key={t.k} className={`m-search-tab ${tab === t.k ? "active" : ""}`} onClick={() => setTab(t.k)}>{t.l}</button>
        ))}
      </div>

      <div className="m-search-results">
        {!query && (
          <>
            <div className="t-eyebrow muted" style={{ padding: "12px 16px 0" }}>最近搜索</div>
            <div className="m-recent-chips">
              {["保研 edge", "宿舍 空调", "字节 前端", "校园网"].map(t => (
                <button key={t} className="m-recent-chip" onClick={() => setQuery(t)}>
                  <Icon name="clock" size={12}/> {t}
                </button>
              ))}
            </div>
            <div className="t-eyebrow muted" style={{ padding: "16px 16px 0" }}>站内仅机器人可被搜索</div>
            <div style={{ padding: "8px 16px 16px", color: "var(--ink-tertiary)", fontSize: 12.5 }}>
              真实用户身份不可被检索；查找镜像机器人可点击进入主页订阅。
            </div>
          </>
        )}
        {query && tab === "posts" && makePosts(5, { bot: true, offset: 1, idStart: 700 }).map(p => (
          <div key={p.id} className="m-search-result" onClick={() => { onClose(); ctx.goPost(p); }}>
            <Icon name="book" size={14} style={{ marginTop: 2, color: "var(--ink-tertiary)" }}/>
            <div>
              <div className="title">{p.title}</div>
              <div className="meta">{p.author.name} · {p.replies} 回复 · {rel(p.lastReplyMin)}</div>
            </div>
          </div>
        ))}
        {query && tab === "replies" && makePosts(5, { bot: true, offset: 4, idStart: 800 }).map((p, i) => {
          const sn = ["这个方案我之前也试过", "可以参考官方文档 4.2 节", "桌面端没那么明显，手机才看出来", "mark 一下", "同问，饱和后还会闪吗？"][i];
          return (
            <div key={p.id} className="m-search-result" onClick={() => { onClose(); ctx.goPost(p); }}>
              <Icon name="reply" size={14} style={{ marginTop: 2, color: "var(--ink-tertiary)" }}/>
              <div>
                <div className="title">"{sn}"</div>
                <div className="meta">#{4 + i*3} 楼 · 《{p.title.replace(/^\[镜像\]\s*/, "").slice(0, 20)}…》</div>
              </div>
            </div>
          );
        })}
        {query && tab === "users" && window.BOTS.map(b => (
          <div key={b.id} className="m-search-result" onClick={() => { onClose(); ctx.goBot(b); }}>
            <Avatar author={b} size={32}/>
            <div>
              <div className="title">{b.name} <span className="muted" style={{ fontWeight: 400 }}>@{b.handle}</span></div>
              <div className="meta">镜像机器人 · 进入主页 →</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===========================================================
 * APP SHELL
 * =========================================================== */
function MobileApp({ initialRoute }) {
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
  }, [theme]);

  const [route, setRoute] = useState(initialRoute || { name: "home" });
  const [searchOpen, setSearchOpen] = useState(false);
  const bodyRef = useRef(null);

  // Favorites — boards (id list) and posts (Post objects)
  const [favBoardIds, setFavBoardIds] = useState(["b-fe", "b-mianjing", "b-grad"]);
  const [favPosts, setFavPosts] = useState(() => makePosts(2, { bot: true, idStart: 30 }));
  const isFavoriteBoard = (id) => favBoardIds.includes(id);
  const toggleFavoriteBoard = (id) =>
    setFavBoardIds(arr => arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);
  const isFavoritePost = (id) => favPosts.some(p => p.id === id);
  const toggleFavoritePost = (post) =>
    setFavPosts(arr => arr.some(p => p.id === post.id) ? arr.filter(p => p.id !== post.id) : [post, ...arr]);

  const navigate = (r) => { setRoute(r); };
  const ctx = {
    goHome: () => navigate({ name: "home" }),
    goPost: (post) => navigate({ name: "post", post }),
    goBot: (bot) => navigate({ name: "bot", bot }),
    goFavorites: () => navigate({ name: "favorites" }),
    goBrowse: () => navigate({ name: "browse" }),
    goBrowseSub: (sectionId) => navigate({ name: "browseSub", sectionId }),
    goBoard: (board) => navigate({ name: "board", board }),
    activePost: route.post, activeBot: route.bot, activeBoard: route.board, activeSectionId: route.sectionId,
  };

  const titles = {
    home: "首页",
    post: "帖子详情",
    bot: route.bot?.name || "机器人主页",
    notifs: "通知",
    favorites: "收藏",
    browse: "浏览分区",
    browseSub: window.SECTIONS.find(s => s.id === route.sectionId)?.name || "子分区",
    board: route.board?.name || "板块",
    profile: "我",
  };

  const isHome = route.name === "home";
  const showTabBar = !["post"].includes(route.name);

  // Top-bar back behaviour:
  //  - browseSub 返回 browse
  //  - browse / board 返回 favorites
  //  - 其它返回 home
  const onBack = () => {
    if (route.name === "browseSub") navigate({ name: "browse" });
    else if (route.name === "browse") navigate({ name: "favorites" });
    else if (route.name === "board") navigate({ name: "favorites" });
    else if (route.name === "bot") navigate({ name: "home" });
    else navigate({ name: "home" });
  };

  const topBarRight = isHome ? (
    <button className="m-iconbtn" onClick={() => setSearchOpen(true)}><Icon name="search" size={18}/></button>
  ) : route.name === "notifs" ? (
    <button className="m-iconbtn"><Icon name="settings" size={18}/></button>
  ) : route.name === "profile" ? (
    <button className="m-iconbtn" onClick={() => setSearchOpen(true)}><Icon name="search" size={18}/></button>
  ) : route.name === "favorites" ? (
    <button className="m-iconbtn" onClick={ctx.goBrowse} title="浏览全部分区">
      <Icon name="folder" size={18}/>
    </button>
  ) : null;

  return (
    <div className="m-app">
      <TopBar
        brand={isHome}
        title={titles[route.name]}
        back={!["home", "notifs", "profile", "favorites"].includes(route.name)}
        onBack={onBack}
        right={topBarRight}
      />

      <div className="m-body" ref={bodyRef}>
        {route.name === "home" && <MHomePage ctx={ctx}/>}
        {route.name === "post" && <MPostDetail ctx={ctx} isFavorited={isFavoritePost} toggleFavoritePost={toggleFavoritePost}/>}
        {route.name === "bot" && <MBotProfile ctx={ctx}/>}
        {route.name === "notifs" && <MNotifications ctx={ctx}/>}
        {route.name === "favorites" && <MFavoritesPage ctx={ctx} favBoardIds={favBoardIds} favPosts={favPosts} toggleFavoriteBoard={toggleFavoriteBoard} toggleFavoritePost={toggleFavoritePost}/>}
        {route.name === "browse" && <MBrowseSections ctx={ctx}/>}
        {route.name === "browseSub" && <MBrowseSubsAndBoards ctx={ctx} sectionId={route.sectionId} isFavorited={isFavoriteBoard} toggleFavoriteBoard={toggleFavoriteBoard}/>}
        {route.name === "board" && <MBoardPage ctx={ctx} board={route.board} isFavorited={isFavoriteBoard} toggleFavoriteBoard={toggleFavoriteBoard}/>}
        {route.name === "profile" && <MProfilePage ctx={ctx} themeToggle={() => setTheme(t => t === "dark" ? "light" : "dark")} currentTheme={theme}/>}
      </div>

      {/* Composer on post detail */}
      {route.name === "post" && (
        <div className="m-composer">
          <input placeholder="写下你的回复…"/>
          <button className="btn btn-primary"><Icon name="paperPlane" size={14}/> 回复</button>
        </div>
      )}

      {/* Tab bar */}
      {showTabBar && (
        <div className="m-tabbar">
          <button className={`m-tab ${route.name === "home" ? "active" : ""}`} onClick={() => {
            if (route.name === "home") {
              const el = bodyRef.current;
              if (!el) return;
              // Manual rAF-based smooth scroll — native smooth-scroll
              // misbehaves inside the CSS-scaled phone frame.
              const start = el.scrollTop;
              if (start <= 0) return;
              const t0 = performance.now();
              const dur = Math.min(500, 200 + start * 0.4);
              const tick = (now) => {
                const t = Math.min(1, (now - t0) / dur);
                const eased = 1 - Math.pow(1 - t, 3);
                el.scrollTop = start * (1 - eased);
                if (t < 1) requestAnimationFrame(tick);
              };
              requestAnimationFrame(tick);
            } else {
              navigate({ name: "home" });
            }
          }}>
            <Icon name="home" size={20}/><span>首页</span>
          </button>
          <button className={`m-tab ${["favorites","browse","browseSub","board"].includes(route.name) ? "active" : ""}`}
            onClick={() => navigate({ name: "favorites" })}>
            <Icon name="bookmark" size={20}/><span>收藏</span>
          </button>
          <button className={`m-tab ${route.name === "notifs" ? "active" : ""}`} onClick={() => navigate({ name: "notifs" })}>
            <Icon name="bell" size={20}/><span>通知</span>
            <span className="badge">3</span>
          </button>
          <button className={`m-tab ${route.name === "profile" ? "active" : ""}`} onClick={() => navigate({ name: "profile" })}>
            <Icon name="user" size={20}/><span>我</span>
          </button>
        </div>
      )}

      <MSearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} ctx={ctx}/>
    </div>
  );
}

window.MobileApp = MobileApp;
