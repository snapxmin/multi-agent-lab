# Verifier v1 — 验收标准（2026-07-22）

针对本轮三项优化的验收标准：

## A. 统一场景（对应需求 3）
- A1 三个架构的模拟必须围绕同一任务「存量项目 SDK 大版本升级改造」：扫描仓库 → 按模块分组并行改造 → 自动单测 → 失败重试（≤3 次）→ 汇总变更清单 + 风险报告。
- A2 Subagent 场景须暴露 3 个固有缺陷：上下文天花板（失忆）、重试规则失控（靠自觉）、依赖乱序。
- A3 Team 场景须暴露：决策权仍在 LLM、闲聊 token 消耗、任务遗漏、不可复现。
- A4 Workflow 场景须体现：规则由代码锁死、重试计数器在 Runtime 变量、依赖按序调度、状态不污染顶层对话。

## B. 人工介入 + 控制权交互（对应需求 1）
- B1 三种架构都有人工介入操作：Subagent 只能喊话主 Agent；Team 可定向询问任意成员（可选择成员）；Workflow 干预失败（无入口）。
- B2 节点可点击：点击查看控制权归属/可达性反馈（Subagent 子节点不可直达、Team 成员可对话、Workflow 工人无对话入口）。

## C. Workflow JS 编排脚本展示（对应需求 2）
- C1 场景内嵌具体示例脚本 sdk-upgrade.workflow.js，包含扫描、分组、依赖排序、worker 调用、重试计数、3 次熔断风险报告、汇总。
- C2 动画播放时脚本当前执行行高亮，与拓扑动画时间轴同步。
- C3 Runtime 变量面板实时显示重试计数、完成数、风险数。

## D. 工程一致性（自动检查）
- D1 所有 packet/work 引用的节点 id 存在。
- D2 各架构 meta.stats 的 key 在场景数据中有来源；result 类 packet 数与 done 上限一致。
- D3 script.spans 引用合法行号且时间递增。
- D4 `npm run build` 通过。

运行方式：`node verifier/v1/check.mjs`（数据一致性，D1-D3）+ `npm run build`（D4）。
