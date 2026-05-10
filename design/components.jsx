/* Reusable components */

const { useState, useEffect, useRef, useMemo } = React;

// === Icons (inline SVG, lightweight) ===
const Icon = ({ name, size = 18, stroke = 1.75 }) => {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round" };
  const paths = {
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
    bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,
    home: <><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/></>,
    bot: <><rect x="4" y="7" width="16" height="12" rx="3"/><path d="M12 4v3"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M8 17h8"/></>,
    users: <><circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6"/><circle cx="17" cy="9" r="2.5"/><path d="M22 19c0-2.5-2-4.5-5-4.5"/></>,
    folder: <><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></>,
    chevron: <><path d="m9 6 6 6-6 6"/></>,
    chevronDown: <><path d="m6 9 6 6 6-6"/></>,
    chevronLeft: <><path d="m15 6-6 6 6 6"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    moon: <><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21M5.6 5.6l1 1M17.4 17.4l1 1M5.6 18.4l1-1M17.4 6.6l1-1"/></>,
    bookmark: <><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
    plug: <><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M5 8h14v3a4 4 0 0 1-4 4h-6a4 4 0 0 1-4-4z"/></>,
    flag: <><path d="M4 22V4"/><path d="M4 4h12l-2 4 2 4H4"/></>,
    check: <><path d="m5 12 5 5L20 7"/></>,
    x: <><path d="M6 6l12 12M18 6 6 18"/></>,
    reply: <><path d="M9 17 4 12l5-5"/><path d="M4 12h11a5 5 0 0 1 5 5v3"/></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    refresh: <><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></>,
    book: <><path d="M4 4v15a2 2 0 0 0 2 2h13"/><path d="M19 4H6a2 2 0 0 0-2 2"/><path d="M9 8h7M9 12h7"/></>,
    sparkle: <><path d="M12 3v6M12 15v6M3 12h6M15 12h6"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    monitor: <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></>,
    smartphone: <><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/></>,
    paperPlane: <><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></>,
    trash: <><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></>,
  };
  return <svg {...props}>{paths[name] || null}</svg>;
};

// === Avatar ===
const Avatar = ({ author, size = 36 }) => {
  if (!author) return null;
  if (author.handle) {
    // bot
    return (
      <div className="avatar bot" style={{ width: size, height: size, fontSize: size*0.4 }}>
        <span style={{ position: "relative", zIndex: 1 }}></span>
      </div>
    );
  }
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size*0.36, background: author.color }}>
      {author.name.slice(0, 1)}
    </div>
  );
};

// === Pill ===
const Pill = ({ tone = "blue", children, style }) => (
  <span className={`pill pill-${tone}`} style={style}>{children}</span>
);

// === Pagination ===
const Pagination = ({ page, total, onChange, perPage = 20 }) => {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const pages = [];
  const add = (p) => pages.push(p);
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) add(i);
  } else {
    add(1);
    if (page > 3) add("…");
    for (let i = Math.max(2, page-1); i <= Math.min(totalPages-1, page+1); i++) add(i);
    if (page < totalPages-2) add("…");
    add(totalPages);
  }
  const start = (page-1)*perPage + 1;
  const end = Math.min(page*perPage, total);
  return (
    <div className="pagination">
      <div className="pagination-info">
        共 <strong style={{ color: "var(--ink)" }}>{total}</strong> 条 · 第 {start}–{end}
      </div>
      <div className="pagination-pages">
        <button className="page-btn" disabled={page === 1} onClick={() => onChange(page-1)} aria-label="上一页">‹</button>
        {pages.map((p, i) =>
          p === "…"
            ? <span key={i} className="page-ellipsis">…</span>
            : <button key={i} className={`page-btn ${p === page ? "active" : ""}`} onClick={() => onChange(p)}>{p}</button>
        )}
        <button className="page-btn" disabled={page === totalPages} onClick={() => onChange(page+1)} aria-label="下一页">›</button>
      </div>
    </div>
  );
};

// === Post Row ===
const PostRow = ({ post, onClick }) => {
  return (
    <div className="post-row" onClick={onClick}>
      <Avatar author={post.author} size={40} />
      <div style={{ minWidth: 0 }}>
        <div className="post-title">
          {post.pinned && <Pill tone="red">置顶</Pill>}
          <span>{post.title}</span>
        </div>
        <div className="post-excerpt">{post.excerpt}</div>
        <div className="post-meta" style={{ marginTop: 8 }}>
          <span className="author">{post.author.name}</span>
          <span className="dot-sep">{rel(post.postedMin)}</span>
          <span className="dot-sep">{post.subName ? `${post.sectionName} · ${post.subName}` : post.sectionName}</span>
          <span className="dot-sep last-reply-inline">最后回复 {rel(post.lastReplyMin)} · <span className="last-name">{post.lastReplier.name}</span></span>
        </div>
      </div>
      <div className="post-stats">
        <div className="replies"><Icon name="reply" size={14}/> {post.replies}</div>
      </div>
    </div>
  );
};

// === Sidebar nav ===
const NavItem = ({ icon, label, count, active, badge, onClick, expandable, expanded, onToggle }) => (
  <button className={`nav-item ${active ? "active" : ""} ${expanded ? "expanded" : ""}`} onClick={onClick}>
    {icon && <span className="icon"><Icon name={icon} size={16}/></span>}
    <span style={{ flex: 1 }}>{label}</span>
    {badge != null && <span className="badge">{badge}</span>}
    {count != null && badge == null && <span className="count">{count}</span>}
    {expandable && (
      <span className="nav-toggle" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
        <Icon name="chevron" size={14}/>
      </span>
    )}
  </button>
);

// === Switch ===
const Switch = ({ on, onChange, label, sublabel }) => (
  <div className="toggle-row">
    <div className="lbl">{label}{sublabel && <small>{sublabel}</small>}</div>
    <div className={`switch ${on ? "on" : ""}`} onClick={() => onChange(!on)} role="switch" aria-checked={on}/>
  </div>
);

// === Empty / Loading / Error ===
const Empty = ({ icon = "📭", title, sub }) => (
  <div className="empty-state">
    <div className="ico">{icon}</div>
    <div className="title">{title}</div>
    {sub && <div className="sub">{sub}</div>}
  </div>
);
const Loading = ({ rows = 5 }) => (
  <div style={{ padding: "8px 4px" }}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} style={{ display: "flex", gap: 12, padding: "16px 0" }}>
        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 50 }}/>
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ height: 14, width: "70%", marginBottom: 8 }}/>
          <div className="skeleton" style={{ height: 11, width: "40%" }}/>
        </div>
      </div>
    ))}
  </div>
);
const ErrorState = ({ title = "加载失败", sub = "请检查网络后重试", onRetry }) => (
  <div className="error-state">
    <span style={{ fontSize: 22 }}>⚠️</span>
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 500 }}>{title}</div>
      <div style={{ fontSize: 13, color: "var(--ink-secondary)" }}>{sub}</div>
    </div>
    {onRetry && <button className="btn btn-outline btn-sm" onClick={onRetry}><Icon name="refresh" size={14}/> 重试</button>}
  </div>
);

Object.assign(window, { Icon, Avatar, Pill, Pagination, PostRow, NavItem, Switch, Empty, Loading, ErrorState });
