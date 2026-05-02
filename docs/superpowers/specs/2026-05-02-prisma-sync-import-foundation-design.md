# Prisma 新库与首条真实数据导入链路设计

## 概述

这份设计聚焦当前最优先的子项目：先把 `IWhisper` 的真实数据接入新 PostgreSQL，让 Web 展示真正可用。

本轮设计覆盖以下目标：

1. 为新 PostgreSQL 设计首版 Prisma schema。
2. 明确新库只保存最终展示模型，不保存北邮人镜像原始层。
3. 设计 Admin 手动触发同步导入的最小闭环。
4. 让后端同步 API 与未来旧库迁移都能复用同一条写库接口。
5. 为后续真实用户登录、机器人资料与绑定关系预留稳定边界。

本轮设计不覆盖：

- 旧 PostgreSQL 的批量迁移实现细节。
- 断点续传、超长任务进度条和大批量迁移调度。
- 云服务器部署细节与完整 Docker 编排。
- 大数据量下的最终帖子页性能优化方案。
- 完整通知产品逻辑。

这些内容都属于后续独立子项目。

## 设计结论

第一子项目采用以下方向：

- 新库继续使用 Prisma，并采用官方推荐安装方式。
- 新数据库只保留论坛最终展示模型，不保留北邮人镜像原始层。
- 写库入口放在 Web `/admin` 对应的服务端接口。
- Python 后端继续只负责提供同步 API，不直接写新 PostgreSQL。
- 第一版只处理 `IWhisper`。
- 第一版先跑通“手动同步 -> 写入新库 -> 前端展示”的最小链路。

## 为什么先做这个子项目

当前项目已经有：

- 北邮人认证、版面抓取、帖子抓取与同步 API。
- Web 管理后台骨架。
- 前端阅读链路与领域模型雏形。

目前真正阻塞“展示可用”的点，不是继续扩产品范围，而是缺少一条稳定的真实数据落库链路。只要先把 `IWhisper` 的真实内容导入新库，后面的旧库迁移、云部署和阅读性能优化才有真实基础可验证。

## 新库的整体边界

新库是“论坛展示事实源”，不是“北邮人原始镜像仓库”。

这意味着：

- `boards`、`threads`、`replies`、`users` 等表直接服务产品展示。
- 北邮人返回的数据在进入新库前，会先被转换成论坛自己的统一内容模型。
- 不额外建立 `source_threads`、`source_replies` 之类的镜像层。
- 需要保留的来源信息，只保留在最终内容表的来源字段里。

这样做的核心好处是：

- 展示读取路径最直接。
- Admin 导入与展示模型天然一致。
- 旧库迁移也能走同一套目标表。

代价是溯源与重放能力更弱，但这是当前阶段可以接受的取舍。

## 技术路线

### ORM 选择

新库使用 Prisma。

原因：

- 你已经确认后续前端与管理后台希望共用一套模型。
- 后续真实用户体系、机器人资料与绑定关系更适合留在 Web 服务端统一维护。
- 与让 Python 后端直接写库相比，Prisma 更符合本轮“前端服务端负责编排，Python 只提供同步数据”的职责划分。

### 写库职责划分

第一版采用“前端服务端写库、Python 后端供数”的模式。

职责如下：

- Python 后端：
  - 提供 `/api/sync/updates` 等同步接口。
  - 负责认证、抓取、增量语义与补拉语义。
  - 不直接连接新 PostgreSQL。

- Web 服务端：
  - 提供 Admin 触发导入的服务端接口。
  - 请求 Python 同步 API。
  - 将返回数据转换为统一导入 DTO。
  - 使用 Prisma 执行幂等写入。
  - 记录导入会话与错误摘要。

- Admin 页面：
  - 触发导入。
  - 展示导入结果。
  - 作为后续旧库迁移入口的统一运营界面。

## 数据模型

### 内容表

#### `boards`

- `id`
- `slug`
- `name`
- `description`
- `createdAt`
- `updatedAt`

约束：

