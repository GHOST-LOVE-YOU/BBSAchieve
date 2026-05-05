# 首页全量板块目录与分区导入页设计

## 概述

这份设计用于补全当前批量全量抓取方案里的最后一块缺口。

`main` 上已经有：

- `/admin/imports` 的多选批量全量抓取入口
- 一条批量全量抓取总任务
- 串行执行、失败即停、从失败板块恢复

但当前首页板块目录只固化了两个手工条目：

- `IWhisper`
- `JobInfo`

因此管理员页面虽然已经是“多选批量抓取”形态，但实际只能看到两个板块。这不符合“先抓一次首页全部板块，再固化成代码目录”的目标。

这份设计的目标是：

1. 抓取 BYR 首页各分区下可点击进入的全部板块。
2. 将抓到的板块目录按首页顺序固化进代码。
3. 将固化目录升级为“分区树”结构，而不是单纯平铺数组。
4. 让 `/admin/imports` 按分区分组展示全部板块。
5. 保持现有批量全量抓取总任务模型不变。
6. 让运行时继续消费派生后的平铺列表，避免大面积重写下游链路。

## 当前决策

这轮你已经明确选择了以下方向：

- 目录范围是“首页各分区下能点进去的全部板面”。
- `/admin/imports` 按首页分区分组展示，不做搜索。
- 所有复选框默认都不勾选。
- 每个分区提供“全选本分区 / 取消本分区”，不做更复杂的批量操作。
- 分区顺序与分区内板块顺序都严格按 BYR 首页固化。
- 目录中的全部板块都默认允许手动全量抓取。
- 所有板块都带完整调度参数。
- 除少数显式白名单外，默认 `scheduledSyncEnabled = false`。
- `boardCatalog` 以分区树结构作为事实源。

## 不覆盖的内容

这份设计不覆盖：

- 在线重新抓首页并自动改写代码的后台功能。
- 长期保留一个“再生成目录”的仓库脚本。
- 在线编辑板块目录、分区名或板块描述。
- 在线切换定时任务启用状态或修改调度参数。
- 更复杂的板块筛选、全文搜索、跨分区全选全部。
- 批量全量抓取总任务本身的状态机重构。

## 设计结论

本轮设计采用以下形态：

- `boardCatalog` 升级为“分区树”事实源。
- 再从分区树派生出有序平铺列表供运行时复用。
- `/admin/imports` 改为按分区渲染的静态目录。
- 所有目录板块默认 `fullSyncEnabled = true`。
- 所有目录板块都带完整调度字段。
- 除显式白名单外，默认 `scheduledSyncEnabled = false`。
- 定时任务注册继续只从“显式启用调度的板块”派生。
- 批量全量抓取总任务继续按平铺列表顺序执行，不引入“分区级任务状态”。

## 为什么采用“上层树、下层平铺”

这轮有三种可选形态：

1. 分区树作为事实源，再派生平铺列表。
2. 全部下游都直接改成消费分区树。
3. 继续用平铺数组做事实源，页面渲染时临时分组。

本轮明确选择第 `1` 种。

原因：

- 它最符合“按首页分区固化”的产品目标。
- `/admin/imports` 的展示顺序和目录来源天然一致。
- 现有 scheduler、registry、batch runner 可以继续消费平铺列表，改动更可控。
- 能避免让“分区”概念渗透到不需要关心分区的运行时链路里。

不选第 `2` 种的原因：

- 会把分区概念强行带进 scheduler、任务注册、runner，侵入性过高。

不选第 `3` 种的原因：

- 会让页面的分组逻辑与目录事实源分离，长期更容易漂移。

## 数据模型

### 分区树事实源

建议将 [apps/web/src/server/boardSync/boardCatalog.ts](/Users/ghost/code/BBSAchieve/apps/web/src/server/boardSync/boardCatalog.ts) 升级为以分区树为主的数据文件。

建议导出：

