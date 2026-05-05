# 首页全量板块目录与分区导入页 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `/admin/imports` 展示按首页分区固化的全部 BYR 板块目录，支持分区级选择后继续复用现有批量全量抓取总任务。

**Architecture:** 以 `boardCatalogSections` 作为新的板块事实源，严格保留首页分区顺序和分区内顺序，再派生现有运行时继续使用的平铺 `boardCatalog`。页面直接消费分区树渲染分组 UI，scheduler、registry、batch runner 继续消费平铺列表，从而在不重写任务链路的前提下扩充到全量目录。

**Tech Stack:** Next.js 16, TypeScript, Prisma, Vitest, FastAPI, Python 3.12, pytest, BeautifulSoup

---

## Scope Check

这份 spec 虽然同时涉及目录结构、后端一次性首页抓取、Admin 分区交互和运行时派生，但它们都服务同一个功能闭环：“把只显示两个板块的目录补全为首页全量目录，并接回现有批量总任务模型”。不需要再拆成多个独立计划。

## File Structure

### Files to Create

- `docs/superpowers/plans/2026-05-05-full-homepage-board-catalog-and-grouped-imports-implementation-plan.md`
  - 本计划文件。
- `backend/src/byr_boards/homepage_models.py`
  - 首页分区目录抓取结果的数据模型，仅服务一次性目录采集与测试。
- `backend/src/byr_boards/homepage_parser.py`
  - 解析 BYR 首页分区与板块入口，提取分区顺序、板块名和链接。
- `backend/tests/unit/byr_boards/test_homepage_parser.py`
  - 覆盖首页分区与板块目录解析。
- `apps/web/tests/server/boardCatalogSections.test.ts`
  - 覆盖分区树事实源与平铺派生顺序。

### Files to Modify

- `apps/web/src/server/boardSync/boardCatalog.ts`
  - 从平铺数组升级为 `boardCatalogSections + boardCatalog` 双导出，事实源改为分区树。
- `apps/web/src/server/boardSync/boardRegistry.ts`
  - 改为消费派生后的平铺 `boardCatalog`，不再假设目录天生是平铺常量。
- `apps/web/src/server/boardSync/resolveBoardIdentity.ts`
  - 继续从新的平铺 `boardCatalog` 做 canonical board name / slug 解析。
- `apps/web/src/server/scheduler/taskRegistry.ts`
  - 继续只从 `scheduledSyncEnabled = true` 的平铺板块派生定时任务。
- `apps/web/app/admin/imports/page.tsx`
  - 从单层复选框列表改成按分区分组展示，默认不勾选，分区内支持全选/取消全选。
- `apps/web/tests/admin-imports-page.test.tsx`
  - 更新页面断言：按分区渲染、默认不勾选、分区操作按钮存在、辅助文案正确。
- `apps/web/tests/server/boardCatalog.test.ts`
  - 从“只断言两个板块”改为断言分区树派生和平铺顺序规则。
- `apps/web/tests/server/boardRegistry.test.ts`
  - 更新为消费派生平铺目录。
- `apps/web/tests/server/listScheduledTasks.test.ts`
  - 锁住“全量目录存在，但只对白名单板块派生定时任务”。
- `apps/web/tests/server/webScheduler.test.ts`
  - 锁住 scheduler 只注册显式启用的白名单板块。
- `apps/web/tests/admin-import-job-routes.test.ts`
  - 更新批量创建路由的目录顺序来源，从新的平铺派生目录断言。
- `apps/web/tests/server/boardBatchFullSyncRunner.test.ts`
  - 锁住批量 runner 仍按派生平铺顺序执行。
- `apps/web/tests/server/listRecentImportActivity.test.ts`
  - 如需，更新依赖的目录样例以兼容新事实源。
- `apps/web/README.md`
  - 说明目录现已固化为首页分区树，普通板块默认定时关闭。

### Files to Inspect During Implementation

- `backend/src/byr_boards/parser.py`
  - 参考现有板块页 parser 的 HTML 解析风格和测试组织方式。
