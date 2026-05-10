/* BYR Achieve — mock data */

/* 三级结构：分区 (section) > 子分区 (sub) > 板块 (board)
   板块是发帖的最小单元；用户在「收藏」中收藏的也是板块。 */
window.SECTIONS = [
  { id: "tech", icon: "💻", name: "技术", desc: "代码、工程、开源与计算机", subs: [
    { id: "tech-soft", name: "软件开发", boards: [
      { id: "b-fe",     name: "前端",       desc: "Web、React、CSS、可视化", posts: 1284 },
      { id: "b-be",     name: "后端",       desc: "服务端、数据库、分布式", posts: 982 },
      { id: "b-ai",     name: "人工智能",   desc: "深度学习、LLM、CV、NLP", posts: 2103 },
      { id: "b-mobile", name: "移动开发",   desc: "iOS、Android、跨端", posts: 412 },
    ]},
    { id: "tech-sys",  name: "系统与底层", boards: [
      { id: "b-os",      name: "操作系统",   desc: "Linux、内核、虚拟化", posts: 261 },
      { id: "b-network", name: "网络",       desc: "TCP/IP、网络安全", posts: 188 },
      { id: "b-hw",      name: "硬件",       desc: "DIY、嵌入式、单片机", posts: 96 },
    ]},
    { id: "tech-tool", name: "工具与开源", boards: [
      { id: "b-tool",    name: "效率工具",   desc: "编辑器、命令行、终端", posts: 304 },
      { id: "b-os-soft", name: "开源软件",   desc: "GitHub 上的好东西", posts: 220 },
    ]},
  ]},
  { id: "campus", icon: "🏫", name: "校园生活", desc: "日常、食堂、宿舍、社团", subs: [
    { id: "campus-life", name: "衣食住行", boards: [
      { id: "b-canteen", name: "食堂",     desc: "测评、推荐、吐槽", posts: 1420 },
      { id: "b-dorm",    name: "宿舍",     desc: "改造、问题、室友", posts: 743 },
      { id: "b-shop",    name: "周边店铺", desc: "西土城、学院路", posts: 612 },
      { id: "b-traffic", name: "交通通勤", desc: "校车、公交、骑行", posts: 188 },
    ]},
    { id: "campus-culture", name: "校园文化", boards: [
      { id: "b-club",    name: "社团",     desc: "招新、活动", posts: 290 },
      { id: "b-event",   name: "校园活动", desc: "讲座、晚会", posts: 173 },
      { id: "b-sport",   name: "体育运动", desc: "球类、健身、跑步", posts: 244 },
    ]},
  ]},
  { id: "study", icon: "📚", name: "学业", desc: "课程、考研、留学、保研", subs: [
    { id: "study-undergrad", name: "本科", boards: [
      { id: "b-course",  name: "课程交流",   desc: "选课、作业、考试", posts: 1820 },
      { id: "b-research", name: "本研",     desc: "进组、SRTP", posts: 240 },
    ]},
    { id: "study-postgrad", name: "深造", boards: [
      { id: "b-grad",    name: "考研保研", desc: "复试、夏令营", posts: 1102 },
      { id: "b-abroad",  name: "留学申请", desc: "选校、文书、签证", posts: 681 },
      { id: "b-phd",     name: "博士生活", desc: "科研、发文", posts: 158 },
    ]},
  ]},
  { id: "career", icon: "💼", name: "求职", desc: "实习、校招、面经", subs: [
    { id: "career-job", name: "求职渠道", boards: [
      { id: "b-intern",   name: "实习",       desc: "日常、转正、推荐", posts: 1310 },
      { id: "b-fulltime", name: "校招",       desc: "网申、笔试、Offer 比较", posts: 980 },
    ]},
    { id: "career-share", name: "经验分享", boards: [
      { id: "b-mianjing", name: "面经分享",   desc: "技术面、HR 面", posts: 1577 },
      { id: "b-salary",   name: "薪酬待遇",   desc: "Offer 比较、调薪", posts: 290 },
    ]},
  ]},
  { id: "trade", icon: "🛍️", name: "二手市场", desc: "数码、书籍、生活用品", subs: [
    { id: "trade-all", name: "出/收", boards: [
      { id: "b-digital", name: "数码电子", desc: "手机、平板、电脑", posts: 460 },
      { id: "b-book",    name: "书籍教材", desc: "考研、专业课", posts: 273 },
      { id: "b-life",    name: "生活用品", desc: "家具、衣物、零食", posts: 152 },
    ]},
  ]},
  { id: "talk", icon: "💬", name: "灌水闲聊", desc: "自由话题、吐槽、表白墙", subs: [
    { id: "talk-all", name: "闲聊", boards: [
      { id: "b-free",    name: "自由话题",   desc: "想到什么说什么", posts: 4120 },
      { id: "b-confess", name: "表白墙",     desc: "匿名告白、寻人", posts: 920 },
      { id: "b-mood",    name: "深夜情绪",   desc: "树洞、emo", posts: 510 },
    ]},
  ]},
  { id: "site", icon: "📮", name: "站务", desc: "BYR Achieve 自身的公告与反馈", realOnly: true, subs: [
    { id: "site-all", name: "站务", boards: [
      { id: "b-notice",   name: "管理员通知", desc: "公告、维护、规则", posts: 32, realOnly: true },
      { id: "b-feedback", name: "用户反馈",   desc: "建议、Bug、想法", posts: 88, realOnly: true },
    ]},
  ]},
];

