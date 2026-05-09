# 移动端真实只读链路与公共阅读 API 设计

## 概述

这份设计聚焦当前一个边界明确的子项目：让 `apps/mobile` 不再依赖内存 fixture，而是通过 `apps/web` 暴露的匿名公共只读 API 读取真实云端数据库中的论坛内容。

本轮设计覆盖以下目标：

1. 让移动端首页、版面页、帖子页接上真实数据。
2. 让版面帖子列表和帖子回复列表都支持移动端风格的增量加载。
3. 先统一 `apps/web` 内部的 reading service 返回 DTO，再从这层 DTO 同时派生 SSR 页面与公共 API。
4. 保持 Web 公共页面继续本地调用 service，不通过 HTTP 调自己。
5. 让移动端通过环境变量读取 Web 域名，不在代码中写死线上地址。

本轮设计不覆盖：

- 登录、鉴权、用户态个性化内容
- 发帖、回帖、编辑、删除等写操作
- 匿名通知与帖子/回复订阅
- 搜索、筛选、排序切换
- Web 公共页面改为通过 HTTP 调自己的接口
- 离线缓存、预取、复杂重试或后台刷新策略

## 当前项目上下文

当前仓库已经具备以下基础：

- `apps/web` 已经通过 Prisma 连接真实数据库，并能在公开页面读取真实版面、帖子与回复数据。
- `apps/web/src/server/reading/readingRepository.ts` 已经提供基础只读仓储能力。
- `apps/web/app/page.tsx`、`apps/web/app/boards/[boardId]/page.tsx`、`apps/web/app/threads/[threadId]/page.tsx` 已经消费真实数据库数据。
- `apps/mobile` 当前仍然直接调用 `@bbs/state/runtime` 中的 `createReadingFlowDeps()`。
- `packages/state/src/runtime/readingFlowDeps.ts` 返回的是内存 fixture，因此移动端当前 build 到 Expo 后看到的是固定假数据，而不是真实云端内容。

这说明本轮工作的核心不是“修复 mobile 误连数据库”，而是正式建立一条面向移动端的真实只读读取链路。

## 设计结论

本轮采用“数据层先行”的方案。

- 保留现有 `Prisma -> reading repository` 这一层，用于读取数据库记录并转成基础 record。
- 在 `apps/web` 中新增统一的 reading service / DTO 层，负责产出页面与公共 API 共用的读模型。
- Web SSR 页面继续直接调用 reading service，不通过 HTTP 回环请求自己。
- `apps/web` 新增匿名公共只读 API，作为移动端正式数据入口。
- `apps/mobile` 新增 API client 与 mobile 侧读取数据层，不再以 fixture 作为正式构建默认来源。
- 版面帖子列表与帖子回复列表统一采用“首批 20 条 + 接近底部继续加载 20 条”的增量加载体验。

这个方向的核心价值是先把“真实数据长什么样”和“页面如何消费它”统一在 service / DTO 层，再让 Web 页面和 mobile 分别选择各自适合的接入方式。

## 架构与职责边界

### `apps/web/src/server/reading/readingRepository.ts`

这一层继续承担数据库读取职责：

- 读取 board、thread、reply、user
- 负责数据库记录到基础 record 的转换
- 不承担 HTTP 响应结构
- 不承担移动端分页体验语义

它仍然是 reading service 的底层依赖，而不是 API route 直接拼 JSON 的替代品。

### 新增 reading service / DTO 层

这一层负责：

- 聚合页面和 API 需要的字段
- 定义统一的只读 DTO
- 处理列表排序、cursor、`hasMore` 等读取语义
- 向 Web 页面和 API route 提供相同的数据边界

这一层不负责：

- HTTP 状态码输出
- 移动端组件状态管理
- Expo 环境变量读取

### `apps/web` 公共页面

Web 公共页面继续：

- 直接调用 reading service
- 消费统一 DTO
- 自己决定页面级空态、错误文案和 SSR 呈现

本轮不把 Web 页面改成通过 HTTP 访问公共 API，以避免自调用回环和无意义的网络层开销。

### `apps/web` 公共只读 API

公共 API 负责：

- 匿名访问
- 参数校验
- 调用 reading service
- 序列化 DTO
- 用 HTTP 状态码表达错误

公共 API 不负责：

- 登录校验
- 管理态字段返回
- 调度、导入、同步写入逻辑

### `apps/mobile`

移动端负责：