- `backend/src/byr_boards/service.py`
  - 参考现有登录态与页面抓取方式。
- `apps/web/app/admin/api/import-jobs/byr-board-full-sync-batch/route.ts`
  - 继续复用，不需要改任务模型，只要确认它按新的平铺目录顺序排序。
- `apps/web/src/server/imports/boardBatchFullSyncRunner.ts`
  - 继续复用，只要确认它依赖的目录顺序仍正确。

## Plan

### Task 1: 先为 BYR 首页分区目录抓取补 parser 和测试

**Files:**
- Create: `backend/src/byr_boards/homepage_models.py`
- Create: `backend/src/byr_boards/homepage_parser.py`
- Create: `backend/tests/unit/byr_boards/test_homepage_parser.py`
- Inspect: `backend/src/byr_boards/parser.py`
- Inspect: `backend/tests/unit/byr_boards/test_parser.py`

- [ ] **Step 1: Write the failing homepage parser tests**

```python
from pathlib import Path

from byr_boards.homepage_parser import parse_homepage_board_catalog


def load_fixture(name: str) -> str:
    return (
        Path(__file__).resolve().parents[2]
        / "fixtures"
        / "homepage"
        / name
    ).read_text(encoding="utf-8")


def test_parse_homepage_board_catalog_extracts_sections_and_boards_in_order() -> None:
    html = load_fixture("byr_homepage.html")

    result = parse_homepage_board_catalog(html=html)

    assert len(result.sections) > 1
    assert result.sections[0].section_name != ""
    assert len(result.sections[0].boards) > 0
    assert result.sections[0].boards[0].board_name != ""
    assert result.sections[0].boards[0].board_path.startswith("/board/")


def test_parse_homepage_board_catalog_ignores_non_board_links() -> None:
    html = """
    <html>
      <body>
        <div class="forum-section">
          <h2>测试分区</h2>
          <a href="/board/IWhisper">IWhisper</a>
          <a href="/user/login">登录</a>
          <a href="https://example.com">外链</a>
        </div>
      </body>
    </html>
    """

    result = parse_homepage_board_catalog(html=html)

    assert [board.board_name for board in result.sections[0].boards] == ["IWhisper"]
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
cd /Users/ghost/code/BBSAchieve/backend
uv run pytest tests/unit/byr_boards/test_homepage_parser.py -q
```

Expected:

- FAIL because `homepage_parser.py` and `homepage_models.py` do not exist yet.

- [ ] **Step 3: Add the minimal homepage catalog models and parser**

```python
# backend/src/byr_boards/homepage_models.py
from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class HomepageBoardEntry:
    board_name: str
    board_path: str


@dataclass(slots=True)
class HomepageBoardSection:
    section_name: str
    boards: list[HomepageBoardEntry]


@dataclass(slots=True)
class HomepageBoardCatalog:
    sections: list[HomepageBoardSection]
```

```python
# backend/src/byr_boards/homepage_parser.py
from __future__ import annotations

from urllib.parse import urlparse

from bs4 import BeautifulSoup

from .homepage_models import HomepageBoardCatalog, HomepageBoardEntry, HomepageBoardSection


def parse_homepage_board_catalog(*, html: str) -> HomepageBoardCatalog:
    soup = BeautifulSoup(html, "html.parser")
    sections: list[HomepageBoardSection] = []

    for section_node in soup.select(".forum-section, .fav-section, .board-section"):
        title_node = section_node.find(["h2", "h3", "legend", "strong"])
        section_name = title_node.get_text(" ", strip=True) if title_node else ""
        boards: list[HomepageBoardEntry] = []

        for anchor in section_node.select("a[href]"):
          href = anchor.get("href", "").strip()
          if not href.startswith("/board/"):
              continue
          board_name = anchor.get_text(" ", strip=True)
          board_path = urlparse(href).path
          if board_name == "" or board_path == "":
              continue
          boards.append(HomepageBoardEntry(board_name=board_name, board_path=board_path))

        if section_name and boards:
            sections.append(HomepageBoardSection(section_name=section_name, boards=boards))

    return HomepageBoardCatalog(sections=sections)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```bash
