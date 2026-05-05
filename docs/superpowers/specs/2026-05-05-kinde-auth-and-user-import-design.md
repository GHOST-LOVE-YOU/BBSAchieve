# Kinde 认证与用户导入设计

## 背景

BBSAchieve 当前已经有 Web、Mobile、Prisma 阅读数据模型和导入链路。下一步需要接入 Kinde 认证，让帖子详情、帖子 API、管理后台和移动端访问具备明确身份边界，同时为旧 Kinde 用户导入新的 PostgreSQL 数据库预留脚本。

本设计只覆盖认证、授权、本地用户落库和 Kinde 导出用户导入。它不改变“真实用户是否可以直接发帖”的产品边界，也不在本阶段实现 Kinde webhook。

## 已确认的 Kinde 配置

Web 应用使用现有 Kinde Web client：

- Domain: `https://orlco.kinde.com`
- Client ID: `37d842a20aaa46aa844ba7aa59d77dce`
- Client secret: 写入本地或部署环境变量，不提交仓库

Mobile 应用使用独立 Kinde React Native / Expo client：

- Domain: `https://orlco.kinde.com`
- Client ID: `fd4871ebb882462a80df2842dba66da0`
- Callback URL: `byrachieve://orlco.kinde.com/kinde_callback`
- Logout redirect URL: `byrachieve://orlco.kinde.com/kinde_callback`

业务 API 使用独立 Kinde API audience：

- API ID: `42b85c01bd1146cf9f890c134c9e0b50`
- Audience: `https://bbsachieve.orlco/api`

管理员组织通过环境变量配置：

- `KINDE_ADMIN_ORG_CODE=org_ed7de8344b99`

`https://orlco.kinde.com/api` 是 Kinde Management API，不作为 BBSAchieve 业务 API 的 audience。

## 认证边界

Web 端保持首页与版面公开：

- `/`
- `/boards/[boardId]`
- `/api/public/boards`
- `/api/public/boards/[boardIdOrSlug]`
- `/api/public/boards/[boardIdOrSlug]/threads`

Web 端帖子详情需要登录：

- `/threads/[threadId]`
- `/api/public/threads/[threadId]`
- `/api/public/threads/[threadId]/replies`

Admin 全部需要登录且属于管理员组织：

- `/admin/*`
- `/admin/api/*`

Mobile 端采用全局保护：未登录用户只能看到登录/注册入口，登录后才进入现有 Stack 页面。Mobile 端所有对 Web API 的请求都带 `Authorization: Bearer <access_token>`。

未登录用户访问受保护 Web 页面时跳转到 Kinde 登录/注册界面，登录成功后回到原页面。未登录访问受保护 API 返回 `401`。已登录但不属于管理员组织访问 admin 资源返回 `403`。

## Web 接入方案

Web 使用 Kinde Next SDK 处理登录、回调、退出和 cookie session。Next 16 下优先采用 SDK 支持的 App Router 接入方式，包括：

- Kinde auth route handler，例如 `/api/auth/[kindeAuth]`
- `proxy.ts` / SDK 中间层，用于登录态桥接与受保护页面回跳
- Server Component 中的 session helper，用于读取 Web 登录用户

Web 受保护页面不直接散落 Kinde SDK 调用，而是通过本地 auth helper：

- `requireWebUser()`：用于 Server Component 页面，未登录时触发登录并保留回跳 URL。
- `requireAdminPageUser()`：用于 admin layout，要求登录且属于管理员组织。

`/threads/[threadId]` 在读取帖子数据前调用 `requireWebUser()`。`/admin/layout.tsx` 统一调用 admin guard，覆盖 admin 下所有页面。

## API 认证与授权

Route Handler 使用统一 auth helper，避免页面、API、admin 路由各自解析 token：

- `getRequestUser(request)`：先尝试 Web cookie session，再尝试 `Authorization: Bearer ...`。
- `verifyBearerToken(token)`：通过 Kinde JWKS 校验签名，并校验 issuer、过期时间和 audience。
- `requireRequestUser(request)`：未登录返回统一 `401` 响应。
- `requireAdminRequestUser(request)`：未登录返回 `401`，登录但非 admin 组织返回 `403`。
- `ensureLocalHumanUser(identity)`：认证成功后懒 upsert 本地真人用户。

