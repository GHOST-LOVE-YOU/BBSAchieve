/* App shell — top bar, sidebar, search overlay, router, tweaks */

const { useState: useS, useEffect: useE, useRef: useR } = React;

function App() {
  // ---- Tweaks ----
  const [tweaks, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{
    "theme": "light",
    "bandTone": "blush",
    "density": "comfy",
    "primary": "#1863dc"
  }/*EDITMODE-END*/);

  useE(() => {
    document.documentElement.setAttribute("data-theme", tweaks.theme);
    document.documentElement.style.setProperty("--primary", tweaks.primary);
  }, [tweaks.theme, tweaks.primary]);

  // ---- Router state ----
  const [route, setRoute] = useS({ name: "home" });
  const [feedTab, setFeedTab] = useS("bot");
  const [sortBy, setSortBy] = useS("lastReply");
  const [page, setPage] = useS(1);
  const [loadState, setLoadState] = useS("ok");
  const [searchOpen, setSearchOpen] = useS(false);
  const [searchQuery, setSearchQuery] = useS("");
  const [searchTab, setSearchTab] = useS("posts");
  const [expanded, setExpanded] = useS(() => Object.fromEntries(window.SECTIONS.map(s => [s.id, s.id === "tech" || s.id === "campus"])));

  const goHome = () => { setRoute({ name: "home" }); setFeedTab("bot"); setPage(1); };
  const goPost = (post) => setRoute({ name: "post", post });
  const goBot = (bot) => setRoute({ name: "bot", bot });
  const goSection = (sectionId, subId) => setRoute({ name: "section", sectionId, subId });
  const goNotifs = () => setRoute({ name: "notifs" });
  const goProfile = () => setRoute({ name: "profile" });

  const ctx = {
    feedTab, setFeedTab, sortBy, setSortBy, page, setPage, perPage: 15,
    loadState, setLoadState,
    openSearch: () => setSearchOpen(true),
    openSearchUsers: () => { setSearchTab("users"); setSearchOpen(true); },
    searchQuery,
    goHome, goPost, goBot, goSection,
    activePost: route.post, activeBot: route.bot, activeSectionId: route.sectionId, activeSubId: route.subId,
  };

  // keyboard: cmd-k
  useE(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submitSearch = () => {
    if (!searchQuery.trim()) return;
    setSearchOpen(false);
    setRoute({ name: "home" });
    setFeedTab("search");
    setPage(1);
  };

  return (
    <>
      {/* Topbar */}
      <div className="topbar">
        <div className="brand" onClick={goHome} style={{ cursor: "pointer" }}>
          <div className="brand-mark">B</div>
          <div className="brand-name">BYR <em>Achieve</em></div>
        </div>
        <div className="search-bar" onClick={() => setSearchOpen(true)}>
          <Icon name="search" size={16}/>
          <span>搜索帖子 / 回复 / 用户</span>
          <span className="kbd">⌘K</span>
        </div>
        <div className="topbar-actions">
          <button className="icon-btn" onClick={() => setTweak("theme", tweaks.theme === "dark" ? "light" : "dark")} title="切换深色">
            <Icon name={tweaks.theme === "dark" ? "sun" : "moon"} size={18}/>
          </button>
          <button className="icon-btn" onClick={goNotifs} title="通知">
            <Icon name="bell" size={18}/>
            <span className="dot"/>
          </button>
        </div>
      </div>

      <div className="app">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="nav-group">
            <NavItem icon="home" label="首页" active={route.name === "home" && feedTab !== "bot" && feedTab !== "real" && !feedTab.startsWith("sec:") && feedTab !== "search"} onClick={goHome}/>
            <NavItem icon="bell" label="通知中心" badge="3" active={route.name === "notifs"} onClick={goNotifs}/>
            <NavItem icon="user" label="个人中心" active={route.name === "profile"} onClick={goProfile}/>
          </div>

          <div className="nav-group">
            <div className="nav-group-title">信息流</div>
            <NavItem icon="bot" label="机器人信息流" count="48"
              active={route.name === "home" && feedTab === "bot"}
              onClick={() => { setRoute({ name: "home" }); setFeedTab("bot"); setPage(1); }}/>
            <NavItem icon="users" label="真实用户信息流" count="36"
              active={route.name === "home" && feedTab === "real"}
              onClick={() => { setRoute({ name: "home" }); setFeedTab("real"); setPage(1); }}/>
          </div>

          <div className="nav-group">
            <div className="nav-group-title">分区</div>
            {window.SECTIONS.map(sec => (
              <div key={sec.id}>
                <NavItem
                  icon="folder"
                  label={<span><span style={{ marginRight: 6 }}>{sec.icon}</span>{sec.name}</span>}
                  active={route.name === "section" && route.sectionId === sec.id && !route.subId}
                  onClick={() => goSection(sec.id)}
                  expandable
                  expanded={expanded[sec.id]}
                  onToggle={() => setExpanded(s => ({ ...s, [sec.id]: !s[sec.id] }))}
                />
                {expanded[sec.id] && (
                  <div className="nav-children">
                    {sec.subs.map(sub => (
                      <NavItem key={sub.id} label={sub.name}
                        active={route.name === "section" && route.subId === sub.id}
                        onClick={() => goSection(sec.id, sub.id)}/>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="nav-group">
            <div className="nav-group-title">快捷入口</div>
            <NavItem icon="bookmark" label="我的订阅"  count="4" onClick={goProfile}/>
            <NavItem icon="settings" label="偏好设置" onClick={goProfile}/>
          </div>
        </aside>

        {/* Main */}
        <main className="main">
          <div className="main-inner">
            {route.name === "home" && <HomePage ctx={ctx}/>}
            {route.name === "post" && <PostDetailPage ctx={ctx}/>}
            {route.name === "bot" && <BotProfilePage ctx={ctx}/>}
            {route.name === "notifs" && <NotificationsPage ctx={ctx}/>}
            {route.name === "section" && <SectionPage ctx={ctx}/>}
            {route.name === "profile" && <ProfilePage ctx={ctx}/>}
          </div>
        </main>
      </div>

      {/* Search overlay */}
      <div className={`overlay ${searchOpen ? "open" : ""}`} onClick={(e) => { if (e.target.classList.contains("overlay")) setSearchOpen(false); }}>
        <div className="search-modal">
          <div className="search-input-wrap">
            <Icon name="search" size={18}/>
            <input
              autoFocus={searchOpen}
              placeholder="搜索帖子 / 回复 / 用户"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitSearch(); }}
            />
            <button className="btn btn-ghost btn-sm" onClick={() => setSearchOpen(false)}>Esc</button>
          </div>
          <div className="search-modal-tabs">
            <button className={`search-modal-tab ${searchTab==="posts"?"active":""}`} onClick={() => setSearchTab("posts")}>帖子</button>
            <button className={`search-modal-tab ${searchTab==="replies"?"active":""}`} onClick={() => setSearchTab("replies")}>回复</button>
            <button className={`search-modal-tab ${searchTab==="users"?"active":""}`} onClick={() => setSearchTab("users")}>机器人 <span className="muted">· 仅机器人可搜</span></button>
          </div>
          <div className="search-results">
            {!searchQuery && (
              <div style={{ padding: "10px 18px" }}>
                <div className="t-eyebrow muted" style={{ marginBottom: 8 }}>最近搜索</div>
                {["保研 edge", "宿舍 空调", "字节 前端", "校园网"].map(t => (
                  <div key={t} className="search-result" onClick={() => { setSearchQuery(t); }}>
                    <Icon name="clock" size={16}/>
                    <div><div className="title">{t}</div></div>
                  </div>
                ))}
              </div>
            )}
            {searchQuery && searchTab === "posts" && (
              <>
                {makePosts(5, { offset: 1, idStart: 700 }).map(p => (
                  <div key={p.id} className="search-result" onClick={() => { setSearchOpen(false); goPost(p); }}>
                    <Icon name="book" size={16}/>
                    <div>
                      <div className="title">{p.title}</div>
                      <div className="meta">{p.author.name} · {p.replies} 回复 · {rel(p.lastReplyMin)}</div>
                    </div>
                  </div>
                ))}
                <div className="search-result" onClick={submitSearch} style={{ borderTop: "1px solid var(--hairline-soft)", marginTop: 6, paddingTop: 12 }}>
                  <Icon name="arrow" size={16}/>
                  <div><div className="title">查看全部 “{searchQuery}” 的搜索结果 →</div></div>
                </div>
              </>
            )}
            {searchQuery && searchTab === "replies" && (
              <>
                {makePosts(6, { offset: 4, idStart: 800 }).map((p, i) => {
                  const snippets = [
                    "这个方案我之前也试过，主要难点在于导风角度，稍微偏一点就没什么效果。",
                    "加一个质量较重的挡板会明显提升低频表现，不过要注意安装间隔。",
                    "桌面端没那么明显，手机上才能看出差异。",
                    "可以参考官方文档 4.2 节，里面有一张对比图。",
                    "同问，饱和之后还会有闪烁吗？",
                    "mark 一下，蔫一个最终方案。",
                  ];
                  return (
                    <div key={p.id} className="search-result" onClick={() => { setSearchOpen(false); goPost(p); }}>
                      <Icon name="reply" size={16}/>
                      <div>
                        <div className="title">“{snippets[i % snippets.length]}”</div>
                        <div className="meta">#{4 + i*3} 楼 · {p.author.name} · 《{p.title.replace(/^\[镜像\]\s*/, "")}》</div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
            {searchQuery && searchTab === "users" && (
              <>
                <div style={{ padding: "8px 18px 4px" }}>
                  <div className="t-eyebrow muted">站内仅机器人可被搜索 · 点击进入主页，可订阅其发帖与回复</div>
                </div>
                {window.BOTS.filter(b => b.name.includes(searchQuery) || b.handle.includes(searchQuery.toLowerCase()) || true).map(b => (
                  <div key={b.id} className="search-result" onClick={() => { setSearchOpen(false); goBot(b); }}>
                    <Avatar author={b} size={28}/>
                    <div>
                      <div className="title">{b.name} <span className="muted" style={{ fontWeight: 400 }}>@{b.handle}</span></div>
                      <div className="meta">镜像机器人 · 今日近 24h 内质量高</div>
                    </div>
                    <span className="muted t-body-sm" style={{ marginLeft: "auto" }}>进入主页 →</span>
                  </div>
                ))}
              </>
            )}
          </div>
          <div className="search-foot">
            <span>↵ 提交搜索</span>
            <span>↑↓ 导航</span>
            <span>Esc 关闭</span>
          </div>
        </div>
      </div>

      {/* Tweaks panel */}
      <TweaksPanel title="Tweaks">
        <TweakSection title="主题">
          <TweakRadio label="模式" value={tweaks.theme} onChange={(v) => setTweak("theme", v)}
            options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]}/>
          <TweakColor label="主色" value={tweaks.primary} onChange={(v) => setTweak("primary", v)}
            options={["#1863dc", "#2e77e5", "#7c4d9e", "#547358", "#bf6969"]}/>
        </TweakSection>
        <TweakSection title="首页 hero 色调">
          <TweakRadio label="band" value={tweaks.bandTone} onChange={(v) => setTweak("bandTone", v)}
            options={[
              { value: "blush", label: "Blush" },
              { value: "sage", label: "Sage" },
              { value: "butter", label: "Butter" },
            ]}/>
        </TweakSection>
        <TweakSection title="信息流密度">
          <TweakRadio label="密度" value={tweaks.density} onChange={(v) => setTweak("density", v)}
            options={[{ value: "comfy", label: "舒适" }, { value: "compact", label: "紧凑" }]}/>
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