cd /Users/ghost/code/BBSAchieve/backend
uv run pytest tests/unit/byr_boards/test_homepage_parser.py -q
```

Expected:

- PASS with section order and board filtering locked in.

- [ ] **Step 5: Commit**

```bash
git add \
  backend/src/byr_boards/homepage_models.py \
  backend/src/byr_boards/homepage_parser.py \
  backend/tests/unit/byr_boards/test_homepage_parser.py
git commit -m "feat: 增加首页板块目录解析"
```

### Task 2: 将板块目录升级为分区树事实源并派生平铺目录

**Files:**
- Modify: `apps/web/src/server/boardSync/boardCatalog.ts`
- Modify: `apps/web/src/server/boardSync/boardRegistry.ts`
- Modify: `apps/web/src/server/boardSync/resolveBoardIdentity.ts`
- Create: `apps/web/tests/server/boardCatalogSections.test.ts`
- Modify: `apps/web/tests/server/boardCatalog.test.ts`
- Modify: `apps/web/tests/server/boardRegistry.test.ts`

- [ ] **Step 1: Write the failing tests for section-tree catalog and flat derivation**

```ts
import { describe, expect, it } from "vitest";

import {
  boardCatalog,
  boardCatalogSections,
} from "@/src/server/boardSync/boardCatalog";