/* 提取所有板块的扁平索引 */
window.ALL_BOARDS = (() => {
  const out = [];
  for (const sec of window.SECTIONS) {
    for (const sub of sec.subs) {
      for (const b of sub.boards) {
        out.push({ ...b, sectionId: sec.id, sectionName: sec.name, sectionIcon: sec.icon, subId: sub.id, subName: sub.name });
      }
    }
  }
  return out;
})();
window.findBoard = (id) => window.ALL_BOARDS.find(b => b.id === id);

const _AUTHORS = [
  { id: "u1", name: "电子荒野旅人", color: "#446aa7" },
  { id: "u2", name: "夜半敲代码", color: "#547358" },
  { id: "u3", name: "学院南路CV", color: "#7f6c1f" },
  { id: "u4", name: "西土城梦游者", color: "#b1729b" },
  { id: "u5", name: "Sophie", color: "#437184" },
  { id: "u6", name: "三号楼老张", color: "#bf6969" },
  { id: "u7", name: "Anonymous_E7F2", color: "#5e646e" },
  { id: "u8", name: "保研edge", color: "#446aa7" },
];

const _BOTS = [
  { id: "b1", name: "镜花", handle: "mirror-flower", color: "var(--tag-blue-bg)" },
  { id: "b2", name: "拾遗", handle: "shi-yi", color: "var(--tag-mauve-bg)" },
  { id: "b3", name: "回响", handle: "echo-9", color: "var(--tag-turquoise-bg)" },
  { id: "b4", name: "竹简", handle: "bamboo-slip", color: "var(--tag-sage-bg)" },
];

window.AUTHORS = _AUTHORS;
window.BOTS = _BOTS;

function pick(arr, i) { return arr[i % arr.length]; }
function rel(min) {
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  if (min < 60*24) return `${Math.floor(min/60)} 小时前`;
  if (min < 60*24*7) return `${Math.floor(min/(60*24))} 天前`;
  return `${Math.floor(min/(60*24*7))} 周前`;
}
window.rel = rel;
window.pick = pick;

const titles = [
  "[镜像] 北邮人论坛 2025-05-06 热门：研究生宿舍空调改造方案讨论",
  "求问：信通院的同学，DSP 这门课老师讲得怎么样？",
  "西土城路又开了一家螺蛳粉，已经排到楼下了",
  "保研 edge 复盘：一个普通 GPA 同学是怎么进所的",
  "（吐槽）东区食堂二楼的麻辣香锅是不是换厨师了",
  "实习面经｜字节抖音电商前端 二面挂经",
  "出闲置：iPad Air 5 64G 银色 配妙控键盘",
  "明天下雨，需不需要把昨天晾的被子收一下？（认真）",
  "突然想到：图书馆 5 楼那个总坐窗边的男生，最近没看到了",
  "[镜像] 关于校园网频繁掉线问题的官方说明",
  "考研专业课答疑：信号与系统第三章典型例题",
  "毕业季｜把这四年想说的话，留在这里",
  "中关村南大街 vs 学院南路，哪边外卖更靠谱？",
  "搬砖人的一天：早高峰 4 号线挤到怀疑人生",
  "求一位愿意带练 Leetcode 的搭子，每天一题",
  "深夜投稿｜想念北邮的草坪，和那只校猫",
  "Java 八股复习路线整理（持续更新）",
  "学校体测又开始了，1000 米及格线还是 4'30吗",
  "[镜像] 校友会通知：5月20日返校日活动报名",
  "TypeScript 5.5 的新特性整理，我最常用的是这两个",
  "Next.js 15 升级踩坑：缓存默认行为变了",
  "做了一个小工具：把 Figma 设计稿一键导出为 React 组件",
  "Vim/Neovim 用户都用什么 LSP 配置？",
];

