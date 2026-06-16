export type BoardCatalogSectionEntry = {
  boardName: string;
  boardSlug: string;
  title: string;
  description: string;
  fullSyncEnabled: boolean;
  fullSyncWindowMinutes: number;
  scheduledSyncEnabled: boolean;
  scheduledIntervalMinutes: number;
  scheduledWindowMinutes: number;
};

export type BoardCatalogSection = {
  sectionName: string;
  sectionSlug: string;
  boards: readonly BoardCatalogSectionEntry[];
};

export type BoardCatalogEntry = BoardCatalogSectionEntry & {
  sectionName: string;
  sectionSlug: string;
};

const DEFAULT_FULL_SYNC_WINDOW_MINUTES = 60 * 24 * 365 * 30;
const DEFAULT_SCHEDULED_INTERVAL_MINUTES = 60 * 24 * 30;
const DEFAULT_SCHEDULED_WINDOW_MINUTES = 60 * 24 * 31;

function createBoardEntry(input: {
  boardName: string;
  boardSlug: string;
  title: string;
  description?: string;
  scheduledSyncEnabled?: boolean;
  scheduledIntervalMinutes?: number;
  scheduledWindowMinutes?: number;
}): BoardCatalogSectionEntry {
  return {
    boardName: input.boardName,
    boardSlug: input.boardSlug,
    title: input.title,
    description:
      input.description ??
      `管理员可手动全量抓取 ${input.title}，并按配置定时同步最近内容。`,
    fullSyncEnabled: true,
    fullSyncWindowMinutes: DEFAULT_FULL_SYNC_WINDOW_MINUTES,
    scheduledSyncEnabled: input.scheduledSyncEnabled ?? false,
    scheduledIntervalMinutes:
      input.scheduledIntervalMinutes ?? DEFAULT_SCHEDULED_INTERVAL_MINUTES,
    scheduledWindowMinutes:
      input.scheduledWindowMinutes ?? DEFAULT_SCHEDULED_WINDOW_MINUTES,
  };
}