- `boardCatalogSections`
- `boardCatalog`

其中：

- `boardCatalogSections` 是唯一事实源
- `boardCatalog` 是从 `boardCatalogSections` 派生出的有序平铺数组

建议分区结构如下：

```ts
type BoardCatalogSection = {
  sectionName: string;
  sectionSlug: string;
  boards: BoardCatalogEntry[];
};
```

建议板块结构如下：

```ts
type BoardCatalogEntry = {
  sectionName: string;
  sectionSlug: string;
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
```

实现上可以让 `boardCatalogSections` 里的板块项先只保存板块自身字段，再在派生 `boardCatalog` 时补齐 `sectionName` 与 `sectionSlug`。是否把分区信息同时冗余保留在板块对象里不是关键，关键是：

- 页面直接消费分区树
- 运行时继续消费平铺有序列表
- 顺序只从同一份事实源派生

### 参数默认值

所有抓到的板块都带完整运行参数。

建议默认值如下：

- `fullSyncEnabled = true`
- `fullSyncWindowMinutes = 60 * 24 * 365 * 30`
- `scheduledSyncEnabled = false`
- `scheduledIntervalMinutes = 120`
- `scheduledWindowMinutes = 180`

显式白名单板块保留单独调优值。

第一版建议白名单仍然只有：

- `IWhisper`
- `JobInfo`

这两个板块继续沿用当前已经落地的调度配置。

### 标题和描述

目录字段里继续保留：

- `title`
- `description`

原因：

- `/admin/imports` 需要人类可读的板块说明
- 后续如果管理页或文档页想复用这些说明，不需要再拼接临时文案

对于首页新抓到的普通板块，允许先使用统一规则生成默认文案，例如：

- `title = <板块名> 全量与定时同步`
- `description = 管理员可手动全量抓取 <板块名>，定时任务默认关闭。`

`IWhisper`、`JobInfo` 可以继续保留更具体的定制说明。

## 目录固化方式

### 抓取范围

抓取范围是：

- BYR 首页展示的各个分区
- 每个分区下能直接点击进入的全部板块

不包含：

- 首页之外需要二次导航才能发现的隐藏板块
- 非板块入口的快捷链接

### 抓取方式

实现阶段允许使用一次性的本地抓取手段生成目录，但最终仓库不保留“再生成脚本”作为长期能力。

也就是说：

- 可以在实现过程中临时复用现有后端登录态和页面抓取能力完成一次目录采集
- 最终提交到仓库的是固化后的 `boardCatalog.ts` 和相关测试
- 不对产品暴露“重新抓目录”的操作入口
- 不把目录再生成当作正式运维流程的一部分

### 顺序约束

固化结果必须严格保留：

- 首页分区顺序
- 每个分区内板块顺序

后续页面展示和批量抓取执行顺序都从这份顺序派生，不再进行名称排序。

## `/admin/imports` 页面

### 展示方式

`/admin/imports` 的批量全量抓取区域改为按分区分组展示。

每个分区是一张独立卡片，包含：

- 分区名
- `全选本分区`
- `取消本分区`
- 该分区下的板块复选框列表

不做：

- 页面级搜索
- 页面级全选全部
- 页面级清空全部

### 默认勾选策略

全部板块默认都不勾选。

这样可以避免管理员打开页面后因为默认选中而误触发超大批量抓取。

### 提交语义

页面继续只提供一个统一按钮：

- `开始全量抓取`

提交时：

- 只提交当前勾选的板块名集合
- 服务端继续只创建一条批量全量抓取总任务
- 总任务执行顺序仍按固化目录顺序，而不是按勾选先后顺序

### 页面辅助文案

建议补充三类说明，减少误解：

1. 在板块区域上方说明：
   - “以下目录来自首页固化板块清单”

2. 在按钮附近说明：
   - “只会抓取已勾选板块，执行顺序按首页目录顺序”

3. 在按钮下方显示：
   - “当前已选择 N 个板块”

