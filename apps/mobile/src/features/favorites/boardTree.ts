export type BoardEntry = {
  slug: string;
  name: string;
  desc: string;
};

export type SubSection = {
  id: string;
  name: string;
  boards: BoardEntry[];
};

export type Section = {
  id: string;
  icon: string;
  name: string;
  desc: string;
  subs: SubSection[];
};

export const SECTIONS: Section[] = [
  {
    id: "tech",
    icon: "💻",
    name: "技术",
    desc: "代码、工程、开源与计算机",
    subs: [
      {
        id: "tech-soft",
        name: "软件开发",
        boards: [
          { slug: "Programming", name: "编程技术", desc: "编程语言与技术讨论" },
          { slug: "LinuxApp", name: "Linux应用", desc: "Linux系统与开源软件" },
          { slug: "Apple", name: "苹果", desc: "Apple产品与开发" },
          { slug: "MobileApp", name: "移动开发", desc: "iOS、Android、跨端" },
        ],
      },
      {
        id: "tech-sys",
        name: "系统与网络",
        boards: [
          { slug: "Networking", name: "网络技术", desc: "TCP/IP、网络管理" },
          { slug: "Hardware", name: "硬件", desc: "DIY、嵌入式" },
          { slug: "Security", name: "信息安全", desc: "网络安全、密码学" },
        ],
      },
      {
        id: "tech-ai",
        name: "人工智能",
        boards: [
          { slug: "AI", name: "人工智能", desc: "深度学习、LLM、CV、NLP" },
          { slug: "DataScience", name: "数据科学", desc: "数据分析与挖掘" },
        ],
      },
    ],
  },
  {
    id: "campus",
    icon: "🏫",
    name: "校园生活",
    desc: "日常、食堂、宿舍、社团",
    subs: [
      {
        id: "campus-life",
        name: "衣食住行",
        boards: [
          { slug: "Food", name: "美食", desc: "食堂、外卖、餐厅" },
          { slug: "Dorm", name: "宿舍", desc: "宿舍生活与改造" },
          { slug: "Cycling", name: "骑行", desc: "校内外骑行" },
        ],
      },
      {
        id: "campus-culture",
        name: "校园文化",
        boards: [
          { slug: "Activity", name: "校园活动", desc: "讲座、晚会、比赛" },
          { slug: "Sport", name: "体育运动", desc: "球类、健身、跑步" },
          { slug: "Music", name: "音乐", desc: "乐队、演出、分享" },
        ],
      },
    ],
  },
  {
    id: "study",
    icon: "📚",
    name: "学业",
    desc: "课程、考研、留学、保研",
    subs: [
      {
        id: "study-undergrad",
        name: "本科",
        boards: [
          { slug: "CourseInfo", name: "课程信息", desc: "选课、评教、资料" },
          { slug: "Science", name: "理学", desc: "数学、物理基础课" },
        ],
      },
      {
        id: "study-postgrad",
        name: "深造",
        boards: [
          { slug: "GraduateLife", name: "研究生", desc: "读研生活与科研" },
          { slug: "GoAbroad", name: "出国留学", desc: "选校、文书、签证" },
          { slug: "Exam", name: "考试", desc: "四六级、考研、GRE" },
        ],
      },
    ],
  },
  {
    id: "career",
    icon: "💼",
    name: "求职",
    desc: "实习、校招、面经",
    subs: [
      {
        id: "career-job",
        name: "求职渠道",
        boards: [
          { slug: "Job", name: "招聘信息", desc: "全职与实习招聘" },
          { slug: "Intern", name: "实习", desc: "实习机会与推荐" },
        ],
      },
      {
        id: "career-share",
        name: "经验分享",
        boards: [
          { slug: "Interview", name: "面经分享", desc: "技术面、HR面" },
          { slug: "CareerPlan", name: "职业规划", desc: "方向选择与建议" },
        ],
      },
    ],
  },
  {
    id: "trade",
    icon: "🛍️",
    name: "二手市场",
    desc: "数码、书籍、生活用品",
    subs: [
      {
        id: "trade-all",
        name: "出/收",
        boards: [
          { slug: "Fleamarket", name: "跳蚤市场", desc: "二手物品交易" },
          { slug: "Group", name: "团购", desc: "拼单与团购" },
        ],
      },
    ],
  },
  {
    id: "talk",
    icon: "💬",
    name: "灌水闲聊",
    desc: "自由话题、吐槽",
    subs: [
      {
        id: "talk-all",
        name: "闲聊",
        boards: [
          { slug: "Talk", name: "灌水乐园", desc: "自由话题" },
          { slug: "Feeling", name: "情感", desc: "情感、树洞" },
          { slug: "Joke", name: "笑话", desc: "轻松一刻" },
        ],
      },
    ],
  },
];

export function findSectionById(sectionId: string): Section | undefined {
  return SECTIONS.find((s) => s.id === sectionId);
}

export function findBoardBySlug(slug: string): {
  board: BoardEntry;
  section: Section;
  sub: SubSection;
} | null {
  for (const section of SECTIONS) {
    for (const sub of section.subs) {
      const board = sub.boards.find((b) => b.slug === slug);
      if (board) return { board, section, sub };
    }
  }
  return null;
}
