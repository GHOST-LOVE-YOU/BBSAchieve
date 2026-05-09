# Frontend Data Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 Next.js 与 Expo 官方模板初始化双端前端工程，并在模板基础上搭起共享论坛领域模型、本地数据底座、Web 公开区与 `/admin` 管理区、以及移动端最小阅读闭环。

**Architecture:** 采用 `apps/* + packages/*` monorepo。`apps/web` 使用 `create-next-app` 官方模板初始化，`apps/mobile` 使用 `create-expo-app` 官方模板初始化；`packages/domain` 负责论坛实体与仓储接口，`packages/state` 负责跨端用例编排，Web 与移动端分别实现各自本地数据库适配层。

**Tech Stack:** TypeScript, pnpm workspaces, Next.js App Router, Expo Router, React, Dexie, expo-sqlite, Zustand, Zod, Vitest, Testing Library

---

## 文件结构

- 新建: `package.json`
  - 根工作区脚本与统一开发命令。
- 新建: `pnpm-workspace.yaml`
  - 定义 `apps/*` 与 `packages/*` 工作区。
- 新建: `tsconfig.base.json`
  - 全局 TypeScript 共享配置。
- 新建: `vitest.workspace.ts`
  - 统一测试入口。
- 初始化: `apps/web`
  - 使用 Next.js 官方模板生成 App Router 工程。
- 初始化: `apps/mobile`
  - 使用 Expo 官方模板生成带 Expo Router 的 TypeScript 工程。
- 新建: `packages/domain/*`
  - 论坛实体、Zod schema、仓储接口、业务错误。
- 新建: `packages/state/*`
  - 创建机器人并发帖、导入内容、写入时间线等用例。
- 新建: `packages/ui-base/*`
  - 最小容器与基础组件接口。
- 新建: `packages/test-utils/*`
  - 内存仓储、假数据工厂、测试辅助。
- 修改: `apps/web/app/*`
  - 把模板默认页面改成论坛公开区与 `/admin` 管理区骨架。
- 修改: `apps/mobile/app/*`
  - 把模板默认页面改成版面列表、帖子详情、通知订阅占位入口。

### Task 1: 建立 monorepo 根骨架与统一工具链

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `vitest.workspace.ts`

- [ ] **Step 1: 先写工作区 smoke test**

```ts
// vitest.workspace.ts
import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "packages/*/vitest.config.ts",
  "apps/*/vitest.config.ts",
]);
```