## 运行时适配

### `boardRegistry`

[apps/web/src/server/boardSync/boardRegistry.ts](/Users/ghost/code/BBSAchieve/apps/web/src/server/boardSync/boardRegistry.ts) 继续基于平铺后的 `boardCatalog` 工作。

也就是说：

- `boardCatalogSections` 是事实源
- `boardCatalog` 是有序平铺视图
- `boardRegistry` 继续只认 `boardCatalog`

这样现有接口可以尽量保持稳定。

### scheduler 与 task registry

定时任务派生规则不变：

- 只为 `scheduledSyncEnabled = true` 的板块生成定时任务

因此即使全站板块都出现在 `/admin/imports` 目录里，也不会自动把全站都接上定时抓取。

这符合你之前已经定下的边界：

- 板块目录列表
- 定时任务集合

不是同一集合。

### batch full sync runner

批量全量抓取 runner 继续消费平铺后的 `boardCatalog` 顺序，不引入分区级状态。

换句话说：

- 分区只影响展示和目录事实源
- 执行器仍只认“排好序的板块列表”

这样总任务元数据和恢复逻辑不需要因为“分区”而扩张复杂度。

## 对现有功能的影响

### 不改变的部分

以下行为保持不变：

- 一次勾选多个板块，创建一条总任务
- 按目录顺序串行抓取
- 某板块失败即停
- 从失败板块恢复
- `IWhisper` 与 `JobInfo` 继续处于同一套目录中

### 会改变的部分

以下行为会发生变化：

- `/admin/imports` 不再只显示两个手工板块
- `boardCatalog.ts` 不再是简单平铺常量
- `taskRegistry` 的板块派生来源会改为“分区树派生平铺列表”

## 测试与验证

实现后至少需要补这些验证：

### 目录与派生

- 分区树顺序和派生平铺顺序一致
- `IWhisper`、`JobInfo` 仍在正确位置
- 全部板块默认 `fullSyncEnabled = true`
- 非白名单板块默认 `scheduledSyncEnabled = false`

### `/admin/imports`

- 页面按分区展示板块
- 默认一个都不勾选
- 分区级“全选 / 取消全选”行为正确
- 提交后仍命中批量总任务路由

### scheduler / registry

- 只有显式启用的白名单板块被派生为定时任务
- 新增目录板块不会因为存在于目录里就自动出现在定时任务页

### 批量任务

- 在目录规模扩大后，批量任务仍按固化顺序执行
- 继续/停止/失败恢复逻辑不受分区结构影响

## 风险与约束

### 风险 1：目录规模显著增大

一旦按首页全部分区固化，`/admin/imports` 的目录规模会明显变大。

缓解方式：

- 采用按分区分组
- 默认不勾选
- 每个分区只提供轻量的“全选 / 取消全选”

### 风险 2：调度参数虽然完整，但默认关闭

普通板块会带完整调度参数，但 `scheduledSyncEnabled = false`。

这要求后续维护者理解：

- “有参数”不等于“已启用”

缓解方式：

- 在 `boardCatalog.ts` 中用常量或注释明确默认策略
- 在 `taskRegistry` 测试中锁住“只从显式启用板块派生”

### 风险 3：首页目录是静态快照

由于明确不保留再生成脚本，首页目录未来如果变更，需要人工维护。

这是刻意接受的权衡，因为你已经明确选择：

- 只抓一次并固化
- 后续手工维护

## 实现边界

第一版完成后，应达到以下结果：

1. `boardCatalog` 已包含首页各分区下全部可点击板块。
2. `/admin/imports` 已按分区分组展示这些板块。
3. 默认一个都不勾选。
4. 每个分区可单独全选或取消全选。
5. 勾选后的提交仍然走现有批量总任务模型。
6. 定时任务默认只对白名单板块开启。

做到这里，这个“只能看到两个板块”的问题就算真正解决。