Bearer token 校验规则：

- issuer 必须是 `https://orlco.kinde.com`。
- audience 必须包含 `https://bbsachieve.orlco/api`。
- token 必须未过期。
- 用户 id 使用 Kinde subject / user id。
- 组织信息从 Kinde token/session 的组织 claim 中提取，并封装在 auth helper 内。

Admin 判定只依赖 `KINDE_ADMIN_ORG_CODE`，当前值为 `org_ed7de8344b99`。路由层不硬编码组织 code。

## 本地用户模型

当前 Prisma 已有 `User` 与 `HumanProfile`，不新增重复模型。本阶段扩展并使用现有结构：

- `User.userType=human`
- `User.status=active`
- `User.username` 从 Kinde profile 推导，优先使用 email 前缀或 Kinde id 的稳定形式
- `User.displayName` 优先使用 Kinde name / given name + family name / email
- `HumanProfile.authProvider=kinde`
- `HumanProfile.authSubject=<Kinde user id>`
- `HumanProfile.email=<Kinde email 或 null>`
- `HumanProfile.profileStatus=active`

为了保证幂等性，需要给 `HumanProfile(authProvider, authSubject)` 增加唯一约束。email 不作为唯一约束，因为用户可能修改邮箱、没有邮箱，或历史数据存在重复。

本阶段采用懒 upsert：用户登录 Web、Mobile 带 token 调 API，或受保护 API 校验成功时，后端根据 Kinde 身份创建或更新本地 `User + HumanProfile`。这样认证链路不依赖 webhook 到达顺序。

## Webhook 取舍

Kinde webhook 本阶段不作为必需项。

后续接入 webhook 的优点：

- 新用户注册后无需等待第一次访问业务系统即可落库。
- 可集中处理用户 profile 更新、删除或禁用。
- 对后台用户列表更友好。

后续接入 webhook 的成本：

- 需要签名校验、重放防护、失败重试和幂等处理。
- 需要处理 webhook 与懒 upsert 同时发生时的数据一致性。
- 本地开发与部署环境都要配置可访问 webhook URL。

因此第一阶段先做懒 upsert，并把 webhook 作为后续增强。

## Mobile 接入方案

Mobile 使用 Kinde Expo / React Native SDK。Mobile 端只保存公开配置，不保存 client secret。

环境变量：

```env
EXPO_PUBLIC_WEB_BASE_URL=http://127.0.0.1:3000
EXPO_PUBLIC_KINDE_DOMAIN=https://orlco.kinde.com
EXPO_PUBLIC_KINDE_CLIENT_ID=fd4871ebb882462a80df2842dba66da0
EXPO_PUBLIC_KINDE_REDIRECT_URL=byrachieve://orlco.kinde.com/kinde_callback
EXPO_PUBLIC_KINDE_LOGOUT_REDIRECT_URL=byrachieve://orlco.kinde.com/kinde_callback
EXPO_PUBLIC_KINDE_API_AUDIENCE=https://bbsachieve.orlco/api
```

实现结构：

- 在 `apps/mobile/src/app/_layout.tsx` 外层加入 `AuthProvider`。
- 未登录时显示登录/注册入口。
- 登录成功后渲染现有 Stack 页面。
- `apiGetJson()` 从 auth provider 获取 access token。
- 所有 mobile API 请求加 `Authorization: Bearer <token>`。
- 遇到 `401` 提示重新登录或清理登录态。
- 遇到 `403` 显示无权限状态。

Mobile 不承担 admin 组织判断；admin 权限由 Web API 服务端统一判断。

## 环境变量

Web 本地 `.env` 需要包含：

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/bbsachieve"
BYR_SYNC_API_BASE_URL=http://localhost:8000
BYR_SYNC_API_TOKEN=123456
WEB_SCHEDULER_ENABLED=false