- 通过 `EXPO_PUBLIC_WEB_BASE_URL` 请求 Web 公共只读 API
- 用虚拟列表组件承接帖子流和回复流
- 管理首批加载、继续加载、加载失败重试等前端状态

移动端不再把 fixture 当作 release 默认兜底源。fixture 只保留给测试和明确的本地 mock 场景。

## 读取模型设计

为了兼容移动端增量加载体验，本轮不沿用“一次返回完整帖子数组或完整回复数组”的整包模型，而是把详情和列表流拆开。

### 版面摘要 DTO

用于首页版面列表。

每项至少包含：

- `id`
- `slug`
- `name`
- `description`
- `threadCount`
- `latestThreadTitle`

首页只读取摘要信息，不返回帖子数组。

### 版面详情 DTO

用于版面页顶部信息。

至少包含：

- `id`
- `slug`
- `name`
- `description`

版面详情与帖子流分开返回，避免每次继续加载帖子时重复传输整页元信息。

### 版面帖子流 DTO

用于版面页列表区。

返回结构建议包含：

- `items`
- `page`

其中每条帖子项至少包含：

- `id`
- `title`
- `authorName`
- `publishedAt`
- `replyCount`
- `lastReplyAt`

分页信息至少包含：

- `limit`
- `nextCursor`
- `hasMore`

### 帖子主体 DTO

用于帖子详情顶部。

返回结构建议包含：

- `board`
- `thread`

其中：

- `board` 至少包含 `id`、`slug`、`name`
- `thread` 至少包含 `id`、`title`、`body`、`authorName`、`publishedAt`、`replyCount`

帖子主体与回复流分开返回，避免滚动加载回复时重复传输正文。

### 帖子回复流 DTO

用于帖子详情页的回复列表区。

返回结构建议包含：

- `items`
- `page`

其中每条回复项至少包含：

- `id`
- `body`
- `authorName`
- `publishedAt`
- `replyIndex`

分页信息至少包含：

- `limit`
- `nextCursor`
- `hasMore`

## 公共 API 设计

本轮建议至少新增以下匿名只读接口：

### `GET /api/public/boards`

返回首页版面列表。

语义：

- 匿名可读
- 一次返回全部版面摘要
- 不带分页

### `GET /api/public/boards/[boardIdOrSlug]`

返回单个版面元信息。

语义：

- 支持按 `id` 或 `slug` 查询
- 不返回帖子数组

### `GET /api/public/boards/[boardIdOrSlug]/threads?limit=20&cursor=...`

返回单个版面的帖子流。

语义：

- 匿名可读
- `limit` 首版固定支持 `20`
- `cursor` 用于继续加载下一批帖子
- 返回 `items + page`

### `GET /api/public/threads/[threadId]`

返回帖子主体和所属版面摘要。

语义：

- 支持当前仓库已有的帖子 id 兼容规则
- 只返回帖子主体，不返回回复数组

### `GET /api/public/threads/[threadId]/replies?limit=20&cursor=...`

返回帖子回复流。

语义：

- 匿名可读
- `limit` 首版固定支持 `20`
- `cursor` 用于继续加载下一批回复
- 返回 `items + page`

## 排序与 cursor 设计

### 版面帖子流

版面帖子流建议沿用当前 Web 版面页已经使用的排序口径：

1. `lastReplyAt desc`
2. `id desc`

选择这个排序的原因是：

- 它符合论坛“按最近活跃排序”的阅读习惯
- 已经与当前 Web 版面页语义一致
- 可以减少双端口径分叉

帖子流的 `cursor` 也应基于这组排序字段构造，确保继续加载时排序稳定，避免重复项和漏项。

本轮设计不要求在文档中固定 `cursor` 的具体编码格式，只要求它满足以下约束：

- 服务端可校验
- 客户端可透明传回
- 排序稳定
- 不暴露管理态或无关字段

### 帖子回复流

帖子回复流建议按以下顺序返回：

1. `replyIndex asc`

回复流使用 `replyIndex` 作为 cursor 的原因是：

- 楼层本身就是论坛天然顺序
- 相比时间戳，`replyIndex` 更稳定、可读性更高
- 更容易和“第几层回复”语义保持一致

## 错误处理与状态语义

公共只读 API 的错误语义建议统一使用 HTTP 状态码表达，不额外包一层应用态 `status: success` 信封。

约束如下：

- 资源不存在返回 `404`
- 参数非法返回 `400`
- 服务端读取失败返回 `500`
- 正常响应直接返回 DTO