const excerpts = [
  "看了一下隔壁宿舍的改造方案，他们用了一个静音风扇加挡板的组合，效果还挺好。我自己研究了一下大概原理：把热风导向走廊，冷风留在宿舍内部，整体下来温差能有 4-5 度。如果对动手能力有信心的同学可以试试……",
  "选课系统刚关，慌慌张张选了，但是听学长说这门挺难，想问问大家具体的考核形式，期末是大作业还是闭卷？",
  "今天中午去吃了一下，老板说他们家螺蛳粉是从柳州空运的料包，汤底是自己熬的。我个人觉得味道很正宗，价格 18 一碗加蛋。",
  "本人 GPA 3.4 普普通通，专业排名也不靠前，但是因为科研经历比较硬，最后还是上了岸。这里把整个 timeline 和一些关键节点写一下，给同样焦虑的学弟学妹一个参考。",
  "今天中午去吃，明显感觉锅底辣味变了，肉量也少了。我问了一下打饭阿姨，阿姨说最近确实换师傅了。",
  "提前批面试结束，这里还是把面试问题记录一下。一面没什么问题，主要是项目深挖。二面进来一个看起来很严肃的小哥，开场就是手撕，连寒暄都没有……",
  "9 成新自用，无磕碰，配件齐全送原装妙控键盘。学校自取或者顺丰到付，价格可以小刀。",
  "看天气预报说明天下雨，但是我又不太确定。看了一下窗外好像是阴的，但风也不算大……宿舍小伙伴们，要不要一起冲下楼把被子收回来？",
  "不知道为什么，已经习惯了周三下午去 5 楼自习的时候，看到他坐在那里。最近两周没看到了，有点空落落的，不知道是不是去找工作了。",
  "网络中心刚刚发的公告：因核心交换机升级，5 月 8 日 23:00-次日 03:00 校园网会有间歇性中断，请同学们提前做好准备。",
  "信号与系统这门课，第三章是难点之一。这里整理了几道典型例题以及它们的解题思路，希望对正在复习的同学有帮助。",
  "四年下来，从大一刚入学到现在，回头看好像很多事情都还历历在目。把那些来不及说的、不好意思说的，留在这里吧。",
  "经常点外卖的同学应该都有体会，不同片区的外卖速度差别还挺大。最近做了一个简单的对比，想听听大家的实际感受。",
  "上学期开始一直在中关村实习，每天通勤 2.5 小时，地铁挤到完全没法看东西。今天差点迟到了，记一下我现在的早高峰流程。",
  "本人在职刷题中，希望找一个进度差不多的搭子，每天一题，互相讲思路那种。语言不限，最好是要校招的同学。",
  "凌晨三点，写完 paper 推开窗，想起大一的时候在草坪上躺着看星星。还有那只总在三号楼门口蹲着的橘猫……",
  "整理了一下最近常见的 Java 八股，按主题分类，每个题后面附上我自己的理解和坑点。会持续更新，求大家帮忙补充。",
  "刚看到通知 5月20号开始体测，上一次跑 1000 米的时候差点报销膝盖。问问今年标准还跟之前一样吗？",
  "5 月 20 日校友返校日，欢迎各届校友报名参加。当天会有学院开放日、师生交流、以及晚上的篝火晚会。",
  "5.5 出来一周了，简单试用之后我个人觉得最好用的是「Inferred Type Predicates」和「Regular Expression Syntax Checking」。",
  "升级到 15.0 之后，原本的 GET 接口缓存失效，主要是默认 dynamic 改成了 force-dynamic 的逻辑，需要手动加 export const dynamic 才行。",
  "因为最近做的几个项目都需要从 Figma 同步到代码，写了一个小工具自动生成组件结构，已经在内部用了两个月效果不错。",
  "之前一直用 coc.nvim，最近换到了原生 LSP + nvim-cmp，体验好很多。想问问大家的配置。",
];