- `slug` 唯一。
- 第一版至少存在 `iwhisper`。

#### `threads`

- `id`
- `boardId`
- `authorUserId`
- `title`
- `body`
- `sourceThreadId`
- `sourceBoardSlug`
- `replyCount`
- `lastReplyAt`
- `createdAt`
- `updatedAt`
- `publishedAt`

约束：

- `id` 使用 UUID，作为论坛内部主键。
- `sourceThreadId` 保存北邮人原帖 ID。
- `sourceBoardSlug + sourceThreadId` 组合唯一。
- 本地新建帖子不依赖外部 ID，但来自北邮人同步的数据应填写来源字段。

#### `replies`

- `id`
- `threadId`
- `authorUserId`
- `body`
- `replyIndex`
- `createdAt`
- `updatedAt`
- `publishedAt`

约束：

- `id` 使用 UUID，作为论坛内部主键。
- 回复不单独记录源站回复 ID。
- 采用“同一源帖内楼层唯一”的规则。
- `threadId + replyIndex` 组合唯一。

#### `imports`

- `id`
- `sourceType`
- `sourceLabel`
- `status`
- `startedAt`
- `finishedAt`
- `importedThreads`
- `importedReplies`
- `skippedReplies`
- `errorMessage`
- `metadataJson`
- `createdAt`
- `updatedAt`

用途：

- 记录一次导入会话。
- 记录成功、失败、部分成功的统计与错误摘要。
- 为 Admin 表格提供运营可见性。

### 身份表

#### `users`

- `id`
- `username`
- `displayName`
- `userType`
- `avatarUrl`
- `bio`
- `status`
- `createdAt`
- `updatedAt`

设计原则：

- `users` 是帖子、回复等业务关系统一引用的主表。
- `userType` 至少支持 `human` 与 `bot`。
- 第一版历史导入内容的作者统一落成 `bot` 用户。

#### `humanProfiles`

- `userId`
- `authProvider`
- `authSubject`
- `email`
- `profileStatus`
- `createdAt`
- `updatedAt`

用途：

- 承接后续 Kinde 等认证登录资料。
- 不参与当前历史内容导入。

#### `botProfiles`

- `userId`
- `mailboxKey`
- `sourceLabel`
- `canPost`
- `personaSummary`
- `profileStatus`
- `createdAt`
- `updatedAt`

用途：

- 承接机器人收件箱标识、运营资料与发帖能力。
- 北邮人同步 API 导入的作者统一在这里补齐机器人扩展信息。

#### `userBotBindings`

- `id`
- `humanUserId`
- `botUserId`
- `bindingStatus`
- `createdAt`
- `updatedAt`

用途：

- 为后续“真实用户绑定机器人收件箱”预留关系模型。
- 不参与本轮导入流程。

## 索引与幂等策略

第一版导入与展示的关键索引如下：

- `boards.slug` 唯一索引。
- `threads(sourceBoardSlug, sourceThreadId)` 唯一索引。
- `threads(boardId, lastReplyAt)` 索引，用于列表页活跃排序。
- `threads(boardId, publishedAt)` 索引，用于时间排序。
- `replies(threadId, replyIndex)` 唯一索引。
- `replies(threadId, publishedAt)` 索引，用于详情页顺序读取。
- `users.username` 普通索引。

导入幂等规则：

- 帖子按 `sourceBoardSlug + sourceThreadId` 识别。
- 回复按 `threadId + replyIndex` 识别。
- 已存在帖子允许更新摘要字段，例如 `title`、`body`、`replyCount`、`lastReplyAt`。
- 已存在回复直接跳过，不重复插入。
- 第一版不处理因源站删除导致的新库内容回收。

## 作者归属策略

这是本轮设计的明确规则：

- 北邮人同步 API 导入的发帖人与回帖人，统一创建为 `bot` 用户。
- 旧库迁移时，若旧库本身已区分为机器人内容，也继续统一落到 `bot`。
- `human` 用户只用于未来真实用户登录、绑定机器人和通知接收等能力。

