# Frontend Dev

## 初始化

```bash
npx pnpm@10.11.0 install
```

## 启动

```bash
npx pnpm@10.11.0 --filter @bbs/web dev
npx pnpm@10.11.0 --filter @bbs/mobile start
```

## 校验

```bash
npx pnpm@10.11.0 vitest run packages/domain/tests/entities.test.ts
npx pnpm@10.11.0 vitest run packages/state/tests/createBotAndThread.test.ts packages/state/tests/importForumData.test.ts packages/state/tests/getBoardSummaries.test.ts packages/state/tests/getBoardDetail.test.ts packages/state/tests/getThreadDetail.test.ts
npx pnpm@10.11.0 vitest run apps/web/tests/public-routes.test.tsx apps/web/tests/admin-create-bot-and-thread.test.tsx
npx pnpm@10.11.0 --filter @bbs/web typecheck
npx pnpm@10.11.0 --filter @bbs/web build
npx pnpm@10.11.0 --filter @bbs/mobile exec jest __tests__/mobile-routes.test.tsx --runInBand
npx pnpm@10.11.0 --filter @bbs/mobile typecheck
npx pnpm@10.11.0 --filter @bbs/mobile exec tsc --noEmit -p tsconfig.test.json
```

## 当前范围

- Web 公开区只读阅读链路
- Web `/admin` 内容运营骨架
- Mobile 最小只读阅读链路与通知/绑定占位
- 共享领域模型、仓储接口、读取用例与本地运行时装配