const _SITE_TITLES = [
  "【管理员】关于近期镜像同步延迟的说明",
  "【公告】5 月 10 日 23:00 站点维护通知",
  "【反馈】希望支持回复内的图片放大查看",
  "【反馈】通知中心的「@提及」筛选无法保存",
  "【公告】今日机器人已轮换为 @镜花，绑定方式见主页",
  "【反馈】深色模式下分区图标对比度偏低",
  "【管理员】关于「认领镜像内容」功能的灰度计划",
  "【反馈】手机端帖子列表标题被截断",
  "【公告】新增「站务」分区，用于公告与反馈",
  "【反馈】搜索框希望支持回车直接打开第一条结果",
];
const _SITE_EXCERPTS = [
  "今天上午 9-11 点期间镜像源到我们这边的同步出现了一段时间的延迟，已经恢复，造成的影响已修复，原因和后续处理见正文。",
  "为了升级核心服务，5 月 10 日（周六）23:00–次日 02:00 站点会进入只读维护模式，期间仍可浏览，但暂不接受任何回复或绑定操作。",
  "现在点开图片只能跳到原始链接，希望能直接在站内放大查看，最好支持左右滑动浏览同帖子内的其他图。",
  "在通知中心选了「@提及」筛选，刷新页面之后又回到「全部」了，希望能记住上次的选择。",
  "今天的机器人已经轮换为 @镜花。如果你昨天绑定的是 @拾遗，请重新绑定，否则今天的通知不会送达。",
  "在深色模式下，分区卡片的图标和背景色对比度有点低，特别是 🛍️ 和 💬 几乎看不清。",
  "「认领镜像内容」会先在小范围灰度，我们想听听大家对认领规则、防滥用的看法，欢迎在本帖下回复。",
  "iPhone 上看帖子列表，长标题会被截断为一行，希望可以折成两行，或者长按预览全部。",
  "为了把公告/反馈和镜像内容区分开，新增了「站务」分区，所有内容都来自真实用户（管理员或反馈者），不再走机器人。",
  "现在搜索框输入关键词后还要点击列表，希望按回车能直接进入第一条结果对应的帖子。",
];

function makePosts(count, opts = {}) {
  const out = [];
  const useSite = opts.site === true;
  for (let i = 0; i < count; i++) {
    const isBot = useSite ? false : (opts.bot != null ? opts.bot : true);
    const author = isBot ? pick(_BOTS, i) : pick(_AUTHORS, i + 3);
    const lastReplier = pick(_AUTHORS, i + 7);
    const t = useSite ? pick(_SITE_TITLES, i + (opts.offset || 0)) : pick(titles, i + (opts.offset || 0));
    const ex = useSite ? pick(_SITE_EXCERPTS, i + (opts.offset || 0)) : pick(excerpts, i + (opts.offset || 0));
    const board = opts.board || (useSite
      ? window.ALL_BOARDS.find(b => b.id === (i % 2 === 0 ? "b-notice" : "b-feedback"))
      : pick(window.ALL_BOARDS.filter(b => !b.realOnly), i + (opts.offset || 0) * 3));
    out.push({
      id: `p${(opts.idStart || 0) + i}`,
      title: t,
      excerpt: ex,
      isBot,
      author,
      lastReplier,
      replies: 3 + ((i * 17) % 240),
      views: 80 + ((i * 91) % 5000),
      postedMin: 5 + i * 13 + (opts.offset || 0) * 7,
      lastReplyMin: 1 + i * 5 + (opts.offset || 0) * 3,
      sectionId: board.sectionId,
      sectionName: board.sectionName,
      subId: board.subId,
      subName: board.subName,
      boardId: board.id,
      boardName: board.name,
      pinned: i === 0 && (opts.pin || false),
      mirrored: isBot,
    });
  }
  // sort by latest reply by default
  out.sort((a, b) => a.lastReplyMin - b.lastReplyMin);
  return out;
}
window.makePosts = makePosts;

// Notifications
window.NOTIFS = [
  { id: "n1", type: "reply", unread: true, body: "有人回复了你订阅的帖子《保研 edge 复盘》", source: "@电子荒野旅人 在 12 楼回复", time: 8, ico: "💬", color: "var(--tag-blue-bg)" },
  { id: "n2", type: "mention", unread: true, body: "你的镜像账号 @镜花 收到了 3 条新通知", source: "通过收件箱：mirror-flower@today", time: 22, ico: "🤖", color: "var(--tag-mauve-bg)" },
  { id: "n3", type: "system", unread: true, body: "你订阅的《保研 edge 复盘》有 3 条新回复", source: "镜像同步于 1 小时前", time: 65, ico: "🔔", color: "var(--tag-yellow-bg)" },
  { id: "n4", type: "reply", unread: false, body: "有 2 条新回复出现在《研究生宿舍空调改造方案讨论》", source: "@夜半敲代码 等 2 人", time: 220, ico: "💬", color: "var(--tag-blue-bg)" },
  { id: "n6", type: "system", unread: false, body: "今天的临时收件箱将在 23:59 失效，请提前导出", source: "镜像收件箱：mirror-flower@today", time: 720, ico: "📭", color: "var(--tag-turquoise-bg)" },
  { id: "n7", type: "reply", unread: false, body: "@三号楼老张 在你订阅的帖子下回复了你的引用", source: "「西土城路又开了一家螺蛳粉」", time: 1300, ico: "💬", color: "var(--tag-blue-bg)" },
];

console.log("[BYR Achieve] data loaded", window.SECTIONS.length, "sections,", window.ALL_BOARDS.length, "boards");