移动端页面据此处理：

- 首页整体读取失败时显示读取失败态
- 版面不存在时显示版面不存在
- 帖子不存在时显示帖子不存在
- 列表继续加载失败时保留已加载内容，只在列表底部显示可重试状态

本轮不引入复杂的统一错误码枚举或多层错误包装。

## 环境变量与配置策略

移动端本轮必须通过环境变量读取 Web 基础域名。

建议使用：

- `EXPO_PUBLIC_WEB_BASE_URL`

约束如下：

- 本地开发、预发、正式构建都从该变量读取
- 变量缺失时直接进入显式错误，不回退到 fixture
- 代码中不写死线上 `apps/web` 域名

这样可以保证移动端在贴近 Web 的同时，保留不同环境切换能力。

## 移动端页面替换策略

### 首页

当前首页直接调用 `getBoardSummaries(createReadingFlowDeps())`。

本轮改为：

- 通过 mobile API client 请求 `/api/public/boards`
- 渲染真实版面摘要列表

### 版面页

当前版面页一次读取整包版面详情和帖子数组。

本轮改为拆分两类请求：

- 版面元信息请求
- 帖子流请求

页面使用虚拟列表组件承接帖子流，行为为：

- 首批加载 `20` 条
- 接近底部时继续请求下一批 `20` 条
- 失败时可在底部重试

### 帖子页

当前帖子页一次读取帖子主体和全部回复。

本轮改为拆分两类请求：

- 帖子主体请求
- 回复流请求

页面同样使用虚拟列表组件承接回复流，行为与帖子流一致。

## Web 页面复用策略

虽然本轮新增公共 API，但 Web 页面不通过 HTTP 调自己。

推荐方式是：

- Web 页面改为直接消费统一 reading service DTO
- API route 调用同一套 reading service

这样能同时满足：

- 统一接口结构和返回模型
- 避免服务端页面自发起网络请求
- 后续扩展字段时只维护一套核心读取模型

## 测试策略

### `apps/web` service / DTO 层

这是本轮最关键的测试层。

需要覆盖：

- 版面摘要 DTO 正常返回
- 版面详情 DTO 正常返回
- 帖子流 DTO 的排序、`limit`、`nextCursor`、`hasMore`
- 帖子主体 DTO 正常返回
- 回复流 DTO 的排序、`limit`、`nextCursor`、`hasMore`
- 版面不存在
- 帖子不存在
- 非法 cursor 或非法 limit

### `apps/web` API route

需要覆盖：

- 匿名访问成功
- `404`
- `400`
- `500`
- DTO 序列化结构符合约定

不测试视觉表现。

### `apps/mobile`

需要覆盖：

- 首页读取真实版面摘要后的渲染
- 版面页首批加载帖子流
- 版面页继续加载下一批帖子流
- 帖子页首批加载回复流
- 帖子页继续加载下一批回复流
- 首批失败态
- 续批失败但保留已加载内容

### 既有 fixture 与共享状态用例

`packages/state` 中基于 fixture 的既有只读用例和测试可以继续保留，用于验证当前共享领域读取逻辑与测试夹具。

但它们不再充当移动端 release 数据源验证。

## 非目标与范围收束

为了让这一阶段保持聚焦，本轮明确不做以下能力：

- 公共 API 鉴权
- 绑定页和通知页的数据接入
- 作者主页或用户资料扩展字段
- 搜索、筛选、排序切换
- Web 页面通过 HTTP 访问公共 API
- 列表离线缓存、后台预取、复杂缓存失效策略

这保证当前阶段聚焦在“真实只读链路 + 公共 API + 移动端增量加载”。

## 实施结果标准

完成本轮后，应满足以下结果：

1. `apps/mobile` 首页、版面页、帖子页读取的是 `apps/web` 公共 API 返回的真实数据，而不是内存 fixture。
2. 版面帖子列表和帖子回复列表都支持首批 `20` 条、滑动到底部继续加载下一批 `20` 条。
3. `apps/web` 内部存在统一 reading service / DTO 层，Web 页面和公共 API 共用同一套核心读取模型。
4. 公共 API 默认匿名可读，只暴露公共阅读所需字段，不携带管理态信息。
5. 移动端通过 `EXPO_PUBLIC_WEB_BASE_URL` 切换访问环境，变量缺失时显式报错。

这份设计将作为下一步 implementation plan 的依据。