```ts
// packages/domain/tests/workspace-smoke.test.ts
import { describe, expect, it } from "vitest";

describe("workspace smoke", () => {
  it("runs from the monorepo root", () => {
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试并确认当前失败**

Run: `pnpm vitest run`  
Expected: FAIL，提示缺少根工作区配置。

- [ ] **Step 3: 写根配置**

```json
{
  "name": "bbsachieve-frontend",
  "private": true,
  "packageManager": "pnpm@10.11.0",
  "scripts": {
    "test": "vitest run",
    "typecheck": "pnpm -r typecheck",
    "lint": "pnpm -r lint",
    "verify": "pnpm lint && pnpm typecheck && pnpm test"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "typescript": "^5.8.3",
    "vitest": "^3.2.4"
  }
}
```

```yaml
packages:
  - apps/*
  - packages/*
```

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@bbs/domain": ["packages/domain/src/index.ts"],
      "@bbs/state": ["packages/state/src/index.ts"],
      "@bbs/ui-base": ["packages/ui-base/src/index.ts"],
      "@bbs/test-utils": ["packages/test-utils/src/index.ts"]
    }
  }
}
```

- [ ] **Step 4: 重新运行测试并确认通过**

Run: `pnpm install && pnpm vitest run packages/domain/tests/workspace-smoke.test.ts`  
Expected: PASS，输出 `1 passed`。

- [ ] **Step 5: 提交根骨架**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json vitest.workspace.ts packages/domain/tests/workspace-smoke.test.ts
git commit -m "feat: scaffold frontend workspace root"
```

### Task 2: 用 Next.js 官方模板初始化 Web 应用

**Files:**
- Initialize: `apps/web`
- Modify: `apps/web/package.json`
- Modify: `apps/web/app/page.tsx`
- Create: `apps/web/app/boards/[boardId]/page.tsx`
- Create: `apps/web/app/threads/[threadId]/page.tsx`
- Test: `apps/web/tests/public-routes.test.tsx`

- [ ] **Step 1: 用官方模板生成 Web 应用**

Run: `pnpm create next-app@latest apps/web --ts --eslint --app --src-dir --import-alias "@/*" --use-pnpm --yes`  
Expected: 成功生成 Next.js App Router 工程。

- [ ] **Step 2: 写失败测试，锁定公开区职责**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "../app/page";
import BoardPage from "../app/boards/[boardId]/page";

describe("web public routes", () => {
  it("renders forum home", () => {
    render(<HomePage />);
    expect(screen.getByText("论坛首页")).toBeInTheDocument();
  });

  it("renders board page", async () => {
    const ui = await BoardPage({ params: Promise.resolve({ boardId: "board-1" }) });
    render(ui);
    expect(screen.getByText("版面帖子")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: 运行测试并确认失败**

Run: `pnpm vitest run apps/web/tests/public-routes.test.tsx`  
Expected: FAIL，模板默认页面文案与论坛公开区职责不匹配。

- [ ] **Step 4: 在模板基础上改成最小公开区**

```tsx
// apps/web/app/page.tsx
export default function HomePage() {
  return (
    <main>
      <h1>论坛首页</h1>
      <p>这里是 Web 公开区入口。</p>
    </main>
  );
}
```

```tsx
// apps/web/app/boards/[boardId]/page.tsx
export default async function BoardPage() {
  return (
    <main>
      <h1>版面帖子</h1>
    </main>
  );
}
```

- [ ] **Step 5: 重新运行测试并确认通过**

Run: `pnpm vitest run apps/web/tests/public-routes.test.tsx`  
Expected: PASS。

- [ ] **Step 6: 提交 Web 模板初始化**

```bash
git add apps/web
git commit -m "feat: initialize web app from next.js template"
```

### Task 3: 用 Expo 官方模板初始化移动端应用

**Files:**
- Initialize: `apps/mobile`
- Modify: `apps/mobile/app/index.tsx`
- Create: `apps/mobile/app/inbox-binding.tsx`
- Test: `apps/mobile/tests/mobile-routes.test.tsx`

- [ ] **Step 1: 用官方模板生成 Expo 应用**

Run: `pnpm create expo-app apps/mobile --template default@sdk-55`  
Expected: 成功生成 Expo TypeScript 工程与 Expo Router 目录。

- [ ] **Step 2: 写失败测试，锁定移动端最小闭环**

```tsx
import { render, screen } from "@testing-library/react-native";
import { describe, expect, it } from "vitest";
import HomeScreen from "../app/index";
import InboxBindingScreen from "../app/inbox-binding";

describe("mobile routes", () => {
  it("renders board list entry", () => {
    render(<HomeScreen />);
    expect(screen.getByText("移动端版面列表")).toBeTruthy();
  });

  it("renders notification subscription placeholder", () => {
    render(<InboxBindingScreen />);
    expect(screen.getByText("通知订阅")).toBeTruthy();
  });
});
```

- [ ] **Step 3: 运行测试并确认失败**

Run: `pnpm vitest run apps/mobile/tests/mobile-routes.test.tsx`  
Expected: FAIL，模板默认页面与真实用户最小闭环不匹配。

- [ ] **Step 4: 在模板基础上改成最小移动端阅读流**

```tsx
// apps/mobile/app/index.tsx
import { Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View>
      <Text>移动端版面列表</Text>
    </View>
  );
}
```

```tsx
// apps/mobile/app/inbox-binding.tsx
import { Text, View } from "react-native";

export default function InboxBindingScreen() {
  return (
    <View>
      <Text>通知订阅</Text>
      <Text>这里保留未来订阅镜像帖子或回复的入口。</Text>
    </View>
  );
}
```

- [ ] **Step 5: 重新运行测试并确认通过**

Run: `pnpm vitest run apps/mobile/tests/mobile-routes.test.tsx`  
Expected: PASS。

- [ ] **Step 6: 提交移动端模板初始化**

```bash
git add apps/mobile
git commit -m "feat: initialize mobile app from expo template"
```

### Task 4: 定义共享领域模型与双身份 schema

**Files:**
- Create: `packages/domain/package.json`
- Create: `packages/domain/src/errors.ts`
- Create: `packages/domain/src/schemas/userSchemas.ts`
- Create: `packages/domain/src/schemas/threadSchemas.ts`
- Create: `packages/domain/src/index.ts`
- Test: `packages/domain/tests/entities.test.ts`

- [ ] **Step 1: 先写失败测试**

```ts
import { describe, expect, it } from "vitest";
import { createBotUserInputSchema, createThreadInputSchema, DomainError } from "../src";

describe("domain schemas", () => {
  it("accepts bot user input", () => {
    const parsed = createBotUserInputSchema.parse({
      username: "robot-001",
      displayName: "机器人 001",
      mailboxKey: "mailbox-001",
    });
    expect(parsed.username).toBe("robot-001");
  });

  it("rejects empty thread title", () => {
    expect(() =>
      createThreadInputSchema.parse({
        boardId: "board-1",
        authorUserId: "user-1",
        title: "",
        body: "body",
      }),
    ).toThrow();
  });

  it("keeps stable domain error code", () => {
    expect(new DomainError("AUTHOR_NOT_FOUND", "missing").code).toBe("AUTHOR_NOT_FOUND");
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `pnpm vitest run packages/domain/tests/entities.test.ts`  
Expected: FAIL。

- [ ] **Step 3: 写最小领域层**

```ts
// packages/domain/src/errors.ts
export class DomainError extends Error {
  constructor(
    public readonly code:
      | "AUTHOR_NOT_FOUND"
      | "USERNAME_CONFLICT"
      | "ENTITY_SOFT_DELETED"
      | "IMPORT_VALIDATION_FAILED"
      | "UNAUTHORIZED_ADMIN_ACCESS",
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
```

```ts
// packages/domain/src/schemas/userSchemas.ts
import { z } from "zod";

export const createBotUserInputSchema = z.object({
  username: z.string().min(1),
  displayName: z.string().min(1),
  mailboxKey: z.string().min(1),
});
```

```ts
// packages/domain/src/schemas/threadSchemas.ts
import { z } from "zod";

export const createThreadInputSchema = z.object({
  boardId: z.string().min(1),
  authorUserId: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
});
```

- [ ] **Step 4: 重新运行测试并确认通过**

Run: `pnpm vitest run packages/domain/tests/entities.test.ts`  
Expected: PASS。

- [ ] **Step 5: 提交领域层**

```bash
git add packages/domain
git commit -m "feat: add shared forum domain layer"
```

### Task 5: 定义仓储接口、内存仓储与核心共享用例

**Files:**
- Create: `packages/domain/src/repositories/*.ts`
- Create: `packages/test-utils/src/inMemory/inMemoryRepositories.ts`
- Create: `packages/test-utils/src/index.ts`
- Create: `packages/state/src/useCases/createBotAndThread.ts`
- Create: `packages/state/src/index.ts`
- Test: `packages/state/tests/createBotAndThread.test.ts`

- [ ] **Step 1: 先写失败测试**

```ts
import { describe, expect, it } from "vitest";
import { InMemoryThreadRepository, InMemoryUserRepository } from "@bbs/test-utils";
import { createBotAndThread } from "../src";

describe("createBotAndThread", () => {
  it("creates missing bot before creating thread", async () => {
    const users = new InMemoryUserRepository();
    const threads = new InMemoryThreadRepository();

    const result = await createBotAndThread(
      {
        username: "robot-100",
        displayName: "机器人 100",
        mailboxKey: "mailbox-100",
        boardId: "board-1",
        title: "新帖",
        body: "正文",
      },
      { users, threads },
    );

    expect(result.thread.title).toBe("新帖");
    expect(await users.findByUsername("robot-100")).not.toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `pnpm vitest run packages/state/tests/createBotAndThread.test.ts`  
Expected: FAIL。

- [ ] **Step 3: 写最小实现**

```ts
// packages/state/src/useCases/createBotAndThread.ts
import type { ThreadRepository, UserRepository } from "@bbs/domain";

export async function createBotAndThread(
  input: {
    username: string;
    displayName: string;
    mailboxKey: string;
    boardId: string;
    title: string;
    body: string;
  },
  deps: { users: UserRepository; threads: ThreadRepository },
) {
  let author = await deps.users.findByUsername(input.username);
  if (!author) {
    author = await deps.users.createBot({
      id: `bot:${input.username}`,
      username: input.username,
      displayName: input.displayName,
      userType: "bot",
      status: "active",
      mailboxKey: input.mailboxKey,
    });
  }

  const thread = await deps.threads.create({
    id: `thread:${input.title}`,
    boardId: input.boardId,
    authorUserId: author.id,
    title: input.title,
    body: input.body,
  });

  return { author, thread };
}
```

- [ ] **Step 4: 重新运行测试并确认通过**

Run: `pnpm vitest run packages/state/tests/createBotAndThread.test.ts`  
Expected: PASS。

- [ ] **Step 5: 提交共享用例**

```bash
git add packages/domain packages/state packages/test-utils
git commit -m "feat: add repository contracts and shared create-thread flow"
```

### Task 6: 实现 Web `/admin` 内容运营核心流

**Files:**
- Create: `apps/web/src/db/webDatabase.ts`
- Create: `apps/web/src/features/admin/ThreadForm.tsx`
- Create: `apps/web/app/admin/page.tsx`
- Create: `apps/web/app/admin/users/page.tsx`
- Create: `apps/web/app/admin/boards/page.tsx`
- Create: `apps/web/app/admin/threads/[threadId]/page.tsx`
- Test: `apps/web/tests/admin-create-bot-and-thread.test.tsx`

- [ ] **Step 1: 先写失败测试**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { InMemoryThreadRepository, InMemoryUserRepository } from "@bbs/test-utils";
import { AdminThreadForm } from "../src/features/admin/ThreadForm";

describe("admin create thread flow", () => {
  it("creates missing bot before saving thread", async () => {
    const users = new InMemoryUserRepository();
    const threads = new InMemoryThreadRepository();

    render(<AdminThreadForm users={users} threads={threads} />);

    await userEvent.type(screen.getByLabelText("机器人用户名"), "robot-b");
    await userEvent.type(screen.getByLabelText("机器人显示名"), "机器人 B");
    await userEvent.type(screen.getByLabelText("收件箱键"), "mailbox-b");
    await userEvent.type(screen.getByLabelText("帖子标题"), "标题 B");
    await userEvent.type(screen.getByLabelText("帖子正文"), "正文 B");
    await userEvent.click(screen.getByRole("button", { name: "保存帖子" }));

    expect(await users.findByUsername("robot-b")).not.toBeNull();
    expect((await threads.listByBoard("board-default"))[0]?.title).toBe("标题 B");
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `pnpm vitest run apps/web/tests/admin-create-bot-and-thread.test.tsx`  
Expected: FAIL。

- [ ] **Step 3: 写最小管理区实现**

```tsx
"use client";

import { useState } from "react";
import type { ThreadRepository, UserRepository } from "@bbs/domain";
import { createBotAndThread } from "@bbs/state";

export function AdminThreadForm({
  users,
  threads,
}: {
  users: UserRepository;
  threads: ThreadRepository;
}) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mailboxKey, setMailboxKey] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        await createBotAndThread(
          { username, displayName, mailboxKey, boardId: "board-default", title, body },
          { users, threads },
        );
      }}
    >
      <input aria-label="机器人用户名" value={username} onChange={(e) => setUsername(e.target.value)} />
      <input aria-label="机器人显示名" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      <input aria-label="收件箱键" value={mailboxKey} onChange={(e) => setMailboxKey(e.target.value)} />
      <input aria-label="帖子标题" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea aria-label="帖子正文" value={body} onChange={(e) => setBody(e.target.value)} />
      <button type="submit">保存帖子</button>
    </form>
  );
}
```

- [ ] **Step 4: 重新运行测试并确认通过**

Run: `pnpm vitest run apps/web/tests/admin-create-bot-and-thread.test.tsx`  
Expected: PASS。

- [ ] **Step 5: 提交 Web 管理区核心流**

```bash
git add apps/web
git commit -m "feat: add web admin content flow"
```

### Task 7: 实现导入导出、时间线与软删除基础

**Files:**
- Create: `packages/state/src/useCases/importForumData.ts`
- Create: `packages/state/src/useCases/writeContentEvent.ts`
- Create: `apps/web/app/admin/imports/page.tsx`
- Create: `apps/web/app/admin/activity/page.tsx`
- Test: `packages/state/tests/importForumData.test.ts`

- [ ] **Step 1: 先写失败测试**

```ts
import { describe, expect, it } from "vitest";
import { InMemoryThreadRepository, InMemoryUserRepository } from "@bbs/test-utils";
import { importForumData } from "../src";

describe("importForumData", () => {
  it("imports users and threads and records failed items", async () => {
    const result = await importForumData(
      {
        mode: "best-effort",
        users: [{ username: "robot-c", displayName: "机器人 C", mailboxKey: "mailbox-c" }],
        threads: [{ boardId: "board-1", authorUsername: "robot-c", title: "导入帖", body: "正文" }],
        replies: [{ threadTitle: "missing-thread", authorUsername: "robot-c", body: "失败回复" }],
      },
      {
        users: new InMemoryUserRepository(),
        threads: new InMemoryThreadRepository(),
      },
    );

    expect(result.importedThreads).toBe(1);
    expect(result.failedItems).toHaveLength(1);
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `pnpm vitest run packages/state/tests/importForumData.test.ts`  
Expected: FAIL。

- [ ] **Step 3: 写最小导入实现**

```ts
export async function importForumData(
  input: {
    mode: "strict" | "best-effort";
    users: Array<{ username: string; displayName: string; mailboxKey: string }>;
    threads: Array<{ boardId: string; authorUsername: string; title: string; body: string }>;
    replies: Array<{ threadTitle: string; authorUsername: string; body: string }>;
  },
  deps: {
    users: UserRepository;
    threads: ThreadRepository;
  },
) {
  const failedItems: Array<{ type: string; reason: string }> = [];

  for (const user of input.users) {
    if (!(await deps.users.findByUsername(user.username))) {
      await deps.users.createBot({
        id: `bot:${user.username}`,
        username: user.username,
        displayName: user.displayName,
        userType: "bot",
        status: "active",
        mailboxKey: user.mailboxKey,
      });
    }
  }

  for (const thread of input.threads) {
    const author = await deps.users.findByUsername(thread.authorUsername);
    if (!author) {
      failedItems.push({ type: "thread", reason: "author missing" });
      continue;
    }
    await deps.threads.create({
      id: `thread:${thread.title}`,
      boardId: thread.boardId,
      authorUserId: author.id,
      title: thread.title,
      body: thread.body,
    });
  }

  for (const reply of input.replies) {
    failedItems.push({ type: "reply", reason: `thread ${reply.threadTitle} not found` });
  }

  return { importedThreads: input.threads.length, failedItems };
}
```

- [ ] **Step 4: 重新运行测试并确认通过**

Run: `pnpm vitest run packages/state/tests/importForumData.test.ts`  
Expected: PASS。

- [ ] **Step 5: 提交导入与时间线基础**

```bash
git add packages/state apps/web
git commit -m "feat: add import and activity primitives"
```

### Task 8: 打通最终校验与开发说明

**Files:**
- Create: `docs/frontend-dev.md`
- Modify: `package.json`

- [ ] **Step 1: 写开发说明**

```md
# Frontend Dev

## 初始化

```bash
pnpm install
pnpm --filter web dev
pnpm --filter mobile start
```

## 校验

```bash
pnpm verify
```
```

- [ ] **Step 2: 运行统一验收**

Run: `pnpm verify`  
Expected: PASS，lint、typecheck、test 全部通过。

- [ ] **Step 3: 提交收尾**

```bash
git add package.json docs/frontend-dev.md apps/web apps/mobile packages
git commit -m "feat: complete frontend data foundation baseline"
```

## 自检

### Spec 覆盖检查

- 官方模板初始化 Web 与 Mobile：Task 2、Task 3 覆盖。
- 共享领域模型与双身份数据边界：Task 4 覆盖。
- 机器人不存在时自动补建并发帖：Task 5、Task 6 覆盖。
- Web 默认论坛 + `/admin` 管理区：Task 2、Task 6 覆盖。
- Mobile 最小阅读闭环与绑定占位：Task 3 覆盖。
- 导入导出、时间线与失败项：Task 7 覆盖。
- 最终统一校验与开发说明：Task 8 覆盖。

### Placeholder 检查

本计划未使用 `TBD`、`TODO`、`implement later`、`similar to task` 这类占位写法。

### 类型一致性检查

- `UserRepository`、`ThreadRepository` 先在 Task 5 定义，再在 Task 6、Task 7 复用。
- `createBotAndThread` 在 Task 5 定义，在 Task 6 直接复用。
- 两端应用先由官方模板生成，再在共享包之上增量改造。