export const boardCatalogSections: readonly BoardCatalogSection[] = [
  {
    sectionName: '北邮校园',
    sectionSlug: 'section-1',
    boards: [
      createBoardEntry({ boardName: 'AcademicAffairs', boardSlug: 'academic-affairs', title: '北邮教务处', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'ACETeam', boardSlug: 'ace-team', title: 'ACE战队专区', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'AimBUPT', boardSlug: 'aim-bupt', title: '北邮欢迎你', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BUPT', boardSlug: 'bupt', title: '北邮生活', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BuptAssociation', boardSlug: 'bupt-association', title: '北邮社团', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'buptAUTA', boardSlug: 'bupt-auta', title: '阿里巴巴高校技术联盟', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BUPTMSTC', boardSlug: 'buptmstc', title: '微软技术俱乐部', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BUPTNet', boardSlug: 'bupt-net', title: '校园网', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BUPTNU', boardSlug: 'buptnu', title: '网络教育学院', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BUPTPost', boardSlug: 'bupt-post', title: '北邮邮局', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BUPTStudentUnion', boardSlug: 'bupt-student-union', title: '北京邮电大学学生会', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BUPTSTV', boardSlug: 'buptstv', title: '北邮学生电视台', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BuptWeekly', boardSlug: 'bupt-weekly', title: '北邮今周', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BYR_Bulletin', boardSlug: 'byr-bulletin', title: '北邮人公告栏', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'CampusCard', boardSlug: 'campus-card', title: '北邮校园卡', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'ChineseOrchestra', boardSlug: 'chinese-orchestra', title: '北邮民乐团', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'daonian', boardSlug: 'daonian', title: '悼念周先生', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'DMDA', boardSlug: 'dmda', title: '数字媒体与设计艺术学院', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Focus', boardSlug: 'focus', title: '北邮关注', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'GraduateSch', boardSlug: 'graduate-sch', title: '研究生院', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'GraduateUnion', boardSlug: 'graduate-union', title: '北京邮电大学研究生会', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Graduation', boardSlug: 'graduation', title: '毕业生之家', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'HongFu', boardSlug: 'hong-fu', title: '宏福校区', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Houqin', boardSlug: 'houqin', title: '北邮后勤处', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'INTR', boardSlug: 'intr', title: '网络技术研究院', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'IPOC', boardSlug: 'ipoc', title: '信息光子学与光通信研究院', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'IS', boardSlug: 'is', title: '国际学院', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'jiaowu_newSystem', boardSlug: 'jiaowu-new-system', title: '本科教务新系统', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'JiJianChu', boardSlug: 'ji-jian-chu', title: '北邮基建处', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Junxun', boardSlug: 'junxun', title: '军训快报', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Library', boardSlug: 'library', title: '北邮图书馆', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'MyBUPT', boardSlug: 'my-bupt', title: '北邮记忆', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'OracleClub', boardSlug: 'oracle-club', title: '甲骨文俱乐部', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Orchestra', boardSlug: 'orchestra', title: '北邮管弦乐团', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Philharmonic', boardSlug: 'philharmonic', title: '爱乐家园', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Recommend', boardSlug: 'recommend', title: '热点活动', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Redcross', boardSlug: 'redcross', title: '红十字会', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'SA', boardSlug: 'sa', title: '自动化学院', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'SCDA', boardSlug: 'scda', title: '北邮职业发展协会', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'SCS', boardSlug: 'scs', title: '计算机学院', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'SCSS', boardSlug: 'scss', title: '网络空间安全学院', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'SecurityDivision', boardSlug: 'security-division', title: '北邮保卫处', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'SEE', boardSlug: 'see', title: '电子工程学院', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Selfsupport', boardSlug: 'selfsupport', title: '助学之家', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'SEM', boardSlug: 'sem', title: '经济管理学院', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'SH', boardSlug: 'sh', title: '人文学院', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'ShaHe', boardSlug: 'sha-he', title: '沙河校区', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'SICA', boardSlug: 'sica', title: '学生国际交流协会', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'SICE', boardSlug: 'sice', title: '信息与通信工程学院', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'SIE', boardSlug: 'sie', title: '原信息工程学院', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'SL', boardSlug: 'sl', title: '语言学院', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'SPM', boardSlug: 'spm', title: '公共管理学院', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'SS', boardSlug: 'ss', title: '理学院', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'SSE', boardSlug: 'sse', title: '软件学院', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'STE', boardSlug: 'ste', title: '电信工程学院', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'StudentAffairs', boardSlug: 'student-affairs', title: '北邮学生处', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'StudentQuery', boardSlug: 'student-query', title: '邮问有答', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'WOWBuptGuild', boardSlug: 'wow-bupt-guild', title: 'BUPT魔兽公会', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
    ],
  },
  {
    sectionName: '信息社会',
    sectionSlug: 'section-2',
    boards: [
      createBoardEntry({ boardName: 'Ad_Agent', boardSlug: 'ad-agent', title: '商务广告及代理', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Advertising', boardSlug: 'advertising', title: '跳蚤市场', scheduledSyncEnabled: true, scheduledIntervalMinutes: 1440, scheduledWindowMinutes: 1560 }),
      createBoardEntry({ boardName: 'AimGraduate', boardSlug: 'aim-graduate', title: '考研专版', scheduledSyncEnabled: true, scheduledIntervalMinutes: 1440, scheduledWindowMinutes: 1560 }),
      createBoardEntry({ boardName: 'BNU', boardSlug: 'bnu', title: '学为人师，行为世范', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BookTrade', boardSlug: 'book-trade', title: '二手书交易', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BTadvice', boardSlug: 'b-tadvice', title: '北邮人BT意见与建议', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BTannounce', boardSlug: 'b-tannounce', title: 'BT公告区', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BTbt', boardSlug: 'b-tbt', title: 'BT讨论区', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BTcomic', boardSlug: 'b-tcomic', title: '动漫种子发布区', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BTcomplain', boardSlug: 'b-tcomplain', title: 'BT投诉区', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BTdocument', boardSlug: 'b-tdocument', title: '资料种子发布区', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BTgame', boardSlug: 'b-tgame', title: '游戏种子发布区', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BTmovie', boardSlug: 'b-tmovie', title: '电影种子发布区', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BTmusic', boardSlug: 'b-tmusic', title: '音乐种子发布区', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BTPending', boardSlug: 'bt-pending', title: '种子候选区', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BTreward', boardSlug: 'b-treward', title: 'BT悬赏区', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BTshow', boardSlug: 'b-tshow', title: '综艺种子发布区', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BTsoftware', boardSlug: 'b-tsoftware', title: '软件种子发布区', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BTsport', boardSlug: 'b-tsport', title: '体育种子发布区', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BTtv', boardSlug: 'b-ttv', title: '电视剧种子发布区', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BUPT_Internet_Club', boardSlug: 'bupt-internet-club', title: '北邮互联网俱乐部', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BUPTDiscount', boardSlug: 'bupt-discount', title: '北邮折扣', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BYRatSH', boardSlug: 'by-rat-sh', title: '北邮人在上海', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BYRatSZ', boardSlug: 'by-rat-sz', title: '深圳邮人家', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Certification', boardSlug: 'certification', title: '认证考试', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'CivilServant', boardSlug: 'civil-servant', title: '公务员', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Co_Buying', boardSlug: 'co-buying', title: '拼团', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'ComputerTrade', boardSlug: 'computer-trade', title: '电脑数码交易', scheduledSyncEnabled: true, scheduledIntervalMinutes: 1440, scheduledWindowMinutes: 1560 }),
      createBoardEntry({ boardName: 'Consulting', boardSlug: 'consulting', title: '管理咨询', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Entrepreneurship', boardSlug: 'entrepreneurship', title: '创业交流', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'FamilyLife', boardSlug: 'family-life', title: '家庭生活', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Financecareer', boardSlug: 'financecareer', title: '金融职场', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Financial', boardSlug: 'financial', title: '金融投资', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'GoAbroad', boardSlug: 'go-abroad', title: '飞跃重洋', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Home', boardSlug: 'home', title: '安居乐业', scheduledSyncEnabled: true, scheduledIntervalMinutes: 1440, scheduledWindowMinutes: 1560 }),
      createBoardEntry({ boardName: 'House', boardSlug: 'house', title: '房屋租赁', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'House_Agent', boardSlug: 'house-agent', title: '房屋中介', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'IT', boardSlug: 'it', title: '信息产业', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Job', boardSlug: 'job', title: '毕业生找工作', scheduledSyncEnabled: true, scheduledIntervalMinutes: 1440, scheduledWindowMinutes: 1560 }),
      createBoardEntry({ boardName: 'JobInfo', boardSlug: 'job-info', title: '招聘信息专版', description: '管理员手动全量抓取 JobInfo，并按固定间隔同步最近内容。', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Jump', boardSlug: 'jump', title: '跳槽就业', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'NetResources', boardSlug: 'net-resources', title: '网络资源', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Overseas', boardSlug: 'overseas', title: '海外北邮人', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'ParttimeJob', boardSlug: 'parttime-job', title: '兼职实习信息', scheduledSyncEnabled: true, scheduledIntervalMinutes: 1440, scheduledWindowMinutes: 1560 }),
      createBoardEntry({ boardName: 'pinche', boardSlug: 'pinche', title: '拼车', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'PMatBUPT', boardSlug: 'p-mat-bupt', title: '产品疯人院', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'StudyShare', boardSlug: 'study-share', title: '学习交流区', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Ticket', boardSlug: 'ticket', title: '票务', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Weather', boardSlug: 'weather', title: '天气预报', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'WorkLife', boardSlug: 'work-life', title: '职场人生', scheduledSyncEnabled: true, scheduledIntervalMinutes: 1440, scheduledWindowMinutes: 1560 }),
    ],
  },
  {
    sectionName: '生活时尚',
    sectionSlug: 'section-3',
    boards: [
      createBoardEntry({ boardName: 'Beauty', boardSlug: 'beauty', title: '美容护肤', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Blessing', boardSlug: 'blessing', title: '北邮愿望树', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Clothing', boardSlug: 'clothing', title: '衣衣不舍', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Constellations', boardSlug: 'constellations', title: '星雨星愿', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'DigiLife', boardSlug: 'digi-life', title: '数字生活', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'DIYLife', boardSlug: 'diy-life', title: '创意生活', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Environment', boardSlug: 'environment', title: '环境保护', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Feeling', boardSlug: 'feeling', title: '情感的天空', scheduledSyncEnabled: true, scheduledIntervalMinutes: 1440, scheduledWindowMinutes: 1560 }),
      createBoardEntry({ boardName: 'Food', boardSlug: 'food', title: '秀色可餐', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Friends', boardSlug: 'friends', title: '缘来如此', scheduledSyncEnabled: true, scheduledIntervalMinutes: 1440, scheduledWindowMinutes: 1560 }),
      createBoardEntry({ boardName: 'Health', boardSlug: 'health', title: '健康保健', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'IWhisper', boardSlug: 'iwhisper', title: '悄悄话', description: '悄悄话板块，支持全量和定时同步。', scheduledSyncEnabled: true, scheduledIntervalMinutes: 60, scheduledWindowMinutes: 90 }),
      createBoardEntry({ boardName: 'LostandFound', boardSlug: 'lostand-found', title: '失物招领与拾金不昧', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Talking', boardSlug: 'talking', title: '谈天说地', scheduledSyncEnabled: true, scheduledIntervalMinutes: 1440, scheduledWindowMinutes: 1560 }),
    ],
  },
  {
    sectionName: '体育健身',
    sectionSlug: 'section-4',
    boards: [
      createBoardEntry({ boardName: 'Athletics', boardSlug: 'athletics', title: '田径', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Badminton', boardSlug: 'badminton', title: '羽毛球', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Basketball', boardSlug: 'basketball', title: '篮球咖啡屋', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Billiards', boardSlug: 'billiards', title: '台球', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Chess', boardSlug: 'chess', title: '棋牌', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Cycling', boardSlug: 'cycling', title: '梦想单车', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Dancing', boardSlug: 'dancing', title: '舞蹈', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Football', boardSlug: 'football', title: '足球吧', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'GSpeed', boardSlug: 'g-speed', title: '极速赛车', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Gymnasium', boardSlug: 'gymnasium', title: '健身房', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Kungfu', boardSlug: 'kungfu', title: '武术', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Rugby', boardSlug: 'rugby', title: '橄榄球', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Shuttlecock', boardSlug: 'shuttlecock', title: '天行毽', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Sk8', boardSlug: 'sk8', title: '滑板名堂', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Skating', boardSlug: 'skating', title: '北邮刷天下', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Ski_Snowboard', boardSlug: 'ski-snowboard', title: '滑雪', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Swim', boardSlug: 'swim', title: '碧水情深', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Tabletennis', boardSlug: 'tabletennis', title: '乒乓球', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Taekwondo', boardSlug: 'taekwondo', title: '跆拳道', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Tennis', boardSlug: 'tennis', title: '网球', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Volleyball', boardSlug: 'volleyball', title: '排球', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
    ],
  },
  {
    sectionName: '学术科技',
    sectionSlug: 'section-5',
    boards: [
      createBoardEntry({ boardName: 'ACM_ICPC', boardSlug: 'acm-icpc', title: '算法与程序设计竞赛', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BBSMan_Dev', boardSlug: 'bbs-man-dev', title: 'BBS安装管理', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BBSOpenAPI', boardSlug: 'bbs-open-api', title: '北邮人开放平台', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Circuit', boardSlug: 'circuit', title: '电子电路', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Communications', boardSlug: 'communications', title: '通信技术', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'CPP', boardSlug: 'cpp', title: 'C/C++程序设计语言', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Database', boardSlug: 'database', title: '数据库技术', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'dotNET', boardSlug: 'dot-net', title: '.NET程序设计', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Economics', boardSlug: 'economics', title: '经济学', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Embedded_System', boardSlug: 'embedded-system', title: '嵌入式系统', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Golang', boardSlug: 'golang', title: 'Go语言', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'HardWare', boardSlug: 'hard-ware', title: '电脑硬件与维修', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Innovation', boardSlug: 'innovation', title: '创新实践', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Java', boardSlug: 'java', title: 'Java技术', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'JavaScript', boardSlug: 'java-script', title: 'JavaScript语言', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Linux', boardSlug: 'linux', title: 'Linux操作系统', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Makerclub', boardSlug: 'makerclub', title: '创客与开源硬件', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'MathModel', boardSlug: 'math-model', title: '数学建模', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Matlab', boardSlug: 'matlab', title: 'Matlab实验室', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'ML_DM', boardSlug: 'ml-dm', title: '机器学习与数据挖掘', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'MobileInternet', boardSlug: 'mobile-internet', title: '移动互联网', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'MobileTerminalAT', boardSlug: 'mobile-terminal-at', title: '智能终端开发技术', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Notebook', boardSlug: 'notebook', title: '笔记本电脑', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'OfficeTool', boardSlug: 'office-tool', title: '办公软件', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Paper', boardSlug: 'paper', title: '科研与论文', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Python', boardSlug: 'python', title: 'Python', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Robot', boardSlug: 'robot', title: '机器人', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'SearchEngine', boardSlug: 'search-engine', title: '搜索引擎', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Security', boardSlug: 'security', title: '信息安全', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Smartcar', boardSlug: 'smartcar', title: '智能车', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'SoftDesign', boardSlug: 'soft-design', title: '软件开发', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Visualization', boardSlug: 'visualization', title: '大数据可视化', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Windows', boardSlug: 'windows', title: 'Windows操作系统', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'WWWTechnology', boardSlug: 'www-technology', title: 'WWW技术', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
    ],
  },
  {
    sectionName: '乡亲乡爱',
    sectionSlug: 'section-6',
    boards: [
      createBoardEntry({ boardName: 'Anhui', boardSlug: 'anhui', title: '情淮徽皖·安徽', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Cantonese', boardSlug: 'cantonese', title: '粤广茶餐厅·广东', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Chongqing', boardSlug: 'chongqing', title: '巴渝人家·重庆', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Fujian', boardSlug: 'fujian', title: '八闽玲珑·福建', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Gansu', boardSlug: 'gansu', title: '西凉故道·甘肃', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Guangxi', boardSlug: 'guangxi', title: '桂香南疆·广西', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Guizhou', boardSlug: 'guizhou', title: '景秀黔城·贵州', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Hainan', boardSlug: 'hainan', title: '天涯海角·海南', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Hebei', boardSlug: 'hebei', title: '燕赵情怀·河北', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Henan', boardSlug: 'henan', title: '豫韵悠悠·河南', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Hubei', boardSlug: 'hubei', title: '楚天邮情·湖北', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Hunan', boardSlug: 'hunan', title: '潇湘天下·湖南', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'InnerMongolia', boardSlug: 'inner-mongolia', title: '翱翔雄鹰·内蒙古', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Jiangsu', boardSlug: 'jiangsu', title: '江淮人家·江苏', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Jiangxi', boardSlug: 'jiangxi', title: '江南西道·江西', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Ningxia', boardSlug: 'ningxia', title: '塞上江南·宁夏', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'NorthEast', boardSlug: 'north-east', title: '东北一家人·东北', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Peking', boardSlug: 'peking', title: '北京四合院·北京', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Qinghai', boardSlug: 'qinghai', title: '青深似海·青海', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Shaanxi', boardSlug: 'shaanxi', title: '三秦大地·陕西', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Shandong', boardSlug: 'shandong', title: '齐鲁大地·山东', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Shanxi', boardSlug: 'shanxi', title: '桐叶封晋·山西', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Sichuan', boardSlug: 'sichuan', title: '蜀山邮侠·四川', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Tianjin', boardSlug: 'tianjin', title: '九河下梢·天津', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Xinjiang', boardSlug: 'xinjiang', title: '天山南北·新疆', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Yunnan', boardSlug: 'yunnan', title: '彩云之南·云南', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Zhejiang', boardSlug: 'zhejiang', title: '钱塘人家·浙江', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
    ],
  },
  {
    sectionName: '人文艺术',
    sectionSlug: 'section-7',
    boards: [
      createBoardEntry({ boardName: 'Astronomy', boardSlug: 'astronomy', title: '天文', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Debate', boardSlug: 'debate', title: '辩论', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'DV', boardSlug: 'dv', title: '视频制作', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'EnglishBar', boardSlug: 'english-bar', title: '英语吧', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Ghost', boardSlug: 'ghost', title: '奇闻异事', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Guitar', boardSlug: 'guitar', title: '吉他', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Japanese', boardSlug: 'japanese', title: '日语学习', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'KoreanWind', boardSlug: 'korean-wind', title: '韩流吧', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Music', boardSlug: 'music', title: '音乐交流区', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Photo', boardSlug: 'photo', title: '摄影', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Poetry', boardSlug: 'poetry', title: '诗词歌赋', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'PsyHealthOnline', boardSlug: 'psy-health-online', title: '心理健康在线', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Quyi', boardSlug: 'quyi', title: '曲苑杂谈', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Reading', boardSlug: 'reading', title: '书屋', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'ScienceFiction', boardSlug: 'science-fiction', title: '科幻奇幻', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Tshirt', boardSlug: 'tshirt', title: 'T恤文化', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
    ],
  },
  {
    sectionName: '休闲娱乐',
    sectionSlug: 'section-8',
    boards: [
      createBoardEntry({ boardName: 'AutoMotor', boardSlug: 'auto-motor', title: '汽车之家', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'BoardGame', boardSlug: 'board-game', title: '桌面游戏', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Comic', boardSlug: 'comic', title: '动漫交流区', scheduledSyncEnabled: true, scheduledIntervalMinutes: 1440, scheduledWindowMinutes: 1560 }),
      createBoardEntry({ boardName: 'Flash', boardSlug: 'flash', title: '闪客帝国', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Hero', boardSlug: 'hero', title: '煮酒论剑', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Joke', boardSlug: 'joke', title: '笑口常开', scheduledSyncEnabled: true, scheduledIntervalMinutes: 1440, scheduledWindowMinutes: 1560 }),
      createBoardEntry({ boardName: 'KaraOK', boardSlug: 'kara-ok', title: 'K歌之王', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'KillBar', boardSlug: 'kill-bar', title: '杀人俱乐部', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Movie', boardSlug: 'movie', title: '电影', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'NetLiterature', boardSlug: 'net-literature', title: '网络文学', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'nVote', boardSlug: 'n-vote', title: '北邮人投票', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Pet', boardSlug: 'pet', title: '宠物家园', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Picture', boardSlug: 'picture', title: '贴图秀', scheduledSyncEnabled: true, scheduledIntervalMinutes: 1440, scheduledWindowMinutes: 1560 }),
      createBoardEntry({ boardName: 'Plant', boardSlug: 'plant', title: '绿色心情', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'RadioOnline', boardSlug: 'radio-online', title: 'BYR在线广播', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'SuperStar', boardSlug: 'super-star', title: '娱乐星天地', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Travel', boardSlug: 'travel', title: '海天游踪', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'TV', boardSlug: 'tv', title: '电视剧', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'VideoCool', boardSlug: 'video-cool', title: '视频酷', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
    ],
  },
  {
    sectionName: '游戏对战',
    sectionSlug: 'section-9',
    boards: [
      createBoardEntry({ boardName: 'BUPTDNF', boardSlug: 'buptdnf', title: '地下城与勇士', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'CStrike', boardSlug: 'c-strike', title: '反恐精英', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Diablo', boardSlug: 'diablo', title: '暗黑破坏神', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Dota', boardSlug: 'dota', title: 'Dota', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'FootballManager', boardSlug: 'football-manager', title: '足球经理', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Hearthstone', boardSlug: 'hearthstone', title: '炉石传说', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'LOL', boardSlug: 'lol', title: '英雄联盟', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'OnlineGame', boardSlug: 'online-game', title: '网络游戏', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'OverWatch', boardSlug: 'over-watch', title: '守望先锋', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'PCGame', boardSlug: 'pc-game', title: '电脑游戏', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'PopKart', boardSlug: 'pop-kart', title: '跑跑卡丁车', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'PUBG', boardSlug: 'pubg', title: '绝地求生', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'TVGame', boardSlug: 'tv-game', title: '电子游戏', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'WE', boardSlug: 'we', title: '实况足球', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'WOW', boardSlug: 'wow', title: '魔兽世界', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
      createBoardEntry({ boardName: 'Xyq', boardSlug: 'xyq', title: '梦幻西游', scheduledSyncEnabled: true, scheduledIntervalMinutes: 43200, scheduledWindowMinutes: 44640 }),
    ],
  },
];

export const boardCatalog: readonly BoardCatalogEntry[] = boardCatalogSections.flatMap((section) =>
  section.boards.map((board) => ({
    ...board,
    sectionName: section.sectionName,
    sectionSlug: section.sectionSlug,
  })),
);

const _bySlug = new Map(
  boardCatalog.map((entry) => [entry.boardSlug, entry] as const),
);
const _byName = new Map(
  boardCatalog.map((entry) => [entry.boardName, entry] as const),
);
const _sectionBySlug = new Map(
  boardCatalogSections.map((section) => [section.sectionSlug, section] as const),
);

export function findCatalogEntryByBoardSlug(
  slug: string,
): BoardCatalogEntry | null {
  return _bySlug.get(slug) ?? null;
}

export function findCatalogEntryByBoardName(
  name: string,
): BoardCatalogEntry | null {
  return _byName.get(name) ?? null;
}

export function findCatalogSection(
  sectionSlug: string,
): BoardCatalogSection | null {
  return _sectionBySlug.get(sectionSlug) ?? null;
}