describe("boardCatalog sections", () => {
  it("keeps homepage section order and derives a flat ordered board list", () => {
    expect(boardCatalogSections.length).toBeGreaterThan(1);
    expect(boardCatalogSections[0]?.sectionName).toBeTruthy();
    expect(boardCatalogSections[0]?.boards.length).toBeGreaterThan(0);
    expect(boardCatalog.length).toBeGreaterThan(boardCatalogSections.length);
    expect(boardCatalog[0]?.sectionName).toBe(boardCatalogSections[0]?.sectionName);
  });

  it("marks all catalog boards full-sync enabled but only whitelisted boards scheduled", () => {
    expect(boardCatalog.every((board) => board.fullSyncEnabled)).toBe(true);
    expect(
      boardCatalog
        .filter((board) => board.scheduledSyncEnabled)
        .map((board) => board.boardName),
    ).toEqual(["IWhisper", "JobInfo"]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
npx pnpm@10.11.0 --filter @bbs/web exec vitest run \
  tests/server/boardCatalogSections.test.ts \
  tests/server/boardCatalog.test.ts \
  tests/server/boardRegistry.test.ts
```

Expected:

- FAIL because `boardCatalogSections` does not exist and current tests still expect only two boards.

- [ ] **Step 3: Replace the flat catalog with a section-tree source plus derived flat list**

```ts
// apps/web/src/server/boardSync/boardCatalog.ts
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

export const boardCatalogSections: readonly BoardCatalogSection[] = [
  {
    sectionName: "校园生活",
    sectionSlug: "campus-life",
    boards: [
      {
        boardName: "IWhisper",
        boardSlug: "iwhisper",
        title: "IWhisper 全量与定时同步",
        description: "悄悄话板块，支持全量和定时同步。",
        fullSyncEnabled: true,
        fullSyncWindowMinutes: 60 * 24 * 365 * 10,
        scheduledSyncEnabled: true,
        scheduledIntervalMinutes: 20,
        scheduledWindowMinutes: 30,
      },
    ],
  },
  {
    sectionName: "求职实习",
    sectionSlug: "jobs-and-internships",
    boards: [
      {
        boardName: "JobInfo",
        boardSlug: "job-info",
        title: "JobInfo 全量与定时同步",
        description: "管理员手动全量抓取 JobInfo，并按固定间隔同步最近内容。",
        fullSyncEnabled: true,
        fullSyncWindowMinutes: 60 * 24 * 365 * 10,
        scheduledSyncEnabled: true,
        scheduledIntervalMinutes: 120,
        scheduledWindowMinutes: 180,
      },
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
```

Implementation note:

- Replace the sample two-section content above with the actual homepage-derived full catalog before committing.
- Keep the real catalog in the exact homepage section order and intra-section board order captured during implementation.

- [ ] **Step 4: Update registry and identity resolution to consume the derived flat list**

```ts
// apps/web/src/server/boardSync/boardRegistry.ts
import { boardCatalog, type BoardCatalogEntry } from "./boardCatalog";

export type BoardSyncDefinition = BoardCatalogEntry;
export const boardSyncBoards: readonly BoardSyncDefinition[] = boardCatalog;
```

```ts
// apps/web/src/server/boardSync/resolveBoardIdentity.ts
import { boardCatalog } from "./boardCatalog";

export function resolveBoardIdentity(boardNameOrSlug: string) {
  const trimmed = boardNameOrSlug.trim();
  const matchedBoard =
    boardCatalog.find((board) => board.boardName === trimmed) ??
    boardCatalog.find((board) => board.boardSlug === trimmed);

  if (matchedBoard) {
    return {
      name: matchedBoard.boardName,
      slug: matchedBoard.boardSlug,
    };
  }

  return {
    name: trimmed,
    slug: trimmed.trim().toLowerCase(),
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
npx pnpm@10.11.0 --filter @bbs/web exec vitest run \
  tests/server/boardCatalogSections.test.ts \
  tests/server/boardCatalog.test.ts \
  tests/server/boardRegistry.test.ts
```

Expected:

- PASS with the new section-tree source and flat derivation locked in.

- [ ] **Step 6: Commit**

```bash
git add \
  apps/web/src/server/boardSync/boardCatalog.ts \
  apps/web/src/server/boardSync/boardRegistry.ts \
  apps/web/src/server/boardSync/resolveBoardIdentity.ts \
  apps/web/tests/server/boardCatalogSections.test.ts \
  apps/web/tests/server/boardCatalog.test.ts \
  apps/web/tests/server/boardRegistry.test.ts
git commit -m "feat: 将板块目录升级为分区树"
```

### Task 3: 调整 scheduler 和批量链路，确保仍从平铺目录有序派生

**Files:**
- Modify: `apps/web/src/server/scheduler/taskRegistry.ts`
- Modify: `apps/web/tests/server/listScheduledTasks.test.ts`
- Modify: `apps/web/tests/server/webScheduler.test.ts`
- Modify: `apps/web/tests/admin-import-job-routes.test.ts`
- Modify: `apps/web/tests/server/boardBatchFullSyncRunner.test.ts`

- [ ] **Step 1: Write the failing tests for derived scheduling and batch ordering**

```ts
import { describe, expect, it } from "vitest";

import { boardCatalog } from "@/src/server/boardSync/boardCatalog";
import { scheduledTasks } from "@/src/server/scheduler/taskRegistry";

describe("taskRegistry from derived catalog", () => {
  it("only includes boards explicitly enabled for scheduled sync", () => {
    expect(scheduledTasks.map((task) => task.boardName)).toEqual(
      boardCatalog.filter((board) => board.scheduledSyncEnabled).map((board) => board.boardName),
    );
  });
});
```

Implementation note:

- Update the existing batch route and runner tests so they build expected ordering from `boardCatalog.map((board) => board.boardName)` rather than hard-coding just two names.

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
npx pnpm@10.11.0 --filter @bbs/web exec vitest run \
  tests/server/listScheduledTasks.test.ts \
  tests/server/webScheduler.test.ts \
  tests/admin-import-job-routes.test.ts \
  tests/server/boardBatchFullSyncRunner.test.ts
```

Expected:

- FAIL because the old assumptions about catalog shape and fixed board list are stale.

- [ ] **Step 3: Update scheduler and ordering assertions to use the derived flat catalog**

```ts
// apps/web/src/server/scheduler/taskRegistry.ts
import {
  getScheduledBoardTasks,
  type DerivedScheduledBoardTask,
} from "@/src/server/boardSync/boardRegistry";

export type ScheduledTaskDefinition = DerivedScheduledBoardTask;

export const scheduledTasks: readonly ScheduledTaskDefinition[] = getScheduledBoardTasks();
```

Implementation note:

- Keep the production logic simple here.
- Do not add section-aware scheduling.
- Only refresh tests and route expectations to follow the derived flat ordering.

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
npx pnpm@10.11.0 --filter @bbs/web exec vitest run \
  tests/server/listScheduledTasks.test.ts \
  tests/server/webScheduler.test.ts \
  tests/admin-import-job-routes.test.ts \
  tests/server/boardBatchFullSyncRunner.test.ts
```

Expected:

- PASS and the batch pipeline still respects the derived flat order.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/web/src/server/scheduler/taskRegistry.ts \
  apps/web/tests/server/listScheduledTasks.test.ts \
  apps/web/tests/server/webScheduler.test.ts \
  apps/web/tests/admin-import-job-routes.test.ts \
  apps/web/tests/server/boardBatchFullSyncRunner.test.ts
git commit -m "refactor: 让调度与批量链路消费派生目录"
```

### Task 4: 将 `/admin/imports` 改成按分区分组的导入页

**Files:**
- Modify: `apps/web/app/admin/imports/page.tsx`
- Modify: `apps/web/tests/admin-imports-page.test.tsx`

- [ ] **Step 1: Write the failing UI test for grouped sections and unchecked defaults**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

it("renders grouped homepage sections with unchecked board checkboxes", async () => {
  render(await AdminImportsPage());

  expect(screen.getByText("选择要全量抓取的板块")).toBeTruthy();
  expect(screen.getByText("校园生活")).toBeTruthy();
  expect(screen.getByText("求职实习")).toBeTruthy();

  const iwhisperCheckbox = screen.getByRole("checkbox", { name: "IWhisper" });
  expect(iwhisperCheckbox).not.toBeChecked();
  expect(screen.getByRole("button", { name: "全选本分区" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "取消本分区" })).toBeTruthy();
  expect(screen.getByText("以下目录来自首页固化板块清单")).toBeTruthy();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
npx pnpm@10.11.0 --filter @bbs/web exec vitest run tests/admin-imports-page.test.tsx
```

Expected:

- FAIL because the page still renders a single flat list with `defaultChecked`.

- [ ] **Step 3: Implement grouped sections with unchecked defaults and section actions**

```tsx
// apps/web/app/admin/imports/page.tsx
import { boardCatalogSections, boardCatalog } from "@/src/server/boardSync/boardCatalog";

// inside the form
<p className="text-sm text-zinc-500">以下目录来自首页固化板块清单</p>
{boardCatalogSections.map((section) => (
  <section key={section.sectionSlug} className="rounded-xl border border-zinc-200 p-4">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-medium text-zinc-900">{section.sectionName}</h3>
      <div className="flex gap-2">
        <button type="button" data-section-action="select" data-section-slug={section.sectionSlug}>
          全选本分区
        </button>
        <button type="button" data-section-action="clear" data-section-slug={section.sectionSlug}>
          取消本分区
        </button>
      </div>
    </div>
    <div className="mt-3 grid gap-3">
      {section.boards
        .filter((board) => board.fullSyncEnabled)
        .map((board) => (
          <label key={board.boardSlug} className="flex items-start gap-3 rounded-lg border px-3 py-2">
            <input type="checkbox" name="boardNames" value={board.boardName} />
            <span className="grid gap-1">
              <span className="font-medium">{board.boardName}</span>
              <span className="text-zinc-500">{board.description}</span>
            </span>
          </label>
        ))}
    </div>
  </section>
))}
<p className="mt-3 text-sm text-zinc-500">
  只会抓取已勾选板块，执行顺序按首页目录顺序。
</p>
<p className="mt-1 text-sm text-zinc-500">
  当前将按首页目录顺序串行抓取：{boardCatalog.map((board) => board.boardName).join("、")}
</p>
```

Implementation note:

- If the existing page is still a server component, move the section toggle behavior into a small client subcomponent such as `apps/web/app/admin/imports/BoardSectionSelector.tsx`.
- Keep the rest of the page server-rendered.

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
npx pnpm@10.11.0 --filter @bbs/web exec vitest run tests/admin-imports-page.test.tsx
```

Expected:

- PASS with grouped rendering and unchecked defaults.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/web/app/admin/imports/page.tsx \
  apps/web/tests/admin-imports-page.test.tsx
git commit -m "feat: 按分区展示导入页板块目录"
```

### Task 5: 用真实首页目录结果填满 `boardCatalog.ts`

**Files:**
- Modify: `apps/web/src/server/boardSync/boardCatalog.ts`
- Inspect: `backend/src/byr_auth/client.py`
- Inspect: `backend/src/byr_boards/homepage_parser.py`

- [ ] **Step 1: Capture the real homepage catalog once using the new parser**

Run:

```bash
cd /Users/ghost/code/BBSAchieve/backend
uv run python - <<'PY'
from byr_auth.client import ByrAuthClient
from byr_boards.homepage_parser import parse_homepage_board_catalog

with ByrAuthClient().open_authenticated_client() as auth:
    response = auth.client.get(f"/?_uid={auth.session.user_id}")
    response.raise_for_status()
    html = ByrAuthClient._decode_text(response)

catalog = parse_homepage_board_catalog(html=html)

for section in catalog.sections:
    print(section.section_name)
    for board in section.boards:
        print(f"  {board.board_name} {board.board_path}")
PY
```

Expected:

- A complete ordered section/board dump from the live BYR homepage.

- [ ] **Step 2: Replace the sample section data in `boardCatalog.ts` with the real captured catalog**

```ts
// apps/web/src/server/boardSync/boardCatalog.ts
export const boardCatalogSections: readonly BoardCatalogSection[] = [
  {
    sectionName: "实际首页分区名",
    sectionSlug: "actual-section-slug",
    boards: [
      {
        boardName: "实际板块名",
        boardSlug: "actual-board-slug",
        title: "实际板块名 全量与定时同步",
        description: "管理员可手动全量抓取 实际板块名，定时任务默认关闭。",
        fullSyncEnabled: true,
        fullSyncWindowMinutes: 60 * 24 * 365 * 10,
        scheduledSyncEnabled: false,
        scheduledIntervalMinutes: 120,
        scheduledWindowMinutes: 180,
      },
    ],
  },
];
```

Implementation note:

- Keep `IWhisper` and `JobInfo` as explicit overrides with their current tuned descriptions and white-listed scheduling values.
- All other boards should use the default full-sync and default disabled scheduling values from the spec.
- Do not keep the capture script in the repo after this step; only the final catalog data stays.

- [ ] **Step 3: Run the catalog-focused tests to verify the real data still satisfies the invariants**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
npx pnpm@10.11.0 --filter @bbs/web exec vitest run \
  tests/server/boardCatalogSections.test.ts \
  tests/server/boardCatalog.test.ts \
  tests/server/boardRegistry.test.ts \
  tests/server/listScheduledTasks.test.ts \
  tests/server/webScheduler.test.ts
```

Expected:

- PASS with the real homepage-derived catalog in place.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/server/boardSync/boardCatalog.ts
git commit -m "feat: 固化首页全量板块目录"
```

### Task 6: 全量回归并更新文档

**Files:**
- Modify: `apps/web/README.md`
- Verify: `apps/web/tests/admin-import-job-routes.test.ts`
- Verify: `apps/web/tests/admin-imports-page.test.tsx`
- Verify: `apps/web/tests/admin-imports-route.test.ts`
- Verify: `apps/web/tests/server/boardCatalogSections.test.ts`
- Verify: `apps/web/tests/server/boardCatalog.test.ts`
- Verify: `apps/web/tests/server/boardRegistry.test.ts`
- Verify: `apps/web/tests/server/boardBatchFullSyncRunner.test.ts`
- Verify: `apps/web/tests/server/listRecentImportActivity.test.ts`
- Verify: `apps/web/tests/server/listScheduledTasks.test.ts`
- Verify: `apps/web/tests/server/webScheduler.test.ts`
- Verify: `backend/tests/unit/byr_boards/test_parser.py`
- Verify: `backend/tests/unit/byr_boards/test_homepage_parser.py`

- [ ] **Step 1: Update README copy to explain the new grouped homepage catalog**

```md
## Admin 导入入口

- `/admin/imports` 现在展示按首页分区固化的全部板块目录。
- 所有板块默认允许手动全量抓取。
- 普通板块默认 `scheduledSyncEnabled = false`，只有白名单板块会派生定时任务。
- 批量全量抓取仍然创建一条总任务，按目录顺序串行执行。
```

- [ ] **Step 2: Run web typecheck**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
npx pnpm@10.11.0 --filter @bbs/web typecheck
```

Expected:

- PASS with no TypeScript errors.

- [ ] **Step 3: Run the focused web test suite**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
npx pnpm@10.11.0 --filter @bbs/web exec vitest run \
  tests/admin-import-job-routes.test.ts \
  tests/admin-imports-page.test.tsx \
  tests/admin-imports-route.test.ts \
  tests/server/boardCatalogSections.test.ts \
  tests/server/boardCatalog.test.ts \
  tests/server/boardRegistry.test.ts \
  tests/server/boardBatchFullSyncRunner.test.ts \
  tests/server/listRecentImportActivity.test.ts \
  tests/server/listScheduledTasks.test.ts \
  tests/server/webScheduler.test.ts
```

Expected:

- PASS and `/admin/imports` works with the full grouped catalog while the batch pipeline remains stable.

- [ ] **Step 4: Run the focused backend parser tests**

Run:

```bash
cd /Users/ghost/code/BBSAchieve/backend
uv run pytest \
  tests/unit/byr_boards/test_parser.py \
  tests/unit/byr_boards/test_homepage_parser.py -q
```

Expected:

- PASS and the homepage parser stays isolated from the existing board-page parser.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/web/README.md \
  apps/web/tests/admin-import-job-routes.test.ts \
  apps/web/tests/admin-imports-page.test.tsx \
  apps/web/tests/admin-imports-route.test.ts \
  apps/web/tests/server/boardCatalogSections.test.ts \
  apps/web/tests/server/boardCatalog.test.ts \
  apps/web/tests/server/boardRegistry.test.ts \
  apps/web/tests/server/boardBatchFullSyncRunner.test.ts \
  apps/web/tests/server/listRecentImportActivity.test.ts \
  apps/web/tests/server/listScheduledTasks.test.ts \
  apps/web/tests/server/webScheduler.test.ts \
  backend/tests/unit/byr_boards/test_parser.py \
  backend/tests/unit/byr_boards/test_homepage_parser.py
git commit -m "docs: 更新首页板块目录与导入页说明"
```

## Self-Review

### Spec coverage

- “首页各分区下能点进去的全部版面”:
  - Task 1 建 parser
  - Task 5 用真实首页抓取结果替换样例目录
- “`boardCatalog` 以分区树结构作为事实源”:
  - Task 2
- “`/admin/imports` 按分区分组展示，不做搜索”:
  - Task 4
- “默认一个都不勾选”:
  - Task 4
- “每个分区全选 / 取消全选”:
  - Task 4
- “所有板块默认允许手动全量抓取”:
  - Task 2 / Task 5
- “所有板块都带完整调度参数，但默认 `scheduledSyncEnabled = false`”:
  - Task 2 / Task 5
- “只有白名单板块开启定时任务”:
  - Task 2 / Task 3
- “批量总任务模型保持不变，仍按目录顺序串行执行”:
  - Task 3 / Task 4 / Task 6

没有发现 spec 条目缺任务。

### Placeholder scan

- 没有使用 `TODO`、`TBD` 或“implement later”。
- 一次性抓取目录的实现步骤没有把临时脚本当成最终产物留在仓库。
- 对“真实目录内容”没有伪造完整样例，而是明确要求在 Task 5 用 live capture 替换样例数据。

### Type consistency

- 分区树事实源统一叫 `boardCatalogSections`
- 派生平铺目录统一叫 `boardCatalog`
- 运行时 registry 继续消费 `boardCatalog`
- 调度派生仍以 `scheduledSyncEnabled` 为准

命名与 spec 保持一致。
