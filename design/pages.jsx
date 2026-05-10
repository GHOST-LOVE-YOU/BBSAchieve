/* All page components */

const { useState: uS, useEffect: uE, useMemo: uM } = React;

// ============ HOME / FEED ============
const HomePage = ({ ctx }) => {
  const { feedTab, setFeedTab, sortBy, setSortBy, page, setPage, perPage, openSearch, goPost, goSection, loadState } = ctx;

  const allPosts = uM(() => {
    if (feedTab === "bot") return makePosts(48, { bot: true, offset: 0, idStart: 100 });
    if (feedTab === "real") return makePosts(20, { site: true, offset: 0, idStart: 200 });
    if (feedTab && feedTab.startsWith("sec:")) {
      const id = feedTab.slice(4);
      return makePosts(28, { offset: 9, idStart: 300 }).map(p => ({ ...p, sectionId: id, sectionName: window.SECTIONS.find(s => s.id===id)?.name || p.sectionName }));
    }
    if (feedTab === "search") return makePosts(14, { offset: 2, idStart: 400 });
    return makePosts(48, { offset: 0, idStart: 0 });
  }, [feedTab]);

  const sorted = uM(() => {
    const arr = [...allPosts];
    if (sortBy === "lastReply") arr.sort((a,b) => a.lastReplyMin - b.lastReplyMin);
    else arr.sort((a,b) => a.postedMin - b.postedMin);
    return arr;
  }, [allPosts, sortBy]);

  const slice = sorted.slice((page-1)*perPage, page*perPage);

  const heroForTab = () => {
    if (feedTab === "bot") return { eyebrow: "镜像信息流", title: "由今天的机器人替你巡视北邮人论坛", sub: "镜像内容均以机器人身份发帖、回帖；它们是这里的一等公民。", stat: { num: "1,284", lbl: "今日新镜像帖" }, tone: "var(--surface-sky)" };
    if (feedTab === "real") return { eyebrow: "真实用户信息流 · 站务", title: "管理员公告与用户反馈", sub: "本站唯一由真实用户发帖的分区，包含「管理员通知」与「用户反馈」两个子分区。", stat: { num: "20", lbl: "条真实帖子" }, tone: "var(--surface-sage)" };
    if (feedTab === "search") return { eyebrow: "搜索结果", title: `“${ctx.searchQuery || "（关键词）"}” 的相关帖子`, sub: "稍后将扩展到回复结果与用户结果。", stat: { num: sorted.length, lbl: "命中帖子" }, tone: "var(--surface-butter)" };
    if (feedTab && feedTab.startsWith("sec:")) {
      const sec = window.SECTIONS.find(s => s.id === feedTab.slice(4));
      return { eyebrow: "分区", title: sec?.name || "分区", sub: sec?.desc, stat: { num: sorted.length, lbl: "本分区帖子" }, tone: "var(--surface-mauve)" };
    }
    return { eyebrow: "首页", title: "今天有什么新故事？", sub: "顶部为镜像与真实的并行信息流，下方是分区导航。", stat: { num: "9.2k", lbl: "今日活跃" }, tone: "var(--surface-blush)" };
  };
  const hero = heroForTab();

  return (
    <div className="page">
      <div className="hero-band" style={{ background: hero.tone }}>
        <div className="hero-text">
          <div className="t-eyebrow muted">{hero.eyebrow}</div>
          <h2>{hero.title}</h2>
          <p>{hero.sub}</p>
        </div>
        <div className="hero-stat">
          <div className="num">{hero.stat.num}</div>
          <div className="lbl">{hero.stat.lbl}</div>
        </div>
      </div>

      <div className="toolbar">
        <div className="tabs" role="tablist">
          <button className={`tab ${feedTab === "bot" ? "active" : ""}`} onClick={() => { setFeedTab("bot"); setPage(1); }}>🤖 机器人信息流</button>
          <button className={`tab ${feedTab === "real" ? "active" : ""}`} onClick={() => { setFeedTab("real"); setPage(1); }}>👤 真实用户信息流</button>
        </div>
        <div className="spacer"/>
        <div className="tabs">
          <button className={`tab ${sortBy === "lastReply" ? "active" : ""}`} onClick={() => setSortBy("lastReply")}>最新回复</button>
          <button className={`tab ${sortBy === "posted" ? "active" : ""}`} onClick={() => setSortBy("posted")}>最新发布</button>
        </div>
      </div>

      {loadState === "loading" && <div className="card" style={{ padding: 8 }}><Loading rows={6}/></div>}
      {loadState === "error" && <ErrorState onRetry={() => ctx.setLoadState("ok")}/>}
      {loadState === "ok" && slice.length === 0 && <div className="card" style={{ padding: 0 }}><Empty title="暂无内容" sub="切换分区或稍后再来看看" icon="🌾"/></div>}
      {loadState === "ok" && slice.length > 0 && (
        <div className="post-list">
          {slice.map(p => <PostRow key={p.id} post={p} onClick={() => goPost(p)}/>)}
        </div>
      )}

      <Pagination page={page} total={sorted.length} perPage={perPage} onChange={setPage}/>

      {/* Forum index */}
      <div style={{ marginTop: 40 }}>
        <div className="page-eyebrow">所有分区</div>
        <h3 className="t-display-md" style={{ margin: "4px 0 16px" }}>分区与子分区</h3>
        <div className="forum-grid">
          {window.SECTIONS.map((s, i) => {
            const tones = ["var(--surface-blush)", "var(--surface-butter)", "var(--surface-sage)", "var(--surface-sky)", "var(--surface-peach)", "var(--surface-mauve)"];
            return (
              <div key={s.id} className="forum-card">
                <div className="head">
                  <div className="ico" style={{ background: tones[i % tones.length] }}>{s.icon}</div>
                  <div className="name">{s.name}<span className="sub">{s.desc}</span></div>
                </div>
                <div className="subs">
                  {s.subs.map(sub => (
                    <button key={sub.id} className="subchip" onClick={() => goSection(s.id, sub.id)}>{sub.name}</button>
                  ))}
                  <button className="subchip" onClick={() => goSection(s.id)}>查看全部 →</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============ POST DETAIL ============
const PostDetailPage = ({ ctx }) => {
  const post = ctx.activePost || makePosts(1, { bot: true, idStart: 1 })[0];
  const [page, setPage] = uS(1);
  const [subThread, setSubThread] = uS(false);
  const [subFloors, setSubFloors] = uS({});
  const totalReplies = 87;
  const perPage = 20;
  const replies = uM(() => Array.from({ length: 20 }).map((_, i) => {
    const isBot = post.isBot;
    return {
      id: `r${i}`,
      floor: (page-1)*perPage + i + 2,
      author: isBot ? pick(window.BOTS, i) : pick(window.AUTHORS, i+2),
      isBot,
      mins: 30 + i*8 + page*40,
      content: isBot
        ? ["（镜像）这位楼主提到的方案我之前在 17 楼也补充过类似的，有兴趣可以往上翻一下。原帖楼下还有一个引用了知乎相关讨论的链接。",
           "确实是这样，我去年也试过，主要的难点是导风的角度，稍微偏一点就没什么效果。",
           "mark 一下，蹲一个最终方案。",
           "楼主好棒呀，文章写得很清晰，期待续集。"][i % 4]
        : ["官方说明已同步，遇到问题请通过工单反馈，工单链接见置顶。",
           "感谢反馈，我们已经记下来了，本周会回复处理结果。",
           "+1，希望尽快推进，相关同学可以在这条下补充信息。",
           "已收到，转给对应的同学跟进。"][i % 4],
    };
  }), [page, post.isBot]);

  return (
    <div className="page">
      <button className="btn btn-ghost" onClick={ctx.goHome} style={{ marginBottom: 12, marginLeft: -10 }}>
        <Icon name="chevronLeft" size={16}/> 返回信息流
      </button>

      <div className="thread-head">
        {post.isBot && (
          <div className="thread-mirror-banner">
            🪞 <span>这是一条镜像帖。</span>
            <span className="src">来源：北邮人论坛 / 校园生活 / #1124871</span>
            <span style={{ marginLeft: "auto" }}>
              同步于 <strong>{rel(post.postedMin)}</strong>
              <a href="#" style={{ marginLeft: 12 }}>查看源帖 →</a>
            </span>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Pill tone="mauve">{post.subName ? `${post.sectionName} · ${post.subName}` : post.sectionName}</Pill>
        </div>
        <h1 className="thread-title">{post.title}</h1>
        <div className="thread-author-row">
          <Avatar author={post.author} size={48}/>
          <div>
            <div className="name">{post.author.name}</div>
            <div className="meta">{rel(post.postedMin)} · 浏览 {post.views} · {post.replies} 回复</div>
          </div>
        </div>
        <div className="thread-content">
          <p>{post.excerpt}</p>
          <p>下面是我整理的几点：</p>
          <p>1. 静音风扇 + 导风板，是目前最稳的方案，原理上利用宿舍内外温差。</p>
          <p>2. 改造时务必征得舍友同意，对噪声敏感的同学最好提前打招呼。</p>
          <p>3. 如果是预算有限，淘宝几十块的 USB 散热扇 + 厚纸板效果也能凑合。</p>
        </div>
        <div className="thread-actions">
          <button className="btn btn-primary"><Icon name="bell" size={14}/> 订阅该帖</button>
          <button className="btn btn-secondary"><Icon name="bookmark" size={14}/> 收藏</button>
          <button className="btn btn-ghost"><Icon name="reply" size={14}/> 引用回复</button>
          <div className="spacer"/>
          <span className="muted t-body-sm">订阅后，新回复会通过你绑定的机器人收件箱通知到你</span>
        </div>
      </div>

      {/* Replies */}
      <div className="card">
        <div style={{ padding: "16px 24px", display: "flex", alignItems: "center", borderBottom: "1px solid var(--hairline-soft)" }}>
          <strong>{totalReplies} 条回复</strong>
          <div className="spacer"/>
          <div className="tabs">
            <button className="tab active">楼层正序</button>
            <button className="tab">仅看楼主</button>
          </div>
        </div>
        {replies.map(r => (
          <div key={r.id} className="reply-floor">
            <Avatar author={r.author} size={44}/>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span className="author">{r.author.name}</span>
                <span className="muted t-body-sm">#{r.floor} · {rel(r.mins)}</span>
              </div>
              <div className="body">
                {r.content}
              </div>
              <div className="row-actions">
                <button className="btn btn-ghost btn-sm"
                  onClick={() => setSubFloors(s => ({ ...s, [r.id]: !s[r.id] }))}>
                  <Icon name="bell" size={13}/>
                  {subFloors[r.id] ? "已订阅此楼" : "订阅此楼"}
                </button>
                <button className="btn btn-ghost btn-sm"><Icon name="reply" size={13}/> 引用</button>
                <button className="btn btn-ghost btn-sm"><Icon name="flag" size={13}/> 认领</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Pagination page={page} total={totalReplies} perPage={perPage} onChange={setPage}/>
    </div>
  );
};

// ============ BOT PROFILE ============
const BotProfilePage = ({ ctx }) => {
  const bot = ctx.activeBot || window.BOTS[0];
  const [tab, setTab] = uS("posts");
  const [page, setPage] = uS(1);
  const [subPosts, setSubPosts] = uS({});
  const [subReplies, setSubReplies] = uS({});

  const recentPosts = uM(() => makePosts(14, { bot: true, offset: 1, idStart: 900 })
    .map(p => ({ ...p, author: bot })), [bot.id]);
  const recentReplies = uM(() => Array.from({ length: 18 }).map((_, i) => {
    const targets = makePosts(6, { offset: 2, idStart: 950 });
    const t = targets[i % targets.length];
    const snippets = [
      "（镜像）这位楼主提到的方案我之前在 17 楼也补充过类似的，原帖楼下还有一个引用了知乎相关讨论的链接。",
      "确实是这样，去年我也试过，主要的难点是导风的角度，稍微偏一点就没什么效果。",
      "mark 一下，蹲一个最终方案。",
      "楼主好棒呀，文章写得很清晰，期待续集。",
      "可以参考官方文档 4.2 节，里面有一张对比图。",
      "桌面端没那么明显，手机上才能看出差异。",
    ];
    return {
      id: `br${i}`,
      floor: 4 + i*2,
      target: t,
      mins: 8 + i*27,
      content: snippets[i % snippets.length],
    };
  }), [bot.id]);

  const list = tab === "posts" ? recentPosts : recentReplies;
  const perPage = 8;
  const slice = list.slice((page-1)*perPage, page*perPage);

  return (
    <div className="page">
      <button className="btn btn-ghost" onClick={ctx.goHome} style={{ marginBottom: 12, marginLeft: -10 }}>
        <Icon name="chevronLeft" size={16}/> 返回
      </button>

      <div className="bot-hero" style={{ background: "var(--surface-sky)" }}>
        <Avatar author={bot} size={96}/>
        <div>
          <div className="t-eyebrow muted">机器人主页</div>
          <h2>{bot.name} <span className="muted t-body-sm" style={{ fontWeight: 400 }}>@{bot.handle}</span></h2>
          <p className="bot-tagline">这是一个镜像机器人。它每隔 30 秒去北邮人论坛取一次新内容，转成发帖或回帖。你可以从下方的「最近发帖」和「最近回复」中挑选感兴趣的条目订阅。</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Pill tone="blue">🤖 镜像机器人</Pill>
            <Pill tone="turquoise">今日上线 8h12m</Pill>
            <Pill tone="green">已发帖 {recentPosts.length + 128} · 回帖 {recentReplies.length + 370}</Pill>
          </div>
        </div>
        <div></div>
      </div>

      {/* tip card replacing former bind card */}
      <div className="bind-card" style={{ paddingTop: 16, paddingBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="icon-circle" style={{ background: "var(--tag-blue-bg)", flex: "0 0 auto" }}>🔖</div>
          <div style={{ flex: 1 }}>
            <strong>订阅它的发帖或回复</strong>
            <div className="t-body-sm muted" style={{ marginTop: 2 }}>站点不再支持「绑定机器人整体」——避免多人共用同一 ID 时的通知冲突。请在下面的列表里按需订阅单条帖子或单层回复。</div>
          </div>
          <span className="muted t-body-sm">已订阅 {Object.values(subPosts).filter(Boolean).length + Object.values(subReplies).filter(Boolean).length} 项</span>
        </div>
      </div>

      {/* tabs */}
      <div className="toolbar" style={{ marginTop: 8 }}>
        <div className="tabs">
          <button className={`tab ${tab === "posts" ? "active" : ""}`} onClick={() => { setTab("posts"); setPage(1); }}>📝 最近发帖 <span className="muted">· {recentPosts.length}</span></button>
          <button className={`tab ${tab === "replies" ? "active" : ""}`} onClick={() => { setTab("replies"); setPage(1); }}>💬 最近回复 <span className="muted">· {recentReplies.length}</span></button>
        </div>
        <div className="spacer"/>
        <span className="muted t-body-sm">最新优先</span>
      </div>

      {/* list */}
      <div className="card">
        {tab === "posts" && slice.map(p => {
          const subbed = !!subPosts[p.id];
          return (
            <div key={p.id} style={{ padding: "14px 20px", borderBottom: "1px solid var(--hairline-soft)", display: "flex", alignItems: "flex-start", gap: 14 }}>
              <Pill tone="mauve">发帖</Pill>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="post-title" style={{ marginBottom: 4 }} onClick={() => ctx.goPost(p)}>
                  <span style={{ cursor: "pointer" }}>{p.title}</span>
                </div>
                <div className="post-meta">
                  <span>{p.sectionName}{p.subName ? ` · ${p.subName}` : ""}</span>
                  <span className="dot-sep">{rel(p.postedMin)}</span>
                  <span className="dot-sep">{p.replies} 回复</span>
                </div>
              </div>
              <button
                className={subbed ? "btn btn-secondary btn-sm" : "btn btn-primary btn-sm"}
                onClick={() => setSubPosts(s => ({ ...s, [p.id]: !s[p.id] }))}>
                <Icon name={subbed ? "check" : "bell"} size={13}/>
                {subbed ? "已订阅此帖" : "订阅此帖"}
              </button>
            </div>
          );
        })}
        {tab === "replies" && slice.map(r => {
          const subbed = !!subReplies[r.id];
          return (
            <div key={r.id} style={{ padding: "14px 20px", borderBottom: "1px solid var(--hairline-soft)", display: "flex", alignItems: "flex-start", gap: 14 }}>
              <Pill tone="blue">回复</Pill>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="t-body" style={{ marginBottom: 4 }}>"{r.content}"</div>
                <div className="post-meta">
                  <span>#{r.floor} 楼</span>
                  <span className="dot-sep" style={{ cursor: "pointer", color: "var(--ink)" }} onClick={() => ctx.goPost(r.target)}>《{r.target.title.replace(/^\[镜像\]\s*/, "")}》</span>
                  <span className="dot-sep">{rel(r.mins)}</span>
                </div>
              </div>
              <button
                className={subbed ? "btn btn-secondary btn-sm" : "btn btn-primary btn-sm"}
                onClick={() => setSubReplies(s => ({ ...s, [r.id]: !s[r.id] }))}>
                <Icon name={subbed ? "check" : "bell"} size={13}/>
                {subbed ? "已订阅此楼" : "订阅此楼"}
              </button>
            </div>
          );
        })}
      </div>
      <Pagination page={page} total={list.length} perPage={perPage} onChange={setPage}/>
    </div>
  );
};

// ============ NOTIFICATIONS ============
const NotificationsPage = ({ ctx }) => {
  const [filter, setFilter] = uS("all");
  const [items, setItems] = uS(window.NOTIFS);
  const filtered = items.filter(n => filter === "all" ? true : filter === "unread" ? n.unread : n.type === filter);
  const markAll = () => setItems(items.map(n => ({ ...n, unread: false })));
  const markOne = (id) => setItems(items.map(n => n.id === id ? { ...n, unread: false } : n));
  const unreadCount = items.filter(n => n.unread).length;

  return (
    <div className="page">
      <div className="page-eyebrow">通知中心</div>
      <h1 className="page-title">{unreadCount > 0 ? `${unreadCount} 条未读通知` : "已经全部看完啦"}</h1>
      <p className="page-sub">通知通过你今天绑定的机器人收件箱送达，匿名 · 不可逆向到真实身份。</p>

      <div className="toolbar">
        <div className="tabs">
          <button className={`tab ${filter==="all"?"active":""}`} onClick={() => setFilter("all")}>全部</button>
          <button className={`tab ${filter==="unread"?"active":""}`} onClick={() => setFilter("unread")}>未读</button>
          <button className={`tab ${filter==="reply"?"active":""}`} onClick={() => setFilter("reply")}>回复</button>
          <button className={`tab ${filter==="mention"?"active":""}`} onClick={() => setFilter("mention")}>@提及</button>
          <button className={`tab ${filter==="system"?"active":""}`} onClick={() => setFilter("system")}>系统</button>
        </div>
        <div className="spacer"/>
        <button className="btn btn-tertiary btn-sm" onClick={markAll}><Icon name="check" size={13}/> 全部标为已读</button>
      </div>

      {filtered.length === 0 ? (
        <div className="card"><Empty title="没有通知" sub="新内容会出现在这里" icon="🔔"/></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {filtered.map(n => (
            <div key={n.id} className={`notif-row ${n.unread ? "unread" : ""}`} onClick={() => markOne(n.id)}>
              <div className="unread-dot"/>
              <div className="icon-circle" style={{ background: n.color }}>{n.ico}</div>
              <div>
                <div className="body">{n.body}</div>
                <div className="meta"><span className="source">{n.source}</span></div>
              </div>
              <div className="time">{rel(n.time)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============ SECTION PAGE ============
const SectionPage = ({ ctx }) => {
  const sec = window.SECTIONS.find(s => s.id === ctx.activeSectionId) || window.SECTIONS[0];
  const [activeSub, setActiveSub] = uS(ctx.activeSubId || "all");
  const [page, setPage] = uS(1);
  const [sortBy, setSortBy] = uS("lastReply");
  const perPage = 15;

  const posts = uM(() => makePosts(activeSub === "all" ? 42 : 18, { offset: 3, idStart: 500 })
    .map(p => ({ ...p, sectionName: sec.name })), [sec.id, activeSub]);
  const sorted = uM(() => {
    const arr = [...posts];
    if (sortBy === "lastReply") arr.sort((a,b) => a.lastReplyMin - b.lastReplyMin);
    else arr.sort((a,b) => a.postedMin - b.postedMin);
    return arr;
  }, [posts, sortBy]);
  const slice = sorted.slice((page-1)*perPage, page*perPage);

  return (
    <div className="page">
      <button className="btn btn-ghost" onClick={ctx.goHome} style={{ marginBottom: 12, marginLeft: -10 }}>
        <Icon name="chevronLeft" size={16}/> 返回首页
      </button>

      <div className="hero-band" style={{ background: "var(--surface-peach)" }}>
        <div className="hero-text">
          <div className="t-eyebrow muted">分区</div>
          <h2>{sec.icon} {sec.name}</h2>
          <p>{sec.desc}。本分区包含 {sec.subs.length} 个子分区，下方是最新的镜像与真实帖子。</p>
        </div>
        <div className="hero-stat">
          <div className="num">{posts.length}</div>
          <div className="lbl">本页帖子</div>
        </div>
      </div>

      <div className="sub-tabs">
        <button className={`sub-tab ${activeSub==="all"?"active":""}`} onClick={() => { setActiveSub("all"); setPage(1); }}>全部</button>
        {sec.subs.map(s => (
          <button key={s.id} className={`sub-tab ${activeSub===s.id?"active":""}`} onClick={() => { setActiveSub(s.id); setPage(1); }}>{s.name}</button>
        ))}
      </div>

      <div className="toolbar">
        <div className="tabs">
          <button className={`tab ${sortBy==="lastReply"?"active":""}`} onClick={() => setSortBy("lastReply")}>最新回复</button>
          <button className={`tab ${sortBy==="posted"?"active":""}`} onClick={() => setSortBy("posted")}>最新发布</button>
        </div>
      </div>

      <div className="post-list">
        {slice.map(p => <PostRow key={p.id} post={p} onClick={() => ctx.goPost(p)}/>)}
      </div>
      <Pagination page={page} total={sorted.length} perPage={perPage} onChange={setPage}/>
    </div>
  );
};

// ============ PROFILE ============
const ProfilePage = ({ ctx }) => {
  const [pref, setPref] = uS({ replies: true, mentions: true, system: false, digest: true, weekend: false });
  const set = (k, v) => setPref(p => ({ ...p, [k]: v }));

  // notification channels
  const [channels, setChannels] = uS({
    telegram: { on: true,  target: "@xiaye_98",        verified: true  },
    email:    { on: true,  target: "x***@bupt.edu.cn", verified: true  },
    browser:  { on: false, target: "未授权",            verified: false },
  });
  const [primary, setPrimary] = uS("telegram");
  const [expanded, setExpanded] = uS(null);
  const [emailDraft, setEmailDraft] = uS("");
  const [emailSent, setEmailSent] = uS(false);
  const [browserPerm, setBrowserPerm] = uS("default"); // default | granted | denied
  const [testToast, setTestToast] = uS(null);
  // routing matrix: which event types go to which channel
  const [routing, setRouting] = uS({
    replies:  { telegram: true,  email: true,  browser: true  },
    mentions: { telegram: true,  email: false, browser: true  },
    system:   { telegram: false, email: true,  browser: false },
    digest:   { telegram: false, email: true,  browser: false },
  });
  const toggleRoute = (ev, ch) => setRouting(r => ({ ...r, [ev]: { ...r[ev], [ch]: !r[ev][ch] } }));
  const fireTest = (id) => {
    setTestToast(`已发送测试通知到 ${id === "telegram" ? "Telegram" : id === "email" ? "邮箱" : "浏览器"}`);
    setTimeout(() => setTestToast(null), 3000);
  };
  const requestBrowserPerm = () => {
    // simulate granted; in real app: Notification.requestPermission()
    setBrowserPerm("granted");
    setChannels(c => ({ ...c, browser: { on: true, target: "本设备 · Chrome on macOS", verified: true } }));
  };

  const channelMeta = [
    { id: "telegram", name: "Telegram", brand: "#229ED9", icon: "paperPlane",
      desc: "通过镜像机器人 @ByrAchieveBot 推送，支持点击直达原帖。" },
    { id: "email",    name: "邮箱",     brand: "#D97757", icon: "mail",
      desc: "聚合 5 分钟内的通知合并为一封邮件，避免打扰。" },
    { id: "browser",  name: "浏览器通知", brand: "#547358", icon: "monitor",
      desc: "仅在当前设备生效，关闭浏览器后失效。" },
  ];
  const eventLabels = {
    replies:  { lbl: "新回复", sub: "你订阅的帖子有新回复" },
    mentions: { lbl: "@ 提及", sub: "有人引用了你认领的回复" },
    system:   { lbl: "系统消息", sub: "镜像源失效、机器人切换" },
    digest:   { lbl: "每日早间汇总", sub: "每天 9:00 推送" },
  };

  const subs = [
    { id: "s1", title: "研究生宿舍空调改造方案讨论", floors: "全帖", time: 5 },
    { id: "s2", title: "保研 edge 复盘：一个普通 GPA 同学是怎么进所的", floors: "12 楼回复", time: 25 },
    { id: "s3", title: "字节抖音电商前端 二面挂经", floors: "全帖", time: 200 },
    { id: "s4", title: "校园网频繁掉线问题的官方说明", floors: "3 楼回复", time: 480 },
  ];

  const enabledCount = Object.values(channels).filter(c => c.on).length;
  const expandedMeta = expanded ? channelMeta.find(m => m.id === expanded) : null;

  const renderExpand = (id) => {
    const ch = channels[id];
    if (id === "telegram") return (
      <>
        <div className="t-eyebrow">绑定步骤</div>
        <ol className="channel-steps">
          <li>在 Telegram 内打开 <code>@ByrAchieveBot</code></li>
          <li>发送下面的一次性绑定码（10 分钟内有效）</li>
          <li>机器人会回复你一句确认，绑定即完成</li>
        </ol>
        <div className="channel-code">
          <span>/start</span>
          <span style={{ opacity: 0.65 }}>byr-7K3M-29QF-XJ8L</span>
          <button className="copy-btn">复制</button>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setPrimary("telegram")}>
            <Icon name="check" size={13}/> {primary === "telegram" ? "当前为主通道" : "设为主通道"}
          </button>
          <div className="spacer"/>
          <button className="btn btn-ghost btn-sm" style={{ color: "var(--error)" }}
            onClick={() => setChannels(c => ({ ...c, telegram: { on: false, target: "未连接", verified: false } }))}>
            <Icon name="trash" size={13}/> 解绑
          </button>
        </div>
      </>
    );
    if (id === "email") return (
      <>
        <div className="t-eyebrow">邮箱地址</div>
        <div className="bind-form">
          <input
            className="input"
            placeholder="you@bupt.edu.cn"
            value={emailDraft || (ch.target.includes("@") ? ch.target : "")}
            onChange={e => setEmailDraft(e.target.value)}
          />
          <button className="btn btn-primary btn-sm" onClick={() => { setEmailSent(true); setTimeout(() => setEmailSent(false), 4000); }}>
            发送验证邮件
          </button>
        </div>
        <div className="t-body-sm muted">建议使用学校邮箱（@bupt.edu.cn），可同时收到学校公告。</div>
        {emailSent && (
          <div className="toast-line">
            <Icon name="mail" size={14}/> 验证邮件已发送，请在 30 分钟内点击邮件内的链接完成绑定。
          </div>
        )}
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setPrimary("email")}>
            <Icon name="check" size={13}/> {primary === "email" ? "当前为主通道" : "设为主通道"}
          </button>
          <div className="spacer"/>
          <button className="btn btn-ghost btn-sm" style={{ color: "var(--error)" }}
            onClick={() => setChannels(c => ({ ...c, email: { on: false, target: "未连接", verified: false } }))}>
            <Icon name="trash" size={13}/> 解绑
          </button>
        </div>
      </>
    );
    return (
      <>
        <div className="t-eyebrow">浏览器原生通知</div>
        <ol className="channel-steps">
          <li>点击下方按钮，浏览器会弹出权限请求</li>
          <li>选择「允许」后即可在桌面右上角收到通知</li>
          <li>需要保持本站标签页存活；关闭后将自动停用</li>
        </ol>
        {browserPerm === "default" && !ch.on && (
          <button className="btn btn-primary btn-sm" onClick={requestBrowserPerm}>
            <Icon name="bell" size={13}/> 请求通知权限
          </button>
        )}
        {browserPerm === "granted" && (
          <div className="toast-line">
            <Icon name="check" size={14}/> 已获得通知权限 · 当前设备可接收
          </div>
        )}
        {ch.on && (
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setPrimary("browser")}>
              <Icon name="check" size={13}/> {primary === "browser" ? "当前为主通道" : "设为主通道"}
            </button>
            <div className="spacer"/>
            <button className="btn btn-ghost btn-sm" style={{ color: "var(--error)" }}
              onClick={() => { setChannels(c => ({ ...c, browser: { on: false, target: "未授权", verified: false } })); setBrowserPerm("default"); }}>
              <Icon name="x" size={13}/> 关闭
            </button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="page">
      {/* Hero */}
      <div className="profile-hero">
        <div className="avatar" style={{ width: 64, height: 64, fontSize: 26, background: "#446aa7", color: "#fff" }}>夏</div>
        <div className="hero-main">
          <div className="t-eyebrow muted">个人中心</div>
          <h1 className="hero-name">你好，夏夜</h1>
          <div className="hero-summary">
            <span><Icon name="check" size={13}/> 已登录 · 跨设备同步</span>
            <span className="dot"/>
            <span>{enabledCount} / 3 通知通道已启用</span>
            <span className="dot"/>
            <span>{subs.length} 项订阅</span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => ctx.openSearchUsers()}>
          <Icon name="search" size={14}/> 搜索机器人 · 添加订阅
        </button>
      </div>

      {testToast && (
        <div className="toast-line" style={{ marginBottom: 12 }}>
          <Icon name="check" size={14}/> {testToast}
        </div>
      )}

      {/* Section: channels */}
      <div className="section-header">
        <div>
          <div className="t-eyebrow muted">通知通道</div>
          <h3 className="section-title">在哪里收到新动态？</h3>
        </div>
        <span className="muted t-body-sm">同时启用多个通道；点击卡片可管理</span>
      </div>

      <div className="channel-grid">
        {channelMeta.map(meta => {
          const ch = channels[meta.id];
          const isPrim = primary === meta.id && ch.on;
          const isExp = expanded === meta.id;
          return (
            <button
              key={meta.id}
              className={`channel-card ${ch.on ? "on" : "off"} ${isPrim ? "primary" : ""} ${isExp ? "selected" : ""}`}
              onClick={() => setExpanded(isExp ? null : meta.id)}
            >
              <div className="channel-card-top">
                <div className="channel-ico" style={{ background: meta.brand, color: "#fff" }}>
                  <Icon name={meta.icon} size={18}/>
                </div>
                {ch.on
                  ? (ch.verified ? <Pill tone="green">已启用</Pill> : <Pill tone="yellow">待验证</Pill>)
                  : <Pill tone="red">未启用</Pill>}
              </div>
              <div className="channel-card-body">
                <div className="channel-card-row">
                  <strong>{meta.name}</strong>
                  {isPrim && <Pill tone="blue">主</Pill>}
                </div>
                <div className="t-body-sm muted">{meta.desc}</div>
                <div className="channel-target">
                  <Icon name={ch.on ? "check" : "x"} size={11}/>
                  {ch.target}
                </div>
              </div>
              <div className="channel-card-foot">
                {ch.on && ch.verified && (
                  <span className="card-action" onClick={(e) => { e.stopPropagation(); fireTest(meta.id); }}>
                    <Icon name="bell" size={12}/> 测试
                  </span>
                )}
                <span className="card-action primary">
                  {isExp ? "收起 ↑" : (ch.on ? "管理 →" : "连接 →")}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {expandedMeta && (
        <div className="channel-drawer">
          <div className="drawer-head">
            <div className="channel-ico" style={{ background: expandedMeta.brand, color: "#fff" }}>
              <Icon name={expandedMeta.icon} size={16}/>
            </div>
            <strong>{expandedMeta.name} · 设置</strong>
            <div className="spacer"/>
            <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(null)}>
              <Icon name="x" size={13}/> 关闭
            </button>
          </div>
          <div className="drawer-body">
            {renderExpand(expandedMeta.id)}
          </div>
        </div>
      )}

      {/* Section: routing */}
      <div className="section-header" style={{ marginTop: 28 }}>
        <div>
          <div className="t-eyebrow muted">事件路由</div>
          <h3 className="section-title">每类事件发到哪里？</h3>
        </div>
        <span className="muted t-body-sm">未勾选时仅出现在站内通知中心</span>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="routing-table">
          <div className="rt-head rt-evt">事件</div>
          {channelMeta.map(meta => (
            <div key={meta.id} className="rt-head rt-channel">
              <div className="channel-ico" style={{ background: meta.brand, color: "#fff", width: 26, height: 26, borderRadius: 8 }}>
                <Icon name={meta.icon} size={12}/>
              </div>
              {meta.name}
            </div>
          ))}
          {Object.entries(eventLabels).map(([ev, info], i) => (
            <React.Fragment key={ev}>
              <div className={`rt-evt rt-row ${i === 0 ? "first" : ""}`}>
                <div>{info.lbl}</div>
                <div className="t-body-sm muted">{info.sub}</div>
              </div>
              {channelMeta.map(meta => (
                <div className={`rt-cell rt-row ${i === 0 ? "first" : ""}`} key={meta.id}>
                  <div
                    className={`switch ${routing[ev][meta.id] && channels[meta.id].on ? "on" : ""} ${!channels[meta.id].on ? "disabled" : ""}`}
                    onClick={() => channels[meta.id].on && toggleRoute(ev, meta.id)}
                    role="switch"
                    aria-checked={routing[ev][meta.id] && channels[meta.id].on}
                  />
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Section: preferences + subscriptions in 2 col */}
      <div className="profile-grid" style={{ marginTop: 28 }}>
        <div className="profile-card">
          <div className="t-eyebrow muted">通知偏好</div>
          <div style={{ marginTop: 8 }}>
            <Switch label="新回复通知" sublabel="你订阅的帖子有新回复时" on={pref.replies} onChange={v => set("replies", v)}/>
            <Switch label="@ 提及与认领" sublabel="有人引用了你认领的回复" on={pref.mentions} onChange={v => set("mentions", v)}/>
            <Switch label="系统消息" sublabel="镜像源失效、机器人切换等" on={pref.system} onChange={v => set("system", v)}/>
            <Switch label="每日早间汇总" sublabel="每天 9:00 推送一次" on={pref.digest} onChange={v => set("digest", v)}/>
            <Switch label="周末免打扰" sublabel="仅推送高优先通知" on={pref.weekend} onChange={v => set("weekend", v)}/>
          </div>
        </div>

        <div className="profile-card">
          <div style={{ display: "flex", alignItems: "center" }}>
            <div className="t-eyebrow muted">订阅管理</div>
            <div className="spacer"/>
            <span className="muted t-body-sm">共 {subs.length} 项</span>
          </div>
          <div style={{ marginTop: 10 }}>
            {subs.map(s => (
              <div key={s.id} className="toggle-row">
                <div className="lbl">{s.title}<small>{s.floors} · 最近更新 {rel(s.time)}</small></div>
                <button className="btn btn-ghost btn-sm">取消订阅</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { HomePage, PostDetailPage, BotProfilePage, NotificationsPage, SectionPage, ProfilePage });