这样做的原因是：

- 当前产品语义中，历史镜像内容本来就由机器人主体承接。
- 这能避免把历史来源作者错误建模成真实登录用户。
- 也能保持帖子、回复和后续通知规则的一致性。

## Admin 导入流程

第一版只需要一个很窄但完整的导入闭环。

流程如下：

1. Admin 页面展示“同步北邮人数据”按钮。
2. 点击按钮后，请求 Web 服务端接口，例如 `POST /admin/api/imports/byr-sync`。
3. Web 服务端请求 Python 同步 API 的 `/api/sync/updates`。
4. Web 服务端把返回数据转换为统一导入 DTO。
5. Web 服务端调用 Prisma 写库服务，执行幂等导入。
6. 导入结果写入 `imports` 表。
7. Admin 页面刷新导入记录表格，展示状态、数量与错误摘要。

第一版不做自动定时同步，先保留手动触发，便于验证字段和语义。

## 统一写库接口

无论数据来源是：

- Python 同步 API
- 未来旧 PostgreSQL 迁移

最终都不应该各自直接写 Prisma 表，而是先转换成统一的导入 DTO，再走同一个写库服务。

这个统一写库接口至少需要支持：

- 写入或获取 `board`
- 写入或获取 `bot` 用户
- 幂等写入 `thread`
- 幂等写入 `reply`
- 更新导入统计
- 记录失败信息

这样设计的原因是：

- 可以避免“同步 API 导入”和“旧库迁移”出现两套写库逻辑。
- 后续加进度显示、断点续传或导入审计时，只需要扩展同一层接口。

## 错误处理

第一版需要明确区分以下错误：

- Python 同步 API 鉴权失败。
- Python 同步 API 不可达或超时。
- 返回数据结构不符合预期。
- Prisma 写库失败。
- 幂等冲突或数据约束错误。

处理原则：

- 导入失败时必须保留 `imports` 记录。
- `imports.status` 至少支持 `running`、`succeeded`、`failed`、`partial`。
- Admin 表格必须能看到失败摘要，而不是只看到一次静默报错。

## 与后续旧库迁移的关系

这份设计刻意不实现旧库迁移，但它已经为旧库迁移做了边界准备。

后续旧 PostgreSQL 的 `iwhisper` 导入应当：

- 读取旧库内容。
- 转换成与同步 API 相同的统一导入 DTO。
- 复用同一个 Prisma 写库服务。
- 只在来源适配层处理旧库字段差异。

这保证旧库迁移与同步 API 导入的主要区别只在“取数方式不同”，而不是“写入目标完全不同”。

## 对展示层的直接收益

只要第一版导入跑通，前端公开阅读页就可以直接读取新库里的：

- `boards`
- `threads`
- `replies`

这会带来几个直接收益：

- 展示不再依赖假数据。
- 帖子可以保留 `sourceThreadId`，为未来“跳回原论坛”索引页提供基础。
- 后续性能优化可以围绕真实表结构与真实数据规模展开，而不是围绕推测数据建模。

## 验证重点

第一子项目完成后，至少应验证：

1. Prisma schema 可以在新 PostgreSQL 上成功初始化。
2. Admin 手动同步按钮可以成功触发服务端导入。
3. Web 服务端可以正确调用 Python `/api/sync/updates`。
4. `IWhisper` 的真实帖子与回复能够幂等写入新库。
5. 重复触发导入不会插入重复回复。
6. 导入失败时 `imports` 中会保留可见记录。
7. 前端展示页能从新库读取真实内容并正常展示。

## 非目标

这份设计明确不定义：

- 旧库海量迁移任务的并发、断点续传和进度条细节。
- 云服务器上的正式部署拓扑。
- Dockerfile 内容与多服务编排方案。
- 导入百万级数据后的最终索引、分页和缓存策略。
- 真实用户直接发帖的产品规则。
- 通知中心与绑定流程的完整交互设计。

这些都应在下一轮更聚焦的 spec 中单独讨论。