KINDE_ISSUER_URL=https://orlco.kinde.com
KINDE_SITE_URL=http://localhost:3000
KINDE_CLIENT_ID=37d842a20aaa46aa844ba7aa59d77dce
KINDE_CLIENT_SECRET=<local secret>
KINDE_POST_LOGIN_REDIRECT_URL=http://localhost:3000
KINDE_POST_LOGOUT_REDIRECT_URL=http://localhost:3000
KINDE_ADMIN_ORG_CODE=org_ed7de8344b99
KINDE_API_AUDIENCE=https://bbsachieve.orlco/api
```

正式部署时这些变量由部署平台注入。`KINDE_CLIENT_SECRET` 不提交。

## 历史用户导入脚本

旧项目导出的 Kinde 数据位于仓库根目录：

- `/Users/ghost/code/BBSAchieve/kinde_export/users.ndjson`
- `/Users/ghost/code/BBSAchieve/kinde_export/organizations.ndjson`

`kinde_export/` 必须加入 `.gitignore` 和 `.dockerignore`，永远不提交、不打进镜像。

导入脚本放在 `apps/web/scripts/import-kinde-users.ts`，并在 `apps/web/package.json` 增加命令：

```bash
pnpm --filter @bbs/web import:kinde-users
```

默认读取仓库根目录 `kinde_export/users.ndjson`，也支持传入路径：

```bash
pnpm --filter @bbs/web import:kinde-users -- ../../kinde_export/users.ndjson
```

导入规则：

- 按每行 JSON 解析 Kinde 用户。
- 使用 `id` 作为 `HumanProfile.authSubject`。
- 使用 `email` 写入 `HumanProfile.email`。
- 使用 `first_name`、`last_name`、email 或 Kinde id 推导 `displayName` 与 `username`。
- `email_verified` 仅作为未来可用信息，本阶段不阻止导入。
- `organizations` 可记录在日志中，但本阶段不把历史组织关系落入业务表。
- 对每个用户执行幂等 upsert。
- 输出导入总数、创建数、更新数、跳过数和错误摘要。

脚本只导入真人用户，不创建机器人用户。

## 测试计划

Web auth helper 测试：

- bearer token 缺失时返回未认证。
- issuer 不匹配时拒绝。
- audience 不匹配时拒绝。
- token 过期时拒绝。
- 包含 admin 组织时通过 admin guard。
- 登录但没有 admin 组织时返回 `403`。

Web route tests：

- `/api/public/boards*` 未登录仍可访问。
- `/api/public/threads/[threadId]` 未登录返回 `401`。
- `/api/public/threads/[threadId]` 登录后返回帖子详情。
- `/api/public/threads/[threadId]/replies` 登录后返回回复。
- `/admin/api/*` 未登录返回 `401`。
- `/admin/api/*` 非 admin 返回 `403`。

Web page tests：

- `/threads/[threadId]` 在读取帖子前要求登录。
- `/admin/*` 通过 admin layout 统一保护。
- 未登录 Web 页面保护保留回跳 URL。

Prisma 与脚本测试：

- `HumanProfile(authProvider, authSubject)` 唯一约束生效。
- 懒 upsert 重复调用不会创建重复真人用户。
- Kinde NDJSON 导入脚本重复运行幂等。
- `kinde_export/` 不在 git 跟踪范围内。

Mobile tests：

- 未登录时不请求阅读 API。
- 登录后所有 `apiGetJson()` 请求带 `Authorization`。
- `401` 和 `403` 转换成明确错误状态。
- Kinde 环境变量缺失时给出明确错误。

## 交付范围

本阶段交付：

- Kinde Web 登录与 Web 页面/API 保护。
- Mobile 全局登录门与 bearer token 请求。
- Admin 组织授权。
- 本地真人用户懒 upsert。
- Kinde 导出用户导入脚本。
- `kinde_export/` 忽略规则。
- 对应测试。

本阶段不交付：

- Kinde webhook。
- 真实用户直接发帖。
- 用户认领镜像帖子或回复。
- 通知绑定业务的完整认证后流程。
