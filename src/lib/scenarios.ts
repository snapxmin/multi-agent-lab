import type { ArchMeta, EdgeDef, PacketEvent, PatternId, PatternMeta, Scenario, WorkEvent } from '@/types/sim'

// ============================================================
// 统一对比场景：存量项目 SDK 大版本升级改造
// 流程：扫描仓库 → 按模块分组并行改造 → 自动单测
//      → 失败重试（连续 3 次则熔断出风险报告）→ 汇总变更清单
// ============================================================

// ============================================================
// 场景一：Subagent —— 独立上下文窗口，只回流摘要
// 真实机制：上下文隔离是头号卖点（父上下文不被淹没）
// 真实缺陷：① 协作墙 ② 无记忆 ③ 协调瓶颈（单一父脑）
// ============================================================

const subNodes = [
  { id: 'user', label: '用户', sub: 'SDK 升级需求方', x: 90, y: 270, kind: 'user' as const },
  { id: 'human', label: '人类', sub: '只能和父 Agent 对话', x: 90, y: 465, kind: 'human' as const },
  { id: 'main', label: '父 Agent · 工头', sub: '唯一大脑 · 判断汇聚于此', x: 335, y: 270, kind: 'main' as const },
  // 每次派发 = 全新实例，用完即毁（result 回流后不久销毁）
  { id: 's_scan', label: '子 Agent · 扫描', sub: '全新实例 · 用完即毁', x: 590, y: 100, kind: 'sub' as const, appearAt: 2.6, disappearAt: 6.4 },
  { id: 's_dev2', label: '子 Agent · 扫描#2', sub: '全新实例 · 零记忆', x: 590, y: 445, kind: 'sub' as const, appearAt: 2.7, disappearAt: 6.6 },
  { id: 's_dev', label: '子 Agent · 改造#1', sub: '全新实例 · 零记忆', x: 655, y: 210, kind: 'sub' as const, appearAt: 6.6, disappearAt: 11.4 },
  { id: 's_test', label: '子 Agent · 测试#1', sub: '全新实例 · 零记忆', x: 655, y: 330, kind: 'sub' as const, appearAt: 10.8, disappearAt: 15.2 },
  { id: 's_dev_b', label: '子 Agent · 改造#2', sub: '全新实例 · 附失败日志', x: 655, y: 210, kind: 'sub' as const, appearAt: 15.0, disappearAt: 19.0 },
  { id: 's_test_b', label: '子 Agent · 测试#2', sub: '全新实例 · 零记忆', x: 655, y: 330, kind: 'sub' as const, appearAt: 18.4, disappearAt: 22.2 },
  { id: 's_dev2_b', label: '子 Agent · 改造#3', sub: '全新实例 · 零记忆', x: 590, y: 445, kind: 'sub' as const, appearAt: 21.9, disappearAt: 26.7 },
  { id: 's_test_c', label: '子 Agent · 测试#3', sub: '全新实例 · 零记忆', x: 655, y: 330, kind: 'sub' as const, appearAt: 26.2, disappearAt: 30.0 },
]

const subPackets: PacketEvent[] = [
  { t: 0.6, from: 'user', to: 'main', dur: 0.9, kind: 'task', label: 'SDK 大版本升级' },
  // ① 并行扫描：父 Agent 同轮派发 2 个子任务
  { t: 2.6, from: 'main', to: 's_scan', dur: 0.7, kind: 'task', label: '扫描·基础模块' },
  { t: 2.7, from: 'main', to: 's_dev2', dur: 0.7, kind: 'task', label: '扫描·网络+业务' },
  { t: 5.0, from: 's_scan', to: 'main', dur: 0.7, kind: 'result', label: '摘要 · 6 文件清单' },
  { t: 5.2, from: 's_dev2', to: 'main', dur: 0.7, kind: 'result', label: '摘要 · 6 文件清单' },
  // ② 改造基础模块
  { t: 6.6, from: 'main', to: 's_dev', dur: 0.7, kind: 'task', label: '改造·基础模块' },
  { t: 10.0, from: 's_dev', to: 'main', dur: 0.7, kind: 'result', label: '摘要 · 改造完成' },
  // ③ 测试 → 失败
  { t: 10.8, from: 'main', to: 's_test', dur: 0.7, kind: 'task', label: '运行单测' },
  { t: 13.8, from: 's_test', to: 'main', dur: 0.7, kind: 'result', label: '❌ 2 个用例失败' },
  // ④ 重试 ×1（重新派发 = 全新实例 + 新 prompt）
  { t: 15.0, from: 'main', to: 's_dev_b', dur: 0.7, kind: 'task', label: '修复 ×1 · 新 prompt（附失败日志）' },
  { t: 17.6, from: 's_dev_b', to: 'main', dur: 0.7, kind: 'result', label: '摘要 · 修复完成' },
  // ⑤ 复测（又一个全新实例）
  { t: 18.4, from: 'main', to: 's_test_b', dur: 0.7, kind: 'task', label: '复测 · 新实例' },
  { t: 20.8, from: 's_test_b', to: 'main', dur: 0.7, kind: 'result', label: '✅ 基础模块通过' },
  // ⑥ 改造网络+业务（又一个全新实例）
  { t: 21.9, from: 'main', to: 's_dev2_b', dur: 0.7, kind: 'task', label: '改造·网络+业务 · 新实例' },
  { t: 25.3, from: 's_dev2_b', to: 'main', dur: 0.7, kind: 'result', label: '摘要 · 8 文件完成' },
  // ⑦ 全量测试（又一个全新实例）
  { t: 26.2, from: 'main', to: 's_test_c', dur: 0.7, kind: 'task', label: '全量测试 · 新实例' },
  { t: 28.6, from: 's_test_c', to: 'main', dur: 0.7, kind: 'result', label: '✅ 全部通过' },
  // ⑧ 汇总
  { t: 30.0, from: 'main', to: 'user', dur: 1.0, kind: 'final', label: '变更清单' },
]

const subWorks: WorkEvent[] = [
  { t: 1.5, node: 'main', dur: 1.0 },
  { t: 3.3, node: 's_scan', dur: 1.7 },
  { t: 3.4, node: 's_dev2', dur: 1.7 },
  { t: 5.9, node: 'main', dur: 0.7 },
  { t: 7.3, node: 's_dev', dur: 2.5 },
  { t: 11.5, node: 's_test', dur: 2.1 },
  { t: 14.5, node: 'main', dur: 0.5 },
  { t: 15.7, node: 's_dev_b', dur: 1.7 },
  { t: 19.1, node: 's_test_b', dur: 1.5 },
  { t: 21.5, node: 'main', dur: 0.4 },
  { t: 22.6, node: 's_dev2_b', dur: 2.5 },
  { t: 26.9, node: 's_test_c', dur: 1.5 },
  { t: 29.3, node: 'main', dur: 0.6 },
]

const subagentScenario: Scenario = {
  id: 'subagent',
  duration: 32.5,
  nodes: subNodes,
  edges: [
    { from: 'user', to: 'main' },
    { from: 'human', to: 'main', dashed: true },
    { from: 'main', to: 's_scan' },
    { from: 'main', to: 's_dev' },
    { from: 'main', to: 's_test' },
    { from: 'main', to: 's_dev2' },
    { from: 'main', to: 's_dev_b' },
    { from: 'main', to: 's_test_b' },
    { from: 'main', to: 's_dev2_b' },
    { from: 'main', to: 's_test_c' },
  ],
  packets: subPackets,
  works: subWorks,
  logs: [
    { t: 0.2, text: '系统就绪：星型拓扑 —— 每个子 Agent 拥有独立上下文窗口，只有摘要回流父对话', tone: 'system' },
    { t: 1.5, text: '父 Agent 规划：并行扫描 → 分组改造 → 单测 → 失败重试 → 汇总', tone: 'info' },
    { t: 2.7, text: '父 Agent 同轮并行派发 2 个子任务 —— 但理解结果、决策下一步仍要逐个经过它的大脑（协调瓶颈）', tone: 'info' },
    { t: 3.1, text: '⚠️ 缺陷①协作墙：两个扫描子 Agent 彼此不可见，任务边界全靠父 Agent 预先切分', tone: 'warn' },
    { t: 5.9, text: '⚠️ 缺陷③协调瓶颈：摘要逐份回流、父 Agent 串行理解决策 —— 并行可发，判断不并行', tone: 'warn' },
    { t: 6.6, text: '两个扫描实例交付摘要后即销毁回收 —— subagent 不是常驻的，用完即毁', tone: 'info' },
    { t: 10.0, text: '子 Agent 独立窗口内消耗 ~15k token，父上下文只 +2KB 摘要 —— 上下文隔离是 Subagent 的头号卖点', tone: 'success' },
    { t: 15.2, text: '⚠️ 缺陷②无记忆：修复派给全新实例「改造#2」—— 不记得上次改到哪，新 prompt 必须附带失败日志重述背景', tone: 'warn' },
    { t: 20.8, text: '基础模块复测通过 ✅（父上下文占用仍不到 30%）', tone: 'info' },
    { t: 22.0, text: '网络+业务派给全新实例「改造#3」—— 派单里附带必要背景（无记忆的代价）', tone: 'info' },
    { t: 28.6, text: '✅ 全量测试通过，父 Agent 汇总各段摘要', tone: 'success' },
    { t: 31.4, text: '复盘：上下文隔离是头号卖点；代价是协作墙、无记忆、单脑协调瓶颈', tone: 'system' },
  ],
  stats: [
    { t: 5.7, key: 'ctx', delta: 3 },
    { t: 5.9, key: 'ctx', delta: 3 },
    { t: 10.7, key: 'ctx', delta: 4 },
    { t: 14.5, key: 'ctx', delta: 3 },
    { t: 18.3, key: 'ctx', delta: 3 },
    { t: 21.5, key: 'ctx', delta: 3 },
    { t: 26.0, key: 'ctx', delta: 4 },
    { t: 29.3, key: 'ctx', delta: 3 },
    { t: 3.1, key: 'risk', delta: 1 },
    { t: 5.9, key: 'risk', delta: 1 },
    { t: 15.2, key: 'risk', delta: 1 },
  ],
}

// ============================================================
// 场景一·增强版：Subagent+ —— 六大增强机制
// ① 结构化交接包（任务契约） ② 共享黑板（绕开协作墙）
// ③ 经验沉淀（冷启动记忆）   ⑥ 分层 subagent（孙 Agent）
// ⑧ 熔断与策略降级           ⑨ 部分结果回收
// ============================================================

const plusNodes = [
  { id: 'user', label: '用户', sub: 'SDK 升级需求方', x: 70, y: 270, kind: 'user' as const },
  { id: 'human', label: '人类', sub: '只能和父 Agent 对话', x: 70, y: 480, kind: 'human' as const },
  { id: 'main', label: '父 Agent · 工头', sub: '契约派发 · 熔断决策', x: 310, y: 270, kind: 'main' as const },
  { id: 'bb', label: '共享黑板', sub: '中间产物 · 绕开协作墙', x: 700, y: 485, kind: 'tasklist' as const },
  { id: 'exp', label: '经验库', sub: '冷启动记忆 · 跨实例传承', x: 470, y: 485, kind: 'runtime' as const },
  // 实例：每次派发 = 全新实例，用完即毁；同角色复用坐标体现「重生」
  { id: 's_scan', label: '子 Agent · 扫描#1', sub: '全新实例 · 用完即毁', x: 580, y: 70, kind: 'sub' as const, appearAt: 2.6, disappearAt: 5.9 },
  { id: 's_scan2', label: '子 Agent · 扫描#2', sub: '全新实例 · 用完即毁', x: 700, y: 70, kind: 'sub' as const, appearAt: 2.7, disappearAt: 6.1 },
  { id: 's_dev1', label: '子 Agent · 改造#1', sub: '全新实例 · 可读黑板', x: 580, y: 195, kind: 'sub' as const, appearAt: 6.4, disappearAt: 11.9 },
  { id: 'g1', label: '孙 Agent · 子模块', sub: '改造#1 递归派生', x: 715, y: 195, kind: 'sub' as const, appearAt: 8.2, disappearAt: 10.9 },
  { id: 's_test1', label: '子 Agent · 测试#1', sub: '全新实例 · 可读黑板', x: 700, y: 305, kind: 'sub' as const, appearAt: 11.8, disappearAt: 16.1 },
  { id: 's_dev2', label: '子 Agent · 改造#2', sub: '换策略 · 冷启动记忆', x: 580, y: 195, kind: 'sub' as const, appearAt: 17.0, disappearAt: 21.2 },
  { id: 's_test2', label: '子 Agent · 测试#2', sub: '全新实例 · 冷启动记忆', x: 700, y: 305, kind: 'sub' as const, appearAt: 21.4, disappearAt: 25.0 },
  { id: 's_dev3', label: '子 Agent · 改造#3', sub: '全新实例 · 用完即毁', x: 580, y: 195, kind: 'sub' as const, appearAt: 25.3, disappearAt: 29.8 },
  { id: 's_dev4', label: '子 Agent · 改造#4', sub: '再降级 · 续作半成品', x: 580, y: 195, kind: 'sub' as const, appearAt: 30.6, disappearAt: 34.4 },
  { id: 's_test3', label: '子 Agent · 测试#3', sub: '全新实例 · 冷启动记忆', x: 700, y: 305, kind: 'sub' as const, appearAt: 34.6, disappearAt: 38.1 },
]

const plusEdges: EdgeDef[] = [
  { from: 'user', to: 'main' },
  { from: 'human', to: 'main', dashed: true },
  { from: 'main', to: 'bb', dashed: true, faint: true },
  { from: 'main', to: 'exp', dashed: true, faint: true },
  { from: 'main', to: 's_scan' },
  { from: 'main', to: 's_scan2' },
  { from: 'main', to: 's_dev1' },
  { from: 'main', to: 's_dev2' },
  { from: 'main', to: 's_dev3' },
  { from: 'main', to: 's_dev4' },
  { from: 'main', to: 's_test1' },
  { from: 'main', to: 's_test2' },
  { from: 'main', to: 's_test3' },
  { from: 's_dev1', to: 'g1' },
  // 实例 ↔ 黑板 / 经验库（随实例生灭同步显隐）
  ...['s_scan', 's_scan2', 's_dev1', 's_test1', 's_dev2', 's_test2', 's_dev3', 's_dev4', 's_test3'].map((id) => ({
    from: 'bb', to: id, dashed: true, faint: true,
  })),
  ...['s_test1', 's_dev2', 's_test2', 's_dev3', 's_dev4', 's_test3'].map((id) => ({
    from: 'exp', to: id, dashed: true, faint: true,
  })),
]

const plusPackets: PacketEvent[] = [
  { t: 0.6, from: 'user', to: 'main', dur: 0.9, kind: 'task', label: 'SDK 大版本升级' },
  // ① 契约派发：并行扫描（结构化交接包）
  { t: 2.6, from: 'main', to: 's_scan', dur: 0.7, kind: 'task', label: '契约·扫描基础（背景+验收）' },
  { t: 2.7, from: 'main', to: 's_scan2', dur: 0.7, kind: 'task', label: '契约·扫描网络+业务' },
  // ② 共享黑板：扫描产物写入黑板
  { t: 3.4, from: 's_scan', to: 'bb', dur: 0.6, kind: 'state', label: '写入·扫描清单' },
  { t: 3.5, from: 's_scan2', to: 'bb', dur: 0.6, kind: 'state', label: '写入·扫描清单' },
  { t: 5.0, from: 's_scan', to: 'main', dur: 0.7, kind: 'result', label: '摘要 · 6 文件清单' },
  { t: 5.2, from: 's_scan2', to: 'main', dur: 0.7, kind: 'result', label: '摘要 · 6 文件清单' },
  // ③ 改造#1：读黑板 → 分层派生孙 Agent
  { t: 6.4, from: 'main', to: 's_dev1', dur: 0.7, kind: 'task', label: '契约·改造基础+验收标准' },
  { t: 6.9, from: 'bb', to: 's_dev1', dur: 0.6, kind: 'state', label: '读取·扫描清单' },
  { t: 8.2, from: 's_dev1', to: 'g1', dur: 0.6, kind: 'task', label: '拆解·子模块 A' },
  { t: 10.2, from: 'g1', to: 's_dev1', dur: 0.6, kind: 'result', label: '子模块 A 完成', countsDone: false },
  { t: 10.6, from: 's_dev1', to: 'bb', dur: 0.6, kind: 'state', label: '写入·接口约定' },
  { t: 11.0, from: 's_dev1', to: 'main', dur: 0.7, kind: 'result', label: '摘要 · 改造完成' },
  // ④ 测试#1 → 失败 → 部分回收 + 经验沉淀
  { t: 11.8, from: 'main', to: 's_test1', dur: 0.7, kind: 'task', label: '契约·单测+通过线' },
  { t: 12.3, from: 'bb', to: 's_test1', dur: 0.6, kind: 'state', label: '读取·接口约定' },
  { t: 14.6, from: 's_test1', to: 'main', dur: 0.7, kind: 'result', label: '❌ 2 个用例失败' },
  { t: 15.0, from: 's_test1', to: 'bb', dur: 0.6, kind: 'state', label: '回收·失败现场' },
  { t: 15.3, from: 's_test1', to: 'exp', dur: 0.6, kind: 'state', label: '写入·踩坑记录' },
  // ⑤ 熔断·换策略（非盲目重试）→ 改造#2 冷启动
  { t: 17.0, from: 'main', to: 's_dev2', dur: 0.7, kind: 'task', label: '熔断·换策略·拆细重派' },
  { t: 17.5, from: 'exp', to: 's_dev2', dur: 0.6, kind: 'state', label: '冷启动·踩坑记录' },
  { t: 17.7, from: 'bb', to: 's_dev2', dur: 0.6, kind: 'state', label: '读取·失败现场' },
  { t: 20.0, from: 's_dev2', to: 'main', dur: 0.7, kind: 'result', label: '摘要 · 修复完成' },
  { t: 20.4, from: 's_dev2', to: 'exp', dur: 0.6, kind: 'state', label: '写入·修复经验' },
  // ⑥ 复测#2（冷启动）
  { t: 21.4, from: 'main', to: 's_test2', dur: 0.7, kind: 'task', label: '契约·复测' },
  { t: 21.9, from: 'exp', to: 's_test2', dur: 0.6, kind: 'state', label: '冷启动·踩坑记录' },
  { t: 22.1, from: 'bb', to: 's_test2', dur: 0.6, kind: 'state', label: '读取·接口约定' },
  { t: 24.1, from: 's_test2', to: 'main', dur: 0.7, kind: 'result', label: '✅ 基础模块通过' },
  // ⑦ 改造#3 → 阻塞 → 半成品回收
  { t: 25.3, from: 'main', to: 's_dev3', dur: 0.7, kind: 'task', label: '契约·改造网络+业务' },
  { t: 25.8, from: 'bb', to: 's_dev3', dur: 0.6, kind: 'state', label: '读取·扫描清单' },
  { t: 28.3, from: 's_dev3', to: 'main', dur: 0.7, kind: 'result', label: '❌ 阻塞 · SDK 冲突' },
  { t: 28.7, from: 's_dev3', to: 'bb', dur: 0.6, kind: 'state', label: '回收·半成品 3 文件' },
  { t: 29.0, from: 's_dev3', to: 'exp', dur: 0.6, kind: 'state', label: '写入·踩坑记录' },
  // ⑧ 再降级 → 改造#4 从半成品续作
  { t: 30.6, from: 'main', to: 's_dev4', dur: 0.7, kind: 'task', label: '换策略·降级兼容层' },
  { t: 31.1, from: 'exp', to: 's_dev4', dur: 0.6, kind: 'state', label: '冷启动·踩坑记录' },
  { t: 31.3, from: 'bb', to: 's_dev4', dur: 0.6, kind: 'state', label: '读取·半成品 3 文件' },
  { t: 33.6, from: 's_dev4', to: 'main', dur: 0.7, kind: 'result', label: '摘要 · 8 文件完成' },
  // ⑨ 全量测试#3
  { t: 34.6, from: 'main', to: 's_test3', dur: 0.7, kind: 'task', label: '契约·全量测试' },
  { t: 35.1, from: 'exp', to: 's_test3', dur: 0.6, kind: 'state', label: '冷启动·经验' },
  { t: 35.3, from: 'bb', to: 's_test3', dur: 0.6, kind: 'state', label: '读取·接口约定' },
  { t: 37.3, from: 's_test3', to: 'main', dur: 0.7, kind: 'result', label: '✅ 全部通过' },
  // ⑩ 汇总
  { t: 38.4, from: 'main', to: 'user', dur: 1.0, kind: 'final', label: '变更清单' },
]

const plusWorks: WorkEvent[] = [
  { t: 1.5, node: 'main', dur: 1.0 },
  { t: 3.3, node: 's_scan', dur: 1.6 },
  { t: 3.4, node: 's_scan2', dur: 1.6 },
  { t: 5.8, node: 'main', dur: 0.5 },
  { t: 7.2, node: 's_dev1', dur: 2.0 },
  { t: 8.8, node: 'g1', dur: 1.3 },
  { t: 12.6, node: 's_test1', dur: 1.8 },
  { t: 16.3, node: 'main', dur: 0.6 },
  { t: 18.0, node: 's_dev2', dur: 1.8 },
  { t: 22.4, node: 's_test2', dur: 1.5 },
  { t: 26.1, node: 's_dev3', dur: 2.0 },
  { t: 30.0, node: 'main', dur: 0.5 },
  { t: 31.6, node: 's_dev4', dur: 1.8 },
  { t: 35.6, node: 's_test3', dur: 1.5 },
  { t: 37.9, node: 'main', dur: 0.5 },
]

const subagentPlusScenario: Scenario = {
  id: 'subagent',
  duration: 40,
  nodes: plusNodes,
  edges: plusEdges,
  packets: plusPackets,
  works: plusWorks,
  logs: [
    { t: 0.2, text: '系统就绪：增强版 Subagent —— 契约派发 + 共享黑板 + 经验库 + 分层递归 + 熔断降级 + 部分回收', tone: 'system' },
    { t: 1.5, text: '父 Agent 规划：并行扫描 → 分组改造 → 单测 → 熔断换策略 → 汇总', tone: 'info' },
    { t: 2.7, text: '✨ 增强①结构化交接：派发包是任务契约（背景+约束+验收标准），不再是一句话', tone: 'success' },
    { t: 3.5, text: '✨ 增强②共享黑板：扫描清单直接写入黑板 —— 子 Agent 间接协作，绕开协作墙且不污染父上下文', tone: 'success' },
    { t: 5.9, text: '扫描实例交付摘要后销毁回收 —— 用完即毁的机制不变', tone: 'info' },
    { t: 6.5, text: '改造#1 从黑板读取扫描清单开工 —— 不需要父 Agent 转述', tone: 'info' },
    { t: 8.3, text: '✨ 增强⑥分层 subagent：改造#1 递归派生孙 Agent 处理子模块 A —— 受控深度的拆解', tone: 'success' },
    { t: 10.7, text: '孙 Agent 交付后销毁；接口约定写入黑板 —— 产物交接不经过父上下文', tone: 'info' },
    { t: 14.6, text: '2 个用例失败 —— 但这次失败不会白白浪费', tone: 'warn' },
    { t: 15.1, text: '✨ 增强⑨部分结果回收：失败现场回收进黑板，后续实例接着用', tone: 'success' },
    { t: 15.4, text: '✨ 增强③经验沉淀：踩坑记录写入经验库 —— 实例可毁，经验留下', tone: 'success' },
    { t: 16.4, text: '⚠️ 熔断触发：不盲目重试 —— 父 Agent 分析失败现场，换策略再派', tone: 'warn' },
    { t: 17.1, text: '✨ 增强⑧策略降级：新 prompt 换思路（拆细任务+附失败现场），不是简单重发', tone: 'success' },
    { t: 17.6, text: '✨ 增强③冷启动记忆：改造#2 是全新实例，但派发同时读取经验库 —— 零记忆 ≠ 清零', tone: 'success' },
    { t: 24.1, text: '✅ 基础模块复测通过（换策略一次到位，没有无效重试）', tone: 'info' },
    { t: 28.3, text: '改造#3 遭遇 SDK 冲突阻塞 —— 再次触发熔断', tone: 'warn' },
    { t: 28.8, text: '✨ 增强⑨半成品 3 文件回收进黑板 —— 工作不白做', tone: 'success' },
    { t: 30.7, text: '✨ 增强⑧再降级：换兼容层策略，改造#4 从黑板半成品续作', tone: 'success' },
    { t: 37.3, text: '✅ 全量测试通过，父 Agent 汇总各段摘要', tone: 'success' },
    { t: 39.0, text: '复盘：契约派发✓ 黑板破协作墙✓ 经验库破无记忆✓ 分层拆解✓ 熔断不盲目重试✓ 半成品回收✓ —— 原版三大缺陷全部缓解（缺陷计数 = 0）', tone: 'system' },
  ],
  stats: [
    { t: 5.7, key: 'ctx', delta: 2 },
    { t: 5.9, key: 'ctx', delta: 2 },
    { t: 11.7, key: 'ctx', delta: 2 },
    { t: 15.3, key: 'ctx', delta: 2 },
    { t: 20.7, key: 'ctx', delta: 2 },
    { t: 24.8, key: 'ctx', delta: 2 },
    { t: 29.0, key: 'ctx', delta: 2 },
    { t: 34.3, key: 'ctx', delta: 2 },
    { t: 38.0, key: 'ctx', delta: 2 },
  ],
  statDisplays: [
    { key: 'done', label: '已回流摘要', max: 9 },
    { key: 'conc', label: '当前并发', max: 4 },
    { key: 'ctx', label: '父上下文占用', max: 100, format: (v) => `${Math.round(v)}%`, tone: 'danger' },
    { key: 'risk', label: '⚠️ 架构缺陷（已缓解）', max: 3, tone: 'danger' },
  ],
}

// ============================================================
// 真实数据版：同一动画，换成「支付 SDK v2.4 → v3.0 升级」的真实文案
// 只替换 packet label 与 log 文案，包时间 / 节点 / works 完全一致
// ============================================================

interface RealOverride {
  /** key: `${t}|${from}|${to}` → 新 label */
  packets: Record<string, string>
  /** key: t → 新日志文案 */
  logs: Record<number, string>
}

function buildRealistic(base: Scenario, o: RealOverride): Scenario {
  return {
    ...base,
    packets: base.packets.map((p) => {
      const l = o.packets[`${p.t}|${p.from}|${p.to}`]
      return l ? { ...p, label: l } : p
    }),
    logs: base.logs.map((l) => (o.logs[l.t] ? { ...l, text: o.logs[l.t] } : l)),
  }
}

const subRealOverride: RealOverride = {
  packets: {
    '0.6|user|main': '支付 SDK v2.4 → v3.0 升级',
    '2.6|main|s_scan': '扫描·pay/order 模块',
    '2.7|main|s_dev2': '扫描·net/session 模块',
    '5|s_scan|main': '清单：client.ts/sign.ts 等 6 文件',
    '5.2|s_dev2|main': '清单：session.ts/flow.ts 等 6 文件',
    '6.6|main|s_dev': '改造·sdk.pay→payment.create',
    '10|s_dev|main': 'pay 6 文件已迁移',
    '10.8|main|s_test': '运行单测 sign.test.ts',
    '13.8|s_test|main': '❌ expected md5, got HMAC-SHA256',
    '15|main|s_dev_b': '附日志：sign.test.ts:42 · 改 HMAC 重签',
    '17.6|s_dev_b|main': '修复完成：签名断言全过',
    '18.4|main|s_test_b': '复测 sign.test.ts',
    '20.8|s_test_b|main': '✅ pay/order 单测全过',
    '21.9|main|s_dev2_b': '改造·retry→resilience 迁移',
    '25.3|s_dev2_b|main': 'net/session 等 8 文件完成',
    '26.2|main|s_test_c': '全量回归 12 文件',
    '28.6|s_test_c|main': '✅ 12 文件全过',
    '30|main|user': '变更清单 12 文件+迁移指南',
  },
  logs: {
    0.2: '系统就绪：星型拓扑 —— 任务：内部支付 SDK v2.4 → v3.0 升级（回调改 Promise · 签名 md5→HMAC-SHA256 · retry→resilience · 废弃 sdk.pay）',
    1.5: '父 Agent 规划：并行扫描 pay/order 与 net/session → 分组改造 → 单测 → 失败重试 → 汇总',
    2.7: '父 Agent 同轮并行派发 2 个扫描任务 —— 但理解结果、决策下一步仍要逐个经过它的大脑（协调瓶颈）',
    3.1: '⚠️ 缺陷①协作墙：扫 pay 的和扫 net 的彼此不可见，sign.ts 被两组引用全靠父 Agent 预先切分',
    5.9: '⚠️ 缺陷③协调瓶颈：两份清单逐份回流、父 Agent 串行理解决策 —— 并行可发，判断不并行',
    6.6: '两个扫描实例交付清单后即销毁回收 —— subagent 不是常驻的，用完即毁',
    10.0: '改造实例在独立窗口内读完 sdk.pay 全部 47 个调用点，父上下文只 +2KB 摘要 —— 上下文隔离是头号卖点',
    15.2: '⚠️ 缺陷②无记忆：修复派给全新实例「改造#2」—— 新 prompt 必须附 sign.test.ts:42 失败日志重述背景',
    20.8: 'pay/order 复测通过 ✅（父上下文占用仍不到 30%）',
    22.0: 'net/session 派给全新实例「改造#3」—— 派单里写清 retry→resilience 背景（无记忆的代价）',
    28.6: '✅ 12 文件全量回归通过，父 Agent 汇总各段摘要',
    31.4: '复盘：交付 12 文件变更+迁移指南；上下文隔离是卖点，代价是协作墙、无记忆、单脑协调瓶颈',
  },
}

const plusRealOverride: RealOverride = {
  packets: {
    '0.6|user|main': '支付 SDK v2.4 → v3.0 升级',
    '2.6|main|s_scan': '契约·扫 pay/order（验收：列出 sdk.pay 调用点）',
    '2.7|main|s_scan2': '契约·扫 net/session（含签名用法）',
    '3.4|s_scan|bb': '写入：client.ts/sign.ts…6 文件',
    '3.5|s_scan2|bb': '写入：session.ts/flow.ts…6 文件',
    '5|s_scan|main': '清单：pay/order 6 文件',
    '5.2|s_scan2|main': '清单：net/session 6 文件',
    '6.4|main|s_dev1': '契约：sdk.pay→payment.create，验收=单测全过',
    '6.9|bb|s_dev1': '读取：47 个 pay 调用点',
    '8.2|s_dev1|g1': '拆解：sign.ts 签名迁移',
    '10.2|g1|s_dev1': 'sign.ts 完成（md5→HMAC）',
    '10.6|s_dev1|bb': '写入：payment.create({orderId,amount,sign})',
    '11|s_dev1|main': '改造完成：pay 6 文件',
    '11.8|main|s_test1': '契约：跑 sign.test.ts，零断言失败',
    '12.3|bb|s_test1': '读取：payment.create 签名约定',
    '14.6|s_test1|main': '❌ expected md5, got HMAC-SHA256',
    '15|s_test1|bb': '回收：sign.test.ts:42 断言栈',
    '15.3|s_test1|exp': '坑：v3 签名默认 HMAC，勿回退 md5',
    '17|main|s_dev2': '换策略：先迁 sign 再改 client',
    '17.5|exp|s_dev2': '冷启动：HMAC 坑+断言栈',
    '17.7|bb|s_dev2': '读取：sign.test.ts:42 现场',
    '20|s_dev2|main': '修复完成：重签断言全过',
    '20.4|s_dev2|exp': '坑：回调地址需在白名单重新登记',
    '21.4|main|s_test2': '契约：复测 sign+client',
    '21.9|exp|s_test2': '冷启动：签名坑',
    '22.1|bb|s_test2': '读取：payment.create 约定',
    '24.1|s_test2|main': '✅ pay/order 全过',
    '25.3|main|s_dev3': '契约：retry→resilience 迁移',
    '25.8|bb|s_dev3': '读取：net 调用点清单',
    '28.3|s_dev3|main': '❌ maxRetries 默认 0 致超时',
    '28.7|s_dev3|bb': '回收：session.ts 已迁 80%，剩重试配置',
    '29|s_dev3|exp': '坑：resilience.maxRetries 必须显式设置',
    '30.6|main|s_dev4': '换策略：兼容层包 retry→resilience',
    '31.1|exp|s_dev4': '冷启动：maxRetries 坑',
    '31.3|bb|s_dev4': '读取：session.ts 半成品 80%',
    '33.6|s_dev4|main': 'net/session 等 8 文件完成',
    '34.6|main|s_test3': '契约：全量回归 12 文件',
    '35.1|exp|s_test3': '冷启动：签名+重试坑',
    '35.3|bb|s_test3': '读取：payment.create 约定',
    '37.3|s_test3|main': '✅ 12 文件全过',
    '38.4|main|user': '清单 12 文件+迁移指南+1 风险',
  },
  logs: {
    0.2: '系统就绪：增强版 Subagent —— 任务：支付 SDK v2.4 → v3.0（回调改 Promise · 签名 md5→HMAC-SHA256 · retry→resilience）',
    1.5: '父 Agent 规划：并行扫描 → 分组改造 → 单测 → 熔断换策略 → 汇总',
    2.7: '✨ 增强①结构化交接：派发包是任务契约 —— 背景（v3 breaking changes）+约束+验收标准（列出全部 sdk.pay 调用点）',
    3.5: '✨ 增强②共享黑板：client.ts/sign.ts 等清单直接写黑板 —— 绕开协作墙且不污染父上下文',
    5.9: '扫描实例交付清单后销毁回收 —— 用完即毁的机制不变',
    6.5: '改造#1 从黑板读取 47 个 sdk.pay 调用点开工 —— 不需要父 Agent 转述',
    8.3: '✨ 增强⑥分层 subagent：改造#1 递归派生孙 Agent 专攻 sign.ts 签名迁移 —— 受控深度的拆解',
    10.7: '孙 Agent 交付后销毁；payment.create({orderId,amount,sign}) 约定写入黑板 —— 产物交接不经过父上下文',
    14.6: 'sign.test.ts:42 断言失败：expected md5 signature, got HMAC-SHA256 —— 但这次失败不白废',
    15.1: '✨ 增强⑨部分结果回收：失败断言栈回收进黑板，后续实例直接用',
    15.4: '✨ 增强③经验沉淀：「v3 签名默认 HMAC，勿回退 md5」写入经验库 —— 实例可毁，经验留下',
    16.4: '⚠️ 熔断触发：不盲目重试 —— 父 Agent 分析断言栈，改「先迁 sign 再改 client」',
    17.1: '✨ 增强⑧策略降级：新 prompt 换顺序（先 sign 后 client），不是简单重发',
    17.6: '✨ 增强③冷启动记忆：改造#2 是全新实例，但派发同时读经验库 —— 零记忆 ≠ 清零',
    24.1: '✅ sign+client 复测全过（换策略一次到位，没有无效重试）',
    28.3: '改造#3 阻塞：v3 的 resilience.maxRetries 默认 0，请求全部超时 —— 再次触发熔断',
    28.8: '✨ 增强⑨session.ts 已迁 80% 半成品回收进黑板 —— 工作不白做',
    30.7: '✨ 增强⑧再降级：兼容层包 retry→resilience，改造#4 从 80% 半成品续作',
    37.3: '✅ 12 文件全量回归通过，父 Agent 汇总',
    39.0: '复盘：交付 12 文件变更+迁移指南+1 条风险（回调白名单待运维确认）；契约✓黑板✓经验库✓分层✓熔断✓回收✓ —— 缺陷计数 = 0',
  },
}

const subagentRealScenario = buildRealistic(subagentScenario, subRealOverride)
const subagentPlusRealScenario = buildRealistic(subagentPlusScenario, plusRealOverride)

// ============================================================
// 场景二：Agent Team —— 共享任务列表 + 邮箱直连的网状协作
// 真实机制：队友是独立 Claude 实例，共享任务列表自协调 + Plan Approval
// 真实缺陷：任务状态滞后（官方已知局限）/ Token 开销显著高于单会话
// ============================================================

const teamNodes = [
  { id: 'user', label: '用户', sub: 'SDK 升级需求方', x: 85, y: 270, kind: 'user' as const },
  { id: 'human', label: '人类', sub: '可直达任意成员', x: 100, y: 470, kind: 'human' as const },
  { id: 'lead', label: 'Lead · 总协调', sub: '拆解任务 · 审批方案', x: 320, y: 250, kind: 'lead' as const },
  { id: 'tasklist', label: '共享任务列表', sub: '待办 · 进行 · 阻塞 · 依赖解锁', x: 450, y: 250, kind: 'tasklist' as const, appearAt: 2.0 },
  { id: 'm1', label: '改造 Agent', sub: 'SDK 代码升级', x: 545, y: 85, kind: 'member' as const },
  { id: 'm2', label: '测试 Agent', sub: '运行单元测试', x: 660, y: 200, kind: 'member' as const },
  { id: 'm3', label: '风险审核 Agent', sub: '输出风险报告', x: 600, y: 365, kind: 'member' as const },
  { id: 'm4', label: '扫描 Agent', sub: '找出待改文件', x: 420, y: 445, kind: 'member' as const },
]

const teamMesh = ['lead', 'm1', 'm2', 'm3', 'm4']
const teamEdges: EdgeDef[] = teamMesh.flatMap((a, i) =>
  teamMesh.slice(i + 1).map((b) => ({ from: a, to: b, faint: true })),
)
teamEdges.push({ from: 'user', to: 'lead' })
teamEdges.push({ from: 'lead', to: 'tasklist', dashed: true })
teamEdges.push({ from: 'human', to: 'm1', dashed: true })
teamEdges.push({ from: 'human', to: 'm2', dashed: true })

const teamPackets: PacketEvent[] = [
  { t: 0.6, from: 'user', to: 'lead', dur: 0.9, kind: 'task', label: 'SDK 大版本升级' },
  // ① Lead 拆解任务，写入共享任务列表（含依赖）
  { t: 2.2, from: 'lead', to: 'tasklist', dur: 0.6, kind: 'state', label: '写入任务 ×4' },
  // ② 扫描 Agent 认领任务（文件锁防止重复认领）
  { t: 2.9, from: 'm4', to: 'tasklist', dur: 0.6, kind: 'state', label: '认领 · 扫描仓库' },
  { t: 5.9, from: 'm4', to: 'tasklist', dur: 0.6, kind: 'state', label: '标记完成 · 12 文件' },
  { t: 6.2, from: 'm4', to: 'lead', dur: 0.7, kind: 'result', label: '12 个文件清单' },
  // ③ 改造 Agent 认领 + Plan Approval
  { t: 7.0, from: 'm1', to: 'tasklist', dur: 0.6, kind: 'state', label: '认领 · 改造任务' },
  { t: 7.8, from: 'm1', to: 'lead', dur: 0.8, kind: 'chat', label: '提交改造方案' },
  { t: 9.3, from: 'lead', to: 'm1', dur: 0.7, kind: 'chat', label: '批准方案' },
  // ④ 改造中与测试 Agent 邮箱直连，对齐接口（3 轮有效协商）
  { t: 10.4, from: 'm1', to: 'm2', dur: 0.8, kind: 'chat', label: 'API 契约: GET /search?q=' },
  { t: 11.3, from: 'm2', to: 'm1', dur: 0.8, kind: 'chat', label: '版本号对齐 v3.2' },
  { t: 12.2, from: 'm1', to: 'm2', dur: 0.8, kind: 'chat', label: '迁移文档 §4 已同步' },
  { t: 13.6, from: 'm1', to: 'm2', dur: 0.7, kind: 'chat', label: '改完了，可以测' },
  // ⑤ 任务状态滞后：完工忘标记 → 依赖任务被阻塞
  { t: 14.3, from: 'm2', to: 'tasklist', dur: 0.6, kind: 'state', label: '认领 · 测试任务' },
  { t: 15.0, from: 'tasklist', to: 'm2', dur: 0.6, kind: 'state', label: '⛔ 依赖未解锁' },
  { t: 16.4, from: 'lead', to: 'm1', dur: 0.7, kind: 'chat', label: '请补标任务状态' },
  { t: 17.2, from: 'm1', to: 'tasklist', dur: 0.6, kind: 'state', label: '补标 · 改造完成' },
  { t: 17.9, from: 'tasklist', to: 'm2', dur: 0.7, kind: 'task', label: '依赖解锁 · 测试' },
  // ⑥ 测试 → 失败 → 重试 ×1
  { t: 21.1, from: 'm2', to: 'lead', dur: 0.7, kind: 'result', label: '❌ 2 个用例失败' },
  { t: 22.0, from: 'lead', to: 'm1', dur: 0.7, kind: 'chat', label: '修复 · 重试 ×1' },
  { t: 24.3, from: 'm1', to: 'm2', dur: 0.7, kind: 'chat', label: '修好了，复测' },
  { t: 26.5, from: 'm2', to: 'tasklist', dur: 0.6, kind: 'state', label: '标记完成 · 通过' },
  { t: 26.8, from: 'm2', to: 'lead', dur: 0.7, kind: 'result', label: '✅ 12 文件全部通过' },
  // ⑦ 风险审核
  { t: 27.7, from: 'm3', to: 'tasklist', dur: 0.6, kind: 'state', label: '认领 · 风险审核' },
  { t: 29.8, from: 'm3', to: 'tasklist', dur: 0.6, kind: 'state', label: '标记完成' },
  { t: 30.1, from: 'm3', to: 'lead', dur: 0.7, kind: 'result', label: '风险报告' },
  // ⑧ 汇总
  { t: 31.6, from: 'lead', to: 'user', dur: 1.0, kind: 'final', label: '升级总结' },
]

const teamWorks: WorkEvent[] = [
  { t: 1.5, node: 'lead', dur: 0.7 },
  { t: 3.6, node: 'm4', dur: 2.1 },
  { t: 8.6, node: 'lead', dur: 0.7 },
  { t: 10.0, node: 'm1', dur: 3.4 },
  { t: 18.6, node: 'm2', dur: 2.3 },
  { t: 22.7, node: 'm1', dur: 1.4 },
  { t: 25.0, node: 'm2', dur: 1.3 },
  { t: 28.3, node: 'm3', dur: 1.3 },
  { t: 31.0, node: 'lead', dur: 0.5 },
]

const teamScenario: Scenario = {
  id: 'team',
  duration: 33.5,
  nodes: teamNodes,
  edges: teamEdges,
  packets: teamPackets,
  works: teamWorks,
  logs: [
    { t: 0.2, text: '系统就绪：网状拓扑 —— 每个队友是独立 Claude 实例，邮箱互发消息，不靠 Lead 转发', tone: 'system' },
    { t: 1.5, text: 'Lead 拆解任务：扫描 → 改造 → 测试 → 审核（含依赖关系）', tone: 'info' },
    { t: 2.2, text: '共享任务列表是团队的中枢：认领、依赖解锁、文件锁都在这 —— 协调不靠 Lead 的记忆', tone: 'info' },
    { t: 2.9, text: '扫描 Agent 从任务列表认领「扫描仓库」（文件锁防止重复认领）', tone: 'info' },
    { t: 6.2, text: '12 个文件清单交付，任务状态已同步 —— 全员可见', tone: 'info' },
    { t: 7.9, text: 'Plan Approval：队友先交方案、Lead 批准后才动手 —— 介于「文字约定」与「代码锁死」之间的半正式管控', tone: 'info' },
    { t: 12.6, text: '协商有真实开销（官方：token 显著高于单会话），但换来接口对齐 —— 这是 Team 的价值与代价', tone: 'info' },
    { t: 15.2, text: '⚠️ 任务状态滞后：改造 Agent 完工但忘标记，依赖任务被阻塞 —— 官方已知局限', tone: 'warn' },
    { t: 16.4, text: 'Lead 巡检任务列表才发现滞后，提醒补标 —— 进度空转约 2.5s', tone: 'warn' },
    { t: 17.9, text: '✓ 补标完成，依赖解锁，测试任务释放', tone: 'success' },
    { t: 21.1, text: '2 个用例失败 —— 重试上限是团队约定，Lead 与成员自觉执行', tone: 'info' },
    { t: 26.8, text: '✅ 12 个文件全部通过 —— 任务列表状态实时全员可见', tone: 'success' },
    { t: 30.1, text: '风险审核 Agent 交付风险报告', tone: 'info' },
    { t: 32.4, text: '复盘：协调靠共享任务列表；已知局限：/resume 不恢复队友 · 每会话仅一个团队 · 队友不能再生队友', tone: 'system' },
  ],
  stats: [
    { t: 8.6, key: 'ctx', delta: 6 },
    { t: 16.4, key: 'ctx', delta: 4 },
    { t: 22.0, key: 'ctx', delta: 4 },
    { t: 31.0, key: 'ctx', delta: 4 },
    { t: 15.2, key: 'risk', delta: 1 },
  ],
}

// ============================================================
// 场景三：Dynamic Workflow —— 规则全部写进 JS 编排脚本
// 核心概念：脚本由 LLM 动态生成；一旦生成，执行顺序即固化
// 为静态 DAG（topoSort），重试/熔断由代码强制执行
// ============================================================

const wfNodes = [
  { id: 'user', label: '用户', sub: 'SDK 升级需求方', x: 80, y: 110, kind: 'user' as const },
  { id: 'human', label: '人类', sub: '中途难以干预', x: 80, y: 320, kind: 'human' as const },
  { id: 'script', label: 'JS 编排脚本', sub: '规则代码锁死', x: 250, y: 280, kind: 'script' as const },
  { id: 'runtime', label: 'Runtime 状态', sub: '重试计数 · 进度 · 风险', x: 250, y: 465, kind: 'runtime' as const },
  // 生成即固化：topoSort 一完成，12 个 Worker 节点与依赖边全部就位
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `f${i + 1}`,
    label: `f${i + 1}`,
    sub: undefined as string | undefined,
    x: 480 + (i % 4) * 95,
    y: 110 + Math.floor(i / 4) * 130,
    kind: 'sub' as const,
    appearAt: 3.0,
  })),
]

const wfEdges: EdgeDef[] = [
  { from: 'user', to: 'script' },
  { from: 'human', to: 'script', dashed: true },
  { from: 'script', to: 'runtime', dashed: true },
  ...Array.from({ length: 12 }, (_, i) => ({ from: 'script', to: `f${i + 1}`, faint: true, dashed: true })),
  // 静态 DAG 依赖边（topoSort 完成 ≈2.9s 时浮现）：基础组 → 网络组 → 业务组
  { from: 'f1', to: 'f4', dep: true, appearAt: 2.9 },
  { from: 'f2', to: 'f4', dep: true, appearAt: 2.9 },
  { from: 'f2', to: 'f5', dep: true, appearAt: 2.9 },
  { from: 'f3', to: 'f6', dep: true, appearAt: 2.9 },
  { from: 'f3', to: 'f7', dep: true, appearAt: 2.9 },
  { from: 'f4', to: 'f8', dep: true, appearAt: 2.9 },
  { from: 'f5', to: 'f9', dep: true, appearAt: 2.9 },
  { from: 'f6', to: 'f10', dep: true, appearAt: 2.9 },
  { from: 'f6', to: 'f11', dep: true, appearAt: 2.9 },
  { from: 'f7', to: 'f12', dep: true, appearAt: 2.9 },
]

// 12 个文件的执行时间线：基础组 f1-f3 → 网络组 f4-f7 → 业务组 f8-f12
// f2 失败 1 次后通过；f5 连续失败 3 次熔断
interface FilePlan {
  id: string
  dispatch: number
  workStart: number
  workDur: number
  attempts: number // 总尝试次数
  pass: boolean
}

const filePlans: FilePlan[] = [
  { id: 'f1', dispatch: 3.0, workStart: 3.5, workDur: 2.4, attempts: 1, pass: true },
  { id: 'f2', dispatch: 3.1, workStart: 3.6, workDur: 1.6, attempts: 2, pass: true },
  { id: 'f3', dispatch: 3.2, workStart: 3.7, workDur: 2.6, attempts: 1, pass: true },
  { id: 'f4', dispatch: 8.2, workStart: 8.7, workDur: 2.2, attempts: 1, pass: true },
  { id: 'f5', dispatch: 8.3, workStart: 8.8, workDur: 1.8, attempts: 3, pass: false },
  { id: 'f6', dispatch: 8.4, workStart: 8.9, workDur: 2.4, attempts: 1, pass: true },
  { id: 'f7', dispatch: 8.5, workStart: 9.0, workDur: 2.6, attempts: 1, pass: true },
  { id: 'f8', dispatch: 16.0, workStart: 16.5, workDur: 2.2, attempts: 1, pass: true },
  { id: 'f9', dispatch: 16.1, workStart: 16.6, workDur: 2.4, attempts: 1, pass: true },
  { id: 'f10', dispatch: 16.2, workStart: 16.7, workDur: 2.6, attempts: 1, pass: true },
  { id: 'f11', dispatch: 16.3, workStart: 16.8, workDur: 2.8, attempts: 1, pass: true },
  { id: 'f12', dispatch: 16.4, workStart: 16.9, workDur: 3.0, attempts: 1, pass: true },
]

const RETRY_GAP = 0.6 // 失败后脚本重新派发的间隔

const wfPackets: PacketEvent[] = [
  { t: 0.5, from: 'user', to: 'script', dur: 0.8, kind: 'task', label: 'SDK 升级 ×12 文件' },
]
const wfWorks: WorkEvent[] = [
  { t: 1.2, node: 'script', dur: 1.0 },
  { t: 2.4, node: 'script', dur: 0.5 },
]
const wfStats: { t: number; key: string; delta: number }[] = []

for (const fp of filePlans) {
  let start = fp.workStart
  for (let attempt = 1; attempt <= fp.attempts; attempt++) {
    const isRetry = attempt > 1
    const dispatch = isRetry ? start - RETRY_GAP - 0.5 : fp.dispatch
    wfPackets.push({
      t: dispatch,
      from: 'script',
      to: fp.id,
      dur: 0.5,
      kind: 'task',
      label: isRetry ? (fp.id === 'f5' && attempt === 3 ? '重试 ×2 · 升级 Opus' : `重试 ×${attempt - 1}`) : undefined,
    })
    const dur = isRetry ? fp.workDur * 0.6 : fp.workDur
    wfWorks.push({ t: start, node: fp.id, dur })
    const end = start + dur
    const lastAttempt = attempt === fp.attempts
    const passed = lastAttempt && fp.pass
    wfPackets.push({
      t: end,
      from: fp.id,
      to: 'script',
      dur: 0.5,
      kind: 'result',
      label: passed ? '✅' : lastAttempt ? '⛔ 熔断' : '❌',
      countsDone: lastAttempt,
    })
    if (isRetry) wfStats.push({ t: dispatch, key: 'retries', delta: 1 })
    if (lastAttempt) {
      wfPackets.push({ t: end + 0.5, from: 'script', to: 'runtime', dur: 0.4, kind: 'state', label: passed ? undefined : '风险报告 +1' })
      wfStats.push({ t: end + 0.9, key: 'ctx', delta: passed ? 8 : 4 })
    }
    start = end + 0.5 + RETRY_GAP // 下一次尝试
  }
}

// 依赖解锁：组屏障跨组时，沿代表性依赖边发送「解锁」状态包
// 基础组收官（f2 重试后 7.26s 落定）→ 网络组 8.2s 开工前
wfPackets.push({ t: 7.5, from: 'f2', to: 'f4', dur: 0.6, kind: 'state', label: '解锁' })
wfPackets.push({ t: 7.5, from: 'f2', to: 'f5', dur: 0.6, kind: 'state', label: '解锁' })
wfPackets.push({ t: 7.6, from: 'f3', to: 'f6', dur: 0.6, kind: 'state', label: '解锁' })
// 网络组收官（f5 14.96s 熔断落定）→ 业务组 16.0s 开工前
// 注意：f5 熔断 → 不发 f5→f9 解锁包；组屏障等全组落定而非全员成功，业务组照常解锁
wfPackets.push({ t: 15.5, from: 'f4', to: 'f8', dur: 0.6, kind: 'state', label: '解锁' })
wfPackets.push({ t: 15.5, from: 'f6', to: 'f10', dur: 0.6, kind: 'state', label: '解锁' })
wfPackets.push({ t: 15.6, from: 'f7', to: 'f12', dur: 0.6, kind: 'state', label: '解锁' })

wfWorks.push({ t: 20.4, node: 'script', dur: 1.2 })
wfPackets.push({ t: 21.8, from: 'script', to: 'user', dur: 1.0, kind: 'final', label: '变更清单 + 风险报告' })

const wfScript = {
  file: 'sdk-upgrade.workflow.js',
  lines: [
    `// sdk-upgrade.workflow.js —— 编排逻辑固化为代码`,
    `const files = await scanRepo('./src')      // ① 扫描仓库`,
    `const groups = groupByModule(files)       // ② 按模块分组`,
    `const done = [], risk = []`,
    `const dag = topoSort(groups)              // ③ 静态拓扑：基础→网络→业务（生成即固化）`,
    `for (const g of dag) {`,
    `  await parallel(g.files.map(async f => {`,
    `    let retries = 0                        // 计数器住在脚本变量里`,
    `    while (true) {`,
    `      const code = await worker.transform(f) // ④ LLM 只做智力工作`,
    `      const test = await worker.test(f)      // ⑤ 自动运行单测`,
    `      if (test.pass) { done.push(f); break }`,
    `      if (++retries >= 3) {                  // ⑥ 硬性规则：代码锁死`,
    `        risk.push({ file: f, log: test.log })`,
    `        break`,
    `      }`,
    `    }`,
    `  }))`,
    `}`,
    `return summary(done, risk)                 // ⑦ 汇总清单 + 风险报告`,
  ],
  spans: [
    { t0: 1.2, t1: 2.3, line: 2 },
    { t0: 2.4, t1: 2.9, line: 3 },
    { t0: 2.9, t1: 3.3, line: 5 },
    { t0: 3.3, t1: 5.3, line: 10 },
    { t0: 4.8, t1: 5.4, line: 11 },
    { t0: 5.2, t1: 5.6, line: 13 },
    { t0: 5.8, t1: 7.3, line: 10 },
    { t0: 5.9, t1: 6.1, line: 12 },
    { t0: 7.2, t1: 7.4, line: 12 },
    { t0: 8.0, t1: 8.3, line: 6 },
    { t0: 8.3, t1: 11.6, line: 10 },
    { t0: 10.2, t1: 11.8, line: 11 },
    { t0: 10.6, t1: 10.9, line: 13 },
    { t0: 11.2, t1: 12.8, line: 10 },
    { t0: 12.7, t1: 13.0, line: 13 },
    { t0: 13.4, t1: 15.0, line: 10 },
    { t0: 14.9, t1: 15.2, line: 13 },
    { t0: 15.1, t1: 15.8, line: 14 },
    { t0: 15.8, t1: 16.1, line: 6 },
    { t0: 16.0, t1: 19.6, line: 10 },
    { t0: 18.6, t1: 20.0, line: 11 },
    { t0: 19.6, t1: 20.1, line: 12 },
    { t0: 20.4, t1: 21.8, line: 20 },
  ],
}

const wfVars = [
  { t: 2.2, key: 'files', value: 12 },
  { t: 3.0, key: '当前组', value: '基础组 (f1-f3)' },
  { t: 5.8, key: 'retries.f2', value: 1 },
  { t: 7.3, key: 'done', value: 3 },
  { t: 8.2, key: '当前组', value: '网络组 (f4-f7)' },
  { t: 11.2, key: 'retries.f5', value: 1 },
  { t: 11.7, key: 'done', value: 7 },
  { t: 13.4, key: 'retries.f5', value: 2 },
  { t: 15.1, key: 'retries.f5', value: 3 },
  { t: 15.2, key: 'risk', value: 1 },
  { t: 16.0, key: '当前组', value: '业务组 (f8-f12)' },
  { t: 20.0, key: 'done', value: 11 },
]

const workflowScenario: Scenario = {
  id: 'workflow',
  duration: 24,
  nodes: wfNodes,
  edges: wfEdges,
  packets: wfPackets,
  works: wfWorks,
  logs: [
    { t: 0.2, text: '系统就绪：脚本调度 —— 规则、计数器、依赖全部写进代码', tone: 'system' },
    { t: 1.3, text: '① scanRepo：扫描仓库 → 12 个待改文件', tone: 'info' },
    { t: 2.5, text: '②③ groupByModule + topoSort：基础 → 网络 → 业务（依赖排序由代码保证）', tone: 'info' },
    { t: 2.9, text: '📜 脚本由 LLM 动态生成；一旦生成，DAG 即固化 —— dynamic workflow = 动态生成，静态执行', tone: 'success' },
    { t: 3.0, text: '依赖边浮现：基础→网络→业务，f1…f12 的开工顺序在运行前已由 topoSort 确定', tone: 'info' },
    { t: 3.1, text: '基础组 3 个文件并行改造', tone: 'info' },
    { t: 5.3, text: 'f2 测试失败 → 脚本自动重试（retries.f2: 0→1）', tone: 'info' },
    { t: 7.5, text: '✓ 依赖解锁：基础组全部通过 → 网络组的依赖边激活', tone: 'success' },
    { t: 10.7, text: 'f5 第 1 次失败 → 自动重试（计数器在脚本变量，不靠 LLM 记忆）', tone: 'info' },
    { t: 12.9, text: 'f5 第 2 次失败 → 再重试（retries.f5 = 2）', tone: 'info' },
    { t: 13.1, text: '⚡ 脚本内嵌动态决策：常规修复连败 → 自动升级更强模型重试（策略写在代码里）', tone: 'info' },
    { t: 15.1, text: '⛔ f5 连续失败 3 次 —— 代码熔断：终止并写入风险报告，规则强制执行', tone: 'warn' },
    { t: 15.5, text: '✓ 依赖解锁：网络组收官 → 业务组依赖边激活', tone: 'success' },
    { t: 15.7, text: 'f5 熔断已隔离进风险报告 —— 组屏障等全组落定（通过或熔断），而非全员成功 → 业务组照常解锁', tone: 'info' },
    { t: 16.1, text: '业务组 5 个文件并行开工（无人值守）', tone: 'info' },
    { t: 20.5, text: '⑦ 汇总：11 个文件升级完成 + 1 份风险报告 —— 状态全在 Runtime，顶层对话零污染', tone: 'info' },
    { t: 23.0, text: '任务完成 ✓ 可复现性最高：同一代码库跑两次，流程完全一致', tone: 'success' },
  ],
  stats: wfStats,
  script: wfScript,
  vars: wfVars,
}

// ============================================================
// Claude Code Dynamic Workflow 六大官方标准典型模式
// （源自 Anthropic《A harness for every task》，模式可自由嵌套组合）
// 组合实战（full）之上的 6 种紧凑场景：
// 保留 script + runtime 节点，8–14 行脚本 + 高亮区间
// ============================================================

// ------------------------------------------------------------
// 模式① 分类路由 Classify-and-Act —— 低成本分类 + 按类别路由
// 扫描(纯代码) → 分类Agent(Haiku) → 简单→Haiku / 复杂→Sonnet / 配置→纯代码通道
// ------------------------------------------------------------

const classifyScenario: Scenario = {
  id: 'classify',
  duration: 13,
  nodes: [
    { id: 'user', label: '用户', sub: 'SDK 升级需求方', x: 75, y: 200, kind: 'user' as const },
    { id: 'human', label: '人类', sub: '中途难以干预', x: 75, y: 430, kind: 'human' as const },
    { id: 'script', label: 'JS 编排脚本', sub: '分类路由 · 前置路由', x: 220, y: 250, kind: 'script' as const },
    { id: 'runtime', label: 'Runtime 状态', sub: '路由表 · 进度', x: 220, y: 445, kind: 'runtime' as const },
    { id: 'cls', label: '分类 Agent · Haiku', sub: '低成本归类 · 一次调用', x: 425, y: 250, kind: 'sub' as const, appearAt: 2.2 },
    { id: 'w_fast', label: 'Worker · Haiku', sub: '快车道 · 简单 ×2', x: 645, y: 95, kind: 'sub' as const, appearAt: 4.4 },
    { id: 'w_slow', label: 'Worker · Sonnet', sub: '慢车道 · 复杂 ×2', x: 645, y: 255, kind: 'sub' as const, appearAt: 4.4 },
    { id: 'w_auto', label: '纯代码通道', sub: '配置 ×1 · 0 token', x: 645, y: 415, kind: 'runtime' as const, appearAt: 4.4 },
  ],
  edges: [
    { from: 'user', to: 'script' },
    { from: 'human', to: 'script', dashed: true },
    { from: 'script', to: 'runtime', dashed: true },
    { from: 'script', to: 'cls' },
    { from: 'cls', to: 'w_fast' },
    { from: 'cls', to: 'w_slow' },
    { from: 'cls', to: 'w_auto' },
  ],
  packets: [
    { t: 0.5, from: 'user', to: 'script', dur: 0.8, kind: 'task', label: 'SDK 升级 ×5 文件' },
    { t: 2.2, from: 'script', to: 'cls', dur: 0.6, kind: 'task', label: '分类 5 个文件' },
    { t: 4.5, from: 'cls', to: 'w_fast', dur: 0.7, kind: 'task', label: '简单 ×2' },
    { t: 4.6, from: 'cls', to: 'w_slow', dur: 0.7, kind: 'task', label: '复杂 ×2' },
    { t: 4.7, from: 'cls', to: 'w_auto', dur: 0.7, kind: 'task', label: '配置 ×1' },
    { t: 6.4, from: 'w_auto', to: 'script', dur: 0.6, kind: 'result', label: '配置 ✓ · 0 token' },
    { t: 7.2, from: 'w_fast', to: 'script', dur: 0.6, kind: 'result', label: '简单 ×2 ✓' },
    { t: 9.3, from: 'w_slow', to: 'script', dur: 0.6, kind: 'result', label: '复杂 ×2 ✓' },
    { t: 7.0, from: 'script', to: 'runtime', dur: 0.4, kind: 'state' },
    { t: 7.8, from: 'script', to: 'runtime', dur: 0.4, kind: 'state' },
    { t: 9.9, from: 'script', to: 'runtime', dur: 0.4, kind: 'state', label: '5/5 完成' },
    { t: 10.8, from: 'script', to: 'user', dur: 1.0, kind: 'final', label: '升级总结' },
  ],
  works: [
    { t: 1.3, node: 'script', dur: 0.9 },
    { t: 2.8, node: 'cls', dur: 1.6 },
    { t: 5.2, node: 'w_fast', dur: 2.0 },
    { t: 5.4, node: 'w_auto', dur: 1.0 },
    { t: 5.3, node: 'w_slow', dur: 4.0 },
    { t: 10.0, node: 'script', dur: 0.6 },
  ],
  logs: [
    { t: 0.2, text: '分类路由：低成本分类 Agent 先归类，再按类别路由到专门分支 —— 支持前置路由，也支持后置结果分类汇总', tone: 'system' },
    { t: 1.3, text: '① 扫描仓库：5 个待改文件（纯代码步骤）', tone: 'info' },
    { t: 2.2, text: '② 分类 Agent 是 Haiku 轻量模型：一次调用给 5 个文件打标签（便宜）', tone: 'info' },
    { t: 4.5, text: '路由结果：简单 ×2 → Haiku 快车道 · 复杂 ×2 → Sonnet 慢车道 · 配置 ×1 → 纯代码通道', tone: 'info' },
    { t: 6.4, text: '纯配置走纯代码通道：0 次 LLM 调用，0 token', tone: 'success' },
    { t: 7.2, text: '⚡ 脚本内嵌动态决策：简单活不给贵模型 —— 路由节省 ~40% token', tone: 'success' },
    { t: 9.3, text: '复杂文件由 Sonnet 精工慢改，慢车道物有所值', tone: 'info' },
    { t: 11.6, text: '复盘：分支判断逻辑固化在 Runtime 脚本，不靠 LLM 轮次记忆 —— 大批量文件也不会丢失路由规则', tone: 'system' },
  ],
  stats: [
    { t: 7.0, key: 'ctx', delta: 6 },
    { t: 7.8, key: 'ctx', delta: 6 },
    { t: 9.9, key: 'ctx', delta: 6 },
    { t: 7.2, key: 'saved', delta: 40 },
  ],
  script: {
    file: 'classify-act.workflow.js',
    lines: [
      `// classify-act.workflow.js —— 分类 → 专门路径（前置路由）`,
      `const files = await scanRepo('./src')       // 5 个待改文件`,
      `const kind = await classifier.tag(files)    // ① Haiku 低成本归类`,
      `const jobs = [`,
      `  ...kind.simple.map(f => () => llm.haiku.transform(f)),   // ② 快车道`,
      `  ...kind.complex.map(f => () => llm.sonnet.transform(f)), // ③ 慢车道`,
      `  ...kind.config.map(f => () => codemod(f)),               // ④ 纯代码 0 token`,
      `]`,
      `const results = await parallel(jobs.map(run => run()))     // 路由规则固化在代码`,
      `return summary(results)                     // ⑤ 汇总（后置分类可选）`,
    ],
    spans: [
      { t0: 1.3, t1: 2.2, line: 2 },
      { t0: 2.8, t1: 4.4, line: 3 },
      { t0: 5.2, t1: 7.2, line: 5 },
      { t0: 5.3, t1: 9.3, line: 6 },
      { t0: 5.4, t1: 6.4, line: 7 },
      { t0: 10.0, t1: 10.6, line: 9 },
      { t0: 10.8, t1: 11.6, line: 10 },
    ],
  },
  vars: [
    { t: 2.0, key: 'files', value: 5 },
    { t: 4.5, key: 'route.simple', value: '×2 → Haiku' },
    { t: 4.6, key: 'route.complex', value: '×2 → Sonnet' },
    { t: 4.7, key: 'route.config', value: '×1 → 纯代码' },
    { t: 7.2, key: 'saved', value: '~40% token' },
  ],
  statDisplays: [
    { key: 'done', label: '已完成文件组', max: 3 },
    { key: 'conc', label: '当前并发', max: 3 },
    { key: 'saved', label: '⚡ 节省 Token', max: 40, format: (v) => `${Math.round(v)}%`, tone: 'ok' },
    { key: 'ctx', label: 'Runtime 状态', max: 100, format: (v) => `${Math.round(v)}%`, tone: 'ok' },
  ],
}

// ------------------------------------------------------------
// 模式② 扇出-聚合 Fan-out-and-Synthesize —— 并行 + 屏障等齐再汇总（最常用）
// 规划拆分 → 8 Worker 并行(独立上下文) → ⏸屏障等齐 8/8 → 汇总合成
// ------------------------------------------------------------

const fanoutEnds = [6.0, 6.5, 7.0, 7.4, 7.8, 8.2, 8.6, 9.4] // 8 个 Worker 错落完成

const fanoutScenario: Scenario = {
  id: 'fanout',
  duration: 15,
  nodes: [
    { id: 'user', label: '用户', sub: 'SDK 升级需求方', x: 70, y: 110, kind: 'user' as const },
    { id: 'human', label: '人类', sub: '中途难以干预', x: 70, y: 330, kind: 'human' as const },
    { id: 'script', label: 'JS 编排脚本', sub: '扇出 · 屏障 · 聚合', x: 200, y: 240, kind: 'script' as const },
    { id: 'runtime', label: 'Runtime 状态', sub: '中间结果 · 主对话零污染', x: 200, y: 440, kind: 'runtime' as const },
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `w${i + 1}`,
      label: `Worker ${i + 1}`,
      sub: '独立上下文',
      x: 405 + (i % 2) * 105,
      y: 55 + Math.floor(i / 2) * 115,
      kind: 'sub' as const,
      appearAt: 2.8,
    })),
    { id: 'barrier', label: '⏸ 屏障 Barrier', sub: '纯代码 · 等齐 8/8', x: 655, y: 215, kind: 'runtime' as const, appearAt: 3.0 },
    { id: 'synth', label: 'Worker · 汇总合成', sub: '屏障放行后才开工', x: 785, y: 215, kind: 'sub' as const, appearAt: 9.9 },
  ],
  edges: [
    { from: 'user', to: 'script' },
    { from: 'human', to: 'script', dashed: true },
    { from: 'script', to: 'runtime', dashed: true },
    ...Array.from({ length: 8 }, (_, i) => ({ from: 'script', to: `w${i + 1}`, faint: true, dashed: true })),
    { from: 'barrier', to: 'synth' },
  ],
  packets: [
    { t: 0.5, from: 'user', to: 'script', dur: 0.8, kind: 'task', label: '全仓 SDK 升级 · 扇出' },
    ...fanoutEnds.map((_, i) => ({
      t: 2.6 + i * 0.05, from: 'script', to: `w${i + 1}`, dur: 0.5, kind: 'task' as const,
      label: i === 0 ? '并行派发 ×8' : undefined,
    })),
    ...fanoutEnds.flatMap((end, i) => [
      { t: end, from: `w${i + 1}`, to: 'script', dur: 0.5, kind: 'result' as const, label: i === 7 ? '最后 1 个 ✓' : undefined },
      { t: end + 0.3, from: 'script', to: 'runtime', dur: 0.4, kind: 'state' as const, label: `中间结果 ${i + 1}/8` },
    ]),
    { t: 9.9, from: 'barrier', to: 'script', dur: 0.5, kind: 'state', label: '8/8 ✓ 放行' },
    { t: 10.4, from: 'script', to: 'synth', dur: 0.6, kind: 'task', label: '汇总合成' },
    { t: 12.6, from: 'synth', to: 'script', dur: 0.6, kind: 'result', label: '汇总 ✓', countsDone: false },
    { t: 13.2, from: 'script', to: 'runtime', dur: 0.4, kind: 'state' },
    { t: 13.6, from: 'script', to: 'user', dur: 1.0, kind: 'final', label: '变更清单（8/8）' },
  ],
  works: [
    { t: 1.2, node: 'script', dur: 1.0 },
    ...fanoutEnds.map((end, i) => ({ t: 3.2 + i * 0.05, node: `w${i + 1}`, dur: end - 3.2 - i * 0.05 })),
    { t: 9.4, node: 'barrier', dur: 0.5 }, // 等齐后才激活，不计入并行并发
    { t: 11.0, node: 'synth', dur: 1.6 },
    { t: 13.0, node: 'script', dur: 0.4 },
  ],
  logs: [
    { t: 0.2, text: '扇出-聚合：大任务拆成大量独立子任务并发执行 —— 最常用的模式', tone: 'system' },
    { t: 1.2, text: '① 规划拆分：8 个相互独立的改造子任务', tone: 'info' },
    { t: 2.6, text: '② 并行扇出：每个 Worker 独立干净上下文，中间结果全部写入 Runtime —— 主对话零污染', tone: 'info' },
    { t: 8.8, text: '⏸ 屏障：7/8 完成，等待最后 1 个 Worker —— Barrier 不等齐不汇总', tone: 'warn' },
    { t: 9.9, text: '✓ 屏障放行：8/8 全部完成 → 进入汇总合成（Synthesize）', tone: 'success' },
    { t: 12.6, text: '③ 汇总合成：只有最终汇总回流主对话，中间数据留在脚本变量', tone: 'info' },
    { t: 14.0, text: '官方标杆：Bun 百万行代码库跨语言迁移就是扇出-聚合 —— 规模靠屏障与 Runtime 变量扛住', tone: 'system' },
  ],
  stats: fanoutEnds.map((end) => ({ t: end + 0.3, key: 'ctx', delta: 5 })),
  script: {
    file: 'fanout-synthesize.workflow.js',
    lines: [
      `// fanout-synthesize.workflow.js —— 扇出 + 屏障聚合`,
      `const files = await scanRepo('./src')        // ① 扫描仓库`,
      `const tasks = plan.split(files, 8)          // ② 规划拆分 ×8`,
      `const jobs = tasks.map(t => worker.run(t))  // ③ 并行扇出：独立上下文`,
      `runtime.save('partial', jobs)               //    中间结果存 Runtime`,
      `const results = await barrier.all(jobs)     // ④ 屏障：不等齐不汇总`,
      `const merged = await synthesizer.merge(results) // ⑤ 汇总合成`,
      `return report(merged)                       // ⑥ 仅汇总回流主对话`,
    ],
    spans: [
      { t0: 1.2, t1: 2.2, line: 2 },
      { t0: 2.2, t1: 2.6, line: 3 },
      { t0: 3.2, t1: 9.4, line: 4 },
      { t0: 9.4, t1: 9.9, line: 6 },
      { t0: 11.0, t1: 12.6, line: 7 },
      { t0: 13.0, t1: 13.6, line: 8 },
    ],
  },
  vars: [
    { t: 2.4, key: 'tasks', value: 8 },
    { t: 6.5, key: 'barrier', value: '2/8' },
    { t: 7.8, key: 'barrier', value: '5/8' },
    { t: 9.4, key: 'barrier', value: '8/8 ✓' },
    { t: 13.2, key: 'merged', value: '✓' },
  ],
  statDisplays: [
    { key: 'done', label: '已完成子任务', max: 8 },
    { key: 'conc', label: '并行 Worker', max: 8 },
    { key: 'msgs', label: '消息总数', max: 30 },
    { key: 'ctx', label: 'Runtime 状态', max: 100, format: (v) => `${Math.round(v)}%`, tone: 'ok' },
  ],
}

// ------------------------------------------------------------
// 模式③ 对抗验证 Adversarial Verification —— 生产者 vs 隔离审查者
// Worker 产出 → 校验Agent(完全隔离)对抗审查 → 发现缺陷打回重做 → 过审放行
// ------------------------------------------------------------

const adversarialScenario: Scenario = {
  id: 'adversarial',
  duration: 16,
  nodes: [
    { id: 'user', label: '用户', sub: 'SDK 升级需求方', x: 75, y: 110, kind: 'user' as const },
    { id: 'human', label: '人类', sub: '中途难以干预', x: 75, y: 330, kind: 'human' as const },
    { id: 'script', label: 'JS 编排脚本', sub: '对抗验证 · 送审/打回', x: 215, y: 250, kind: 'script' as const },
    { id: 'runtime', label: 'Runtime 状态', sub: '缺陷记录 · 过审进度', x: 215, y: 445, kind: 'runtime' as const },
    { id: 'w_dev', label: 'Worker · 改造', sub: '生产者', x: 520, y: 140, kind: 'sub' as const, appearAt: 1.8 },
    { id: 'w_sec', label: '校验 Agent', sub: '完全隔离 · 对抗审查', x: 520, y: 380, kind: 'sub' as const, appearAt: 4.4 },
  ],
  edges: [
    { from: 'user', to: 'script' },
    { from: 'human', to: 'script', dashed: true },
    { from: 'script', to: 'runtime', dashed: true },
    { from: 'script', to: 'w_dev' },
    { from: 'w_dev', to: 'w_sec' },
    { from: 'w_sec', to: 'w_dev', dashed: true },
    { from: 'w_sec', to: 'script' },
  ],
  packets: [
    { t: 0.5, from: 'user', to: 'script', dur: 0.8, kind: 'task', label: 'SDK 升级 · 对抗验证' },
    { t: 1.8, from: 'script', to: 'w_dev', dur: 0.6, kind: 'task', label: '改造 f3' },
    { t: 4.2, from: 'w_dev', to: 'w_sec', dur: 0.6, kind: 'result', label: '送审 v1', countsDone: false },
    { t: 6.2, from: 'w_sec', to: 'w_dev', dur: 0.6, kind: 'task', label: '❌ 打回 · 边界缺陷' },
    { t: 8.4, from: 'w_dev', to: 'w_sec', dur: 0.6, kind: 'result', label: '送审 v2', countsDone: false },
    { t: 10.2, from: 'w_sec', to: 'script', dur: 0.6, kind: 'result', label: '✅ f3 过审' },
    { t: 10.8, from: 'script', to: 'runtime', dur: 0.4, kind: 'state', label: 'f3 ✓ 过审' },
    { t: 10.8, from: 'script', to: 'w_dev', dur: 0.6, kind: 'task', label: '改造 f7' },
    { t: 12.0, from: 'w_dev', to: 'w_sec', dur: 0.5, kind: 'result', label: '送审', countsDone: false },
    { t: 13.6, from: 'w_sec', to: 'script', dur: 0.6, kind: 'result', label: '✅ f7 一次通过' },
    { t: 14.4, from: 'script', to: 'runtime', dur: 0.4, kind: 'state' },
    { t: 14.8, from: 'script', to: 'user', dur: 1.0, kind: 'final', label: '2 文件过审报告' },
  ],
  works: [
    { t: 1.2, node: 'script', dur: 0.6 },
    { t: 2.4, node: 'w_dev', dur: 1.8 },
    { t: 4.8, node: 'w_sec', dur: 1.4 },
    { t: 6.8, node: 'w_dev', dur: 1.6 },
    { t: 9.0, node: 'w_sec', dur: 1.2 },
    { t: 11.4, node: 'w_dev', dur: 0.6 },
    { t: 12.5, node: 'w_sec', dur: 1.1 },
    { t: 14.2, node: 'script', dur: 0.4 },
  ],
  logs: [
    { t: 0.2, text: '对抗验证：每个生产者配套独立校验 Agent —— 上下文完全隔离，按固定标准主动挑漏洞', tone: 'system' },
    { t: 1.2, text: '① 生产者改造 f3 → 送独立校验 Agent 对抗审查', tone: 'info' },
    { t: 5.0, text: '校验 Agent 主动质疑结论：发现边界条件未处理 → 打回（生产者看不到审查过程）', tone: 'warn' },
    { t: 6.4, text: '缺陷报告回流 → 生产者带报告重做 v2', tone: 'info' },
    { t: 10.4, text: '✅ f3 过审：审查者点头才算完成', tone: 'success' },
    { t: 13.8, text: 'f7 一次通过 —— 对抗不是形式，是固定标准', tone: 'success' },
    { t: 15.2, text: '复盘：与锦标赛不同 —— 锦标赛多 Agent 同题竞技；对抗验证是生产者 vs 审查者固定角色分工', tone: 'system' },
  ],
  stats: [
    { t: 10.8, key: 'ctx', delta: 6 },
    { t: 14.4, key: 'ctx', delta: 6 },
    { t: 6.2, key: 'retries', delta: 1 },
  ],
  script: {
    file: 'adversarial-verify.workflow.js',
    lines: [
      `// adversarial-verify.workflow.js —— 生产者 vs 审查者`,
      `for (const f of files) {`,
      `  let out = await worker.transform(f)     // ① 生产者产出`,
      `  while (true) {`,
      `    const v = await verifier.audit(out)   // ② 隔离上下文对抗审查`,
      `    if (v.pass) break                     // ③ 审查通过才放行`,
      `    out = await worker.revise(f, v.issues) // ④ 带缺陷报告重做`,
      `  }`,
      `  accepted.push(out)`,
      `}`,
    ],
    spans: [
      { t0: 1.2, t1: 1.8, line: 2 },
      { t0: 2.4, t1: 4.2, line: 3 },
      { t0: 4.8, t1: 6.2, line: 5 },
      { t0: 6.8, t1: 8.4, line: 7 },
      { t0: 9.0, t1: 10.2, line: 5 },
      { t0: 10.2, t1: 10.6, line: 6 },
      { t0: 11.4, t1: 12.0, line: 3 },
      { t0: 12.5, t1: 13.6, line: 5 },
      { t0: 13.6, t1: 14.0, line: 6 },
      { t0: 14.2, t1: 14.6, line: 9 },
    ],
  },
  vars: [
    { t: 1.6, key: 'files', value: 2 },
    { t: 6.4, key: 'defects.f3', value: 1 },
    { t: 10.6, key: 'f3', value: '✅ 过审' },
    { t: 14.0, key: 'f7', value: '✅ 一次通过' },
  ],
  statDisplays: [
    { key: 'done', label: '已过审文件', max: 2 },
    { key: 'conc', label: '当前并发', max: 2 },
    { key: 'retries', label: '对抗打回', max: 1 },
    { key: 'ctx', label: 'Runtime 状态', max: 100, format: (v) => `${Math.round(v)}%`, tone: 'ok' },
  ],
}

// ------------------------------------------------------------
// 模式④ 生成+筛选 Generate-and-Filter —— 先发散后收敛
// 4 Worker 并行生成候选 → 筛选Agent 按 rubric 打分/去重/过滤 → 精选 ×2
// ------------------------------------------------------------

const genfilterScenario: Scenario = {
  id: 'genfilter',
  duration: 13.5,
  nodes: [
    { id: 'user', label: '用户', sub: 'SDK 升级需求方', x: 75, y: 110, kind: 'user' as const },
    { id: 'human', label: '人类', sub: '中途难以干预', x: 75, y: 330, kind: 'human' as const },
    { id: 'script', label: 'JS 编排脚本', sub: '生成+筛选 · 发散收敛', x: 210, y: 250, kind: 'script' as const },
    { id: 'runtime', label: 'Runtime 状态', sub: '候选池 · 评分', x: 210, y: 445, kind: 'runtime' as const },
    { id: 'g1', label: 'Worker · 候选 A', sub: '并行生成', x: 460, y: 60, kind: 'sub' as const, appearAt: 2.2 },
    { id: 'g2', label: 'Worker · 候选 B', sub: '并行生成', x: 460, y: 155, kind: 'sub' as const, appearAt: 2.2 },
    { id: 'g3', label: 'Worker · 候选 C', sub: '并行生成', x: 460, y: 250, kind: 'sub' as const, appearAt: 2.2 },
    { id: 'g4', label: 'Worker · 候选 D', sub: '并行生成', x: 460, y: 345, kind: 'sub' as const, appearAt: 2.2 },
    { id: 'filt', label: '筛选 Agent', sub: 'rubric 打分 · 去重', x: 690, y: 200, kind: 'sub' as const, appearAt: 6.8 },
  ],
  edges: [
    { from: 'user', to: 'script' },
    { from: 'human', to: 'script', dashed: true },
    { from: 'script', to: 'runtime', dashed: true },
    ...['g1', 'g2', 'g3', 'g4'].map((id) => ({ from: 'script', to: id, faint: true, dashed: true })),
    { from: 'script', to: 'filt' },
  ],
  packets: [
    { t: 0.5, from: 'user', to: 'script', dur: 0.8, kind: 'task', label: '疑难 bug 修复 · 生成+筛选' },
    { t: 2.2, from: 'script', to: 'g1', dur: 0.5, kind: 'task', label: '生成候选 ×4' },
    { t: 2.3, from: 'script', to: 'g2', dur: 0.5, kind: 'task' },
    { t: 2.4, from: 'script', to: 'g3', dur: 0.5, kind: 'task' },
    { t: 2.5, from: 'script', to: 'g4', dur: 0.5, kind: 'task' },
    { t: 5.4, from: 'g4', to: 'script', dur: 0.5, kind: 'result', label: '候选 D', countsDone: false },
    { t: 5.6, from: 'g1', to: 'script', dur: 0.5, kind: 'result', label: '候选 A', countsDone: false },
    { t: 5.9, from: 'g2', to: 'script', dur: 0.5, kind: 'result', label: '候选 B', countsDone: false },
    { t: 6.2, from: 'g3', to: 'script', dur: 0.5, kind: 'result', label: '候选 C', countsDone: false },
    { t: 6.6, from: 'script', to: 'runtime', dur: 0.4, kind: 'state', label: '4 候选就绪' },
    { t: 7.0, from: 'script', to: 'filt', dur: 0.6, kind: 'task', label: 'rubric 打分筛选' },
    { t: 10.4, from: 'filt', to: 'script', dur: 0.6, kind: 'result', label: '评分 8.1 / 6.4 / 7.5重复 / 5.9', countsDone: false },
    { t: 10.8, from: 'filt', to: 'script', dur: 0.5, kind: 'result', label: '精选 ① A · 8.1' },
    { t: 11.1, from: 'filt', to: 'script', dur: 0.5, kind: 'result', label: '精选 ② B · 6.4' },
    { t: 11.6, from: 'script', to: 'runtime', dur: 0.4, kind: 'state', label: '精选 ×2' },
    { t: 12.2, from: 'script', to: 'user', dur: 1.0, kind: 'final', label: '最优候选 ×2（附评分）' },
  ],
  works: [
    { t: 1.2, node: 'script', dur: 1.0 },
    { t: 3.0, node: 'g1', dur: 2.6 },
    { t: 3.0, node: 'g2', dur: 2.9 },
    { t: 3.0, node: 'g3', dur: 3.2 },
    { t: 3.0, node: 'g4', dur: 2.4 },
    { t: 7.6, node: 'filt', dur: 2.8 },
    { t: 11.4, node: 'script', dur: 0.6 },
  ],
  logs: [
    { t: 0.2, text: '生成+筛选：先发散批量产出候选，再用标准化 rubric 过滤收敛', tone: 'system' },
    { t: 1.2, text: '① 发散：4 个 Worker 并行生成候选修复方案', tone: 'info' },
    { t: 6.6, text: '② 4 个候选就绪 → 交筛选 Agent', tone: 'info' },
    { t: 7.2, text: '收敛：rubric 打分、去重、过滤 —— rubric 是代码，不是感觉', tone: 'info' },
    { t: 10.6, text: 'C 与 A 思路重复 → 去重；D 5.9 低于阈值 6.0 → 淘汰', tone: 'warn' },
    { t: 11.3, text: '✅ 输出 A / B 两个高质量候选 —— 先发散后收敛', tone: 'success' },
  ],
  stats: [
    { t: 6.6, key: 'ctx', delta: 8 },
    { t: 11.6, key: 'ctx', delta: 6 },
  ],
  script: {
    file: 'generate-filter.workflow.js',
    lines: [
      `// generate-filter.workflow.js —— 先发散后收敛`,
      `const cands = await parallel([              // ① 批量生成 4 候选`,
      `  worker.planA(bug), worker.planB(bug),`,
      `  worker.planC(bug), worker.planD(bug),`,
      `])`,
      `const scored = await filter.score(cands, rubric) // ② 按 rubric 打分`,
      `const picked = dedup(scored).filter(s => s.score >= 6) // ③ 去重+阈值过滤`,
      `return picked.slice(0, 2)                   // ④ 输出 2 个高质量候选`,
    ],
    spans: [
      { t0: 1.2, t1: 2.2, line: 2 },
      { t0: 3.0, t1: 6.2, line: 3 },
      { t0: 7.6, t1: 10.4, line: 6 },
      { t0: 10.6, t1: 11.4, line: 7 },
      { t0: 11.6, t1: 12.0, line: 8 },
    ],
  },
  vars: [
    { t: 2.0, key: 'bug', value: 'f5 兼容' },
    { t: 6.6, key: 'cands', value: 4 },
    { t: 10.6, key: 'scores', value: '8.1/6.4/7.5/5.9' },
    { t: 11.6, key: 'picked', value: 'A · B' },
  ],
  statDisplays: [
    { key: 'done', label: '精选候选', max: 2 },
    { key: 'conc', label: '并行生成', max: 4 },
    { key: 'msgs', label: '协作消息数', max: 16 },
    { key: 'ctx', label: 'Runtime 状态', max: 100, format: (v) => `${Math.round(v)}%`, tone: 'ok' },
  ],
}

// ------------------------------------------------------------
// 模式⑤ 锦标赛 Tournament —— 隔离独立解题 + 两两 PK 淘汰
// 3 选手互不参考并行解题 → 评审成对对比：A>B → C>A → C 最优
// ------------------------------------------------------------

const tournamentScenario: Scenario = {
  id: 'tournament',
  duration: 14,
  nodes: [
    { id: 'user', label: '用户', sub: 'SDK 升级需求方', x: 75, y: 110, kind: 'user' as const },
    { id: 'human', label: '人类', sub: '中途难以干预', x: 75, y: 330, kind: 'human' as const },
    { id: 'script', label: 'JS 编排脚本', sub: '锦标赛 · 淘汰赛', x: 210, y: 250, kind: 'script' as const },
    { id: 'runtime', label: 'Runtime 状态', sub: '赛果记录', x: 210, y: 445, kind: 'runtime' as const },
    { id: 'pA', label: '选手 A', sub: '隔离独立解题', x: 460, y: 80, kind: 'sub' as const, appearAt: 2.2 },
    { id: 'pB', label: '选手 B', sub: '隔离独立解题', x: 460, y: 230, kind: 'sub' as const, appearAt: 2.2 },
    { id: 'pC', label: '选手 C', sub: '隔离独立解题', x: 460, y: 380, kind: 'sub' as const, appearAt: 2.2 },
    { id: 'judge', label: '评审 Agent', sub: '两两 PK · 成对对比', x: 690, y: 230, kind: 'sub' as const, appearAt: 6.8 },
  ],
  edges: [
    { from: 'user', to: 'script' },
    { from: 'human', to: 'script', dashed: true },
    { from: 'script', to: 'runtime', dashed: true },
    { from: 'script', to: 'pA' },
    { from: 'script', to: 'pB' },
    { from: 'script', to: 'pC' },
    { from: 'pA', to: 'judge', faint: true, dashed: true },
    { from: 'pB', to: 'judge', faint: true, dashed: true },
    { from: 'pC', to: 'judge', faint: true, dashed: true },
  ],
  packets: [
    { t: 0.5, from: 'user', to: 'script', dur: 0.8, kind: 'task', label: '算法优化 · 锦标赛' },
    { t: 2.2, from: 'script', to: 'pA', dur: 0.5, kind: 'task', label: '独立解题 ×3' },
    { t: 2.3, from: 'script', to: 'pB', dur: 0.5, kind: 'task' },
    { t: 2.4, from: 'script', to: 'pC', dur: 0.5, kind: 'task' },
    { t: 6.0, from: 'pA', to: 'judge', dur: 0.6, kind: 'result', label: '方案 A 提交', countsDone: false },
    { t: 6.4, from: 'pB', to: 'judge', dur: 0.6, kind: 'result', label: '方案 B 提交', countsDone: false },
    { t: 6.8, from: 'pC', to: 'judge', dur: 0.6, kind: 'result', label: '方案 C 提交', countsDone: false },
    { t: 7.4, from: 'script', to: 'judge', dur: 0.6, kind: 'task', label: '两两 PK 评审' },
    { t: 9.2, from: 'judge', to: 'script', dur: 0.5, kind: 'chat', label: 'PK: A>B' },
    { t: 11.0, from: 'judge', to: 'script', dur: 0.5, kind: 'chat', label: 'PK: C>A' },
    { t: 11.6, from: 'script', to: 'runtime', dur: 0.4, kind: 'state', label: 'winner: C' },
    { t: 12.2, from: 'judge', to: 'script', dur: 0.6, kind: 'result', label: '🏆 最优方案 C' },
    { t: 13.0, from: 'script', to: 'user', dur: 1.0, kind: 'final', label: '最优方案 C（淘汰赛实录）' },
  ],
  works: [
    { t: 1.2, node: 'script', dur: 0.9 },
    { t: 3.0, node: 'pA', dur: 3.0 },
    { t: 3.0, node: 'pB', dur: 3.4 },
    { t: 3.0, node: 'pC', dur: 3.8 },
    { t: 8.0, node: 'judge', dur: 1.2 },
    { t: 9.8, node: 'judge', dur: 1.2 },
    { t: 12.6, node: 'script', dur: 0.4 },
  ],
  logs: [
    { t: 0.2, text: '锦标赛：N 个 Agent 互不参考、独立并行解同一题 —— 评审成对对比逐层淘汰', tone: 'system' },
    { t: 1.2, text: '① 3 个选手隔离开工：没有实时交流，互相看不到对方方案', tone: 'info' },
    { t: 7.4, text: '② 评审 Agent 两两 PK —— 成对对比比单一绝对打分更稳定', tone: 'info' },
    { t: 9.3, text: '半决赛：A vs B → A 胜，B 当场淘汰', tone: 'info' },
    { t: 11.1, text: '决赛：A vs C → C 胜 → C 最优 🏆', tone: 'success' },
    { t: 12.4, text: '全程零交流 —— 事后 PK，不是席间讨论（对比 Agent Team 的实时协商）', tone: 'system' },
  ],
  stats: [{ t: 11.6, key: 'ctx', delta: 6 }],
  script: {
    file: 'tournament.workflow.js',
    lines: [
      `// tournament.workflow.js —— 隔离解题 + 两两 PK`,
      `const players = [agentA, agentB, agentC]    // 互不参考`,
      `const sols = await parallel(players.map(`,
      `  p => p.solve(task)                        // ① 隔离独立解题`,
      `))`,
      `let winner = sols[0]`,
      `for (const s of sols.slice(1)) {            // ② 淘汰赛`,
      `  winner = await judge.pk(winner, s)        //    成对对比更稳定`,
      `}`,
      `return winner                               // ③ 最优方案`,
    ],
    spans: [
      { t0: 1.2, t1: 2.2, line: 2 },
      { t0: 3.0, t1: 6.8, line: 4 },
      { t0: 8.0, t1: 9.2, line: 8 },
      { t0: 9.8, t1: 11.0, line: 8 },
      { t0: 11.6, t1: 12.6, line: 10 },
    ],
  },
  vars: [
    { t: 2.0, key: 'task', value: '排序算法优化' },
    { t: 7.0, key: 'sols', value: 3 },
    { t: 9.4, key: 'round 1', value: 'A>B' },
    { t: 11.2, key: 'round 2', value: 'C>A 🏆' },
  ],
  statDisplays: [
    { key: 'done', label: '最优方案', max: 1 },
    { key: 'conc', label: '并行解题', max: 3 },
    { key: 'msgs', label: '赛会消息数', max: 13 },
    { key: 'ctx', label: 'Runtime 状态', max: 100, format: (v) => `${Math.round(v)}%`, tone: 'ok' },
  ],
}

// ------------------------------------------------------------
// 模式⑥ 循环直至达标 Loop Until Done —— 条件循环，停止条件在代码里
// 修复 → 跑测试(纯代码) → 失败自动修复 → 再测 … → 全部通过 → 退出循环
// ------------------------------------------------------------

const loopScenario: Scenario = {
  id: 'loop',
  duration: 14.8,
  nodes: [
    { id: 'user', label: '用户', sub: 'SDK 升级需求方', x: 75, y: 110, kind: 'user' as const },
    { id: 'human', label: '人类', sub: '中途难以干预', x: 75, y: 330, kind: 'human' as const },
    { id: 'script', label: 'JS 编排脚本', sub: '条件循环 · while 达标', x: 215, y: 250, kind: 'script' as const },
    { id: 'runtime', label: 'Runtime 状态', sub: '计数器 · 终止条件', x: 215, y: 445, kind: 'runtime' as const },
    { id: 'w_fix', label: 'Worker · 修复', sub: '自动修复', x: 520, y: 140, kind: 'sub' as const, appearAt: 1.8 },
    { id: 'runner', label: '⏱ 测试执行器', sub: '纯代码 · 0 token', x: 520, y: 400, kind: 'runtime' as const, appearAt: 4.2 },
  ],
  edges: [
    { from: 'user', to: 'script' },
    { from: 'human', to: 'script', dashed: true },
    { from: 'script', to: 'runtime', dashed: true },
    { from: 'script', to: 'w_fix' },
    { from: 'w_fix', to: 'runner' },
    { from: 'runner', to: 'w_fix', dashed: true },
    { from: 'runner', to: 'script' },
  ],
  packets: [
    { t: 0.5, from: 'user', to: 'script', dur: 0.8, kind: 'task', label: 'f5 修复 · 条件循环' },
    { t: 1.8, from: 'script', to: 'w_fix', dur: 0.6, kind: 'task', label: '修复 f5 · v1' },
    { t: 3.8, from: 'w_fix', to: 'script', dur: 0.5, kind: 'result', label: '修复 v1', countsDone: false },
    { t: 4.4, from: 'script', to: 'runner', dur: 0.4, kind: 'task', label: '跑测试' },
    { t: 5.4, from: 'runner', to: 'script', dur: 0.5, kind: 'result', label: '❌ 失败 ×2', countsDone: false },
    { t: 5.9, from: 'script', to: 'runtime', dur: 0.4, kind: 'state', label: 'round 1 · fail' },
    { t: 6.0, from: 'script', to: 'w_fix', dur: 0.6, kind: 'task', label: 'v2 · 附失败日志' },
    { t: 7.4, from: 'w_fix', to: 'script', dur: 0.5, kind: 'result', label: '修复 v2', countsDone: false },
    { t: 8.0, from: 'script', to: 'runner', dur: 0.4, kind: 'task', label: '跑测试' },
    { t: 9.0, from: 'runner', to: 'script', dur: 0.5, kind: 'result', label: '❌ 失败 ×1', countsDone: false },
    { t: 9.4, from: 'script', to: 'runtime', dur: 0.4, kind: 'state', label: 'round 2 · fail' },
    { t: 9.6, from: 'script', to: 'w_fix', dur: 0.6, kind: 'task', label: 'v3' },
    { t: 10.8, from: 'w_fix', to: 'script', dur: 0.5, kind: 'result', label: '修复 v3', countsDone: false },
    { t: 11.4, from: 'script', to: 'runner', dur: 0.4, kind: 'task', label: '跑测试' },
    { t: 12.4, from: 'runner', to: 'script', dur: 0.5, kind: 'result', label: '✅ 全部通过' },
    { t: 12.9, from: 'script', to: 'runtime', dur: 0.4, kind: 'state', label: 'round 3 · pass ✓' },
    { t: 13.4, from: 'script', to: 'user', dur: 1.0, kind: 'final', label: 'f5 修复 + 测试报告' },
  ],
  works: [
    { t: 1.2, node: 'script', dur: 0.6 },
    { t: 2.4, node: 'w_fix', dur: 1.4 },
    { t: 4.8, node: 'runner', dur: 0.6 },
    { t: 6.6, node: 'w_fix', dur: 0.8 },
    { t: 8.4, node: 'runner', dur: 0.6 },
    { t: 10.2, node: 'w_fix', dur: 0.6 },
    { t: 11.8, node: 'runner', dur: 0.6 },
    { t: 13.0, node: 'script', dur: 0.4 },
  ],
  logs: [
    { t: 0.2, text: '条件循环：执行任务 → 条件判断 → 不满足则重试，直到停止条件达成', tone: 'system' },
    { t: 1.2, text: '① 无固定迭代次数：while(!testsPass && retries<MAX) —— 计数器与终止条件都在代码里', tone: 'info' },
    { t: 4.4, text: '② 跑测试 —— 纯代码执行器，不调 LLM', tone: 'info' },
    { t: 5.6, text: '❌ 第 1 轮未过 → 自动修复（计数器在脚本变量，不靠 LLM 记忆）', tone: 'warn' },
    { t: 9.2, text: '❌ 第 2 轮仍有 1 个失败 → 终止条件未达成，继续循环', tone: 'warn' },
    { t: 12.6, text: '✓ 第 3 轮全部通过 → 停止条件达成，循环退出', tone: 'success' },
    { t: 13.8, text: '复盘：计数器与终止条件写在 JS 脚本里强制生效 —— Subagent 把计数器放父上下文，长链路极易遗忘', tone: 'system' },
  ],
  stats: [
    { t: 5.6, key: 'retries', delta: 1 },
    { t: 9.2, key: 'retries', delta: 1 },
    { t: 5.9, key: 'ctx', delta: 5 },
    { t: 9.4, key: 'ctx', delta: 5 },
    { t: 12.9, key: 'ctx', delta: 6 },
  ],
  script: {
    file: 'loop-until-done.workflow.js',
    lines: [
      `// loop-until-done.workflow.js —— 条件循环`,
      `const MAX = 3                               // 重试上限兜底`,
      `let retries = 0, testsPass = false`,
      `while (!testsPass && retries < MAX) {       // ① 无固定迭代次数`,
      `  await worker.fix('f5', lastErrors)        // ② 自动修复`,
      `  const r = await runner.test('f5')         // ③ 纯代码跑测试`,
      `  testsPass = r.pass                        // ④ 条件判断`,
      `  retries++`,
      `}`,
      `return report(testsPass)                    // ⑤ 达标才交付`,
    ],
    spans: [
      { t0: 1.2, t1: 1.8, line: 3 },
      { t0: 2.4, t1: 3.8, line: 5 },
      { t0: 4.8, t1: 5.4, line: 6 },
      { t0: 5.4, t1: 5.9, line: 7 },
      { t0: 6.6, t1: 7.4, line: 5 },
      { t0: 8.4, t1: 9.0, line: 6 },
      { t0: 10.2, t1: 10.8, line: 5 },
      { t0: 11.8, t1: 12.4, line: 6 },
      { t0: 12.4, t1: 12.9, line: 7 },
      { t0: 13.0, t1: 13.4, line: 10 },
    ],
  },
  vars: [
    { t: 1.6, key: 'testsPass', value: 'false' },
    { t: 5.9, key: 'retries', value: 1 },
    { t: 9.4, key: 'retries', value: 2 },
    { t: 12.9, key: 'testsPass', value: 'true ✓' },
  ],
  statDisplays: [
    { key: 'done', label: '修复验收', max: 1 },
    { key: 'conc', label: '当前并发', max: 2 },
    { key: 'retries', label: '循环重试', max: 3 },
    { key: 'ctx', label: 'Runtime 状态', max: 100, format: (v) => `${Math.round(v)}%`, tone: 'ok' },
  ],
}

// 模式注册表：full 指向组合实战（12 文件静态 DAG：Fan-out + Loop + 对抗式测试）
export const workflowPatterns: Record<PatternId, Scenario> = {
  full: workflowScenario,
  classify: classifyScenario,
  fanout: fanoutScenario,
  adversarial: adversarialScenario,
  genfilter: genfilterScenario,
  tournament: tournamentScenario,
  loop: loopScenario,
}

export const patternMetas: PatternMeta[] = [
  {
    id: 'full',
    cn: '组合实战 · Fan-out + Loop',
    en: 'Combo · Fan-out + Loop',
    topo: 'topoSort 依赖图 ─┬─ 基础组 ×3 ─┐\n　　　　　　　　　　├─ 网络组 ×4 ─┼→ 组屏障 → 汇总 + 风险报告\n　　　　　　　　　　└─ 业务组 ×5 ─┘  失败循环重试 ×3 → 熔断',
    oneLiner: '单一模式很少单独成立，组合才是工业界常态：本场景 = 扇出-聚合（12 文件并行 + 组屏障）+ 循环直至达标（失败重试 ≤3）+ 对抗式测试（改造后单测验证）。',
    scenes: ['12 文件 SDK 大版本升级完整实战：LLM 生成脚本后固化为静态拓扑，逐组解锁执行'],
    vsNote: 'Subagent / Agent Team：LLM 承担编排决策；Dynamic Workflow：调度逻辑外置到 Runtime JS 脚本，模型仅作为任务执行者。',
  },
  {
    id: 'classify',
    cn: '分类路由模式',
    en: 'Classify-and-Act',
    topo: '输入 → 分类Agent(Haiku) ─┬─ 简单 → Haiku 快车道\n　　　　　　　　　　　　　　　├─ 复杂 → Sonnet 慢车道\n　　　　　　　　　　　　　　　└─ 配置 → 纯代码通道(0 token)',
    oneLiner: '先用低成本 Agent 对任务/文件/问题归类，按类型分发不同处理逻辑；支持前置路由，也支持后置结果分类汇总。',
    scenes: [
      '批量工单 / Issue 分拣：bug、需求、文档问题分流处理',
      '代码仓库文件分类：业务代码、配置、测试脚本执行不同扫描规则',
      '自动区分简单修复与大型重构，分配不同模型算力',
    ],
    vsNote: '分支判断逻辑固化在 Runtime 脚本，不靠 LLM 轮次记忆 —— 大批量文件也不会丢失路由规则。',
  },
  {
    id: 'fanout',
    cn: '扇出-聚合（并行屏障）',
    en: 'Fan-out-and-Synthesize',
    topo: '规划拆分 ─┬─ Worker 1 ─┐\n　　　　　　├─   ……      ├→ ⏸ 屏障(等齐) → 汇总合成\n　　　　　　└─ Worker 8 ─┘',
    oneLiner: '大任务拆成大量独立子任务并发执行；Synthesize 是屏障（Barrier），必须等所有并行 Agent 结束才进入汇总；每个 Worker 独立干净上下文，中间结果保存在 Runtime，不污染主会话窗口。官方标杆案例：Bun 百万行代码库跨语言迁移。',
    scenes: [
      '全仓库批量 SDK 升级、多文件并行改造',
      '遍历 src 目录所有文件并行安全审计',
      '批量接口文档生成、模块依赖梳理',
    ],
    vsNote: '普通 Subagent 所有子任务日志灌入父上下文、规模上涨必然溢出；DW 扇出中间数据留在脚本变量，仅最终汇总回流主对话。',
  },
  {
    id: 'adversarial',
    cn: '对抗验证模式',
    en: 'Adversarial Verification',
    topo: 'Worker(产出) → 校验Agent(隔离对抗审查)\n　　↑─────── 发现缺陷打回重做 ───────┘',
    oneLiner: '每个执行任务的 Agent 配套一个完全隔离的验证 Agent；校验者按固定标准主动挑漏洞、质疑结论，发现缺陷触发重试。',
    scenes: [
      '漏洞扫描结果二次核验，消除误报',
      '代码重构完成后安全 / 性能交叉审查',
      '高危迁移变更风险校验',
    ],
    vsNote: '与锦标赛的区别：锦标赛是多个 Agent 独立做同一任务；对抗验证是「生产者 vs 审查者」固定角色分工。',
  },
  {
    id: 'genfilter',
    cn: '生成+筛选模式',
    en: 'Generate-and-Filter',
    topo: '　　　┌─ 候选 A ─┐\n发散 ─┼─ 候选 B ─┼→ 筛选Agent(rubric) → 精选 ×2\n　　　└─ 候选…D ─┘',
    oneLiner: '先发散批量产出大量候选，再通过标准化评判规则（rubric）打分、去重、过滤，淘汰低质量结果，输出高质量子集。',
    scenes: [
      '多种架构方案生成，筛选可行方案',
      '多条修复方案生成，择优挑选最小改动方案',
      '多版重构思路筛选',
    ],
  },
  {
    id: 'tournament',
    cn: '锦标赛（淘汰赛择优）',
    en: 'Tournament',
    topo: 'A ┐\nB ┼→ 两两 PK：A>B → C>A → 🏆 C 最优\nC ┘  （互相隔离 · 事后评审）',
    oneLiner: 'N 个 Agent 互不参考、独立并行完成同一个目标任务；评审 Agent 采用成对对比（比单一绝对打分更稳定）逐层淘汰，选出最优结果。',
    scenes: [
      '复杂算法多种实现方案择优',
      '疑难 bug 多种修复思路对比',
      '架构方案选型博弈',
    ],
    vsNote: 'Agent Team 是大家互相沟通讨论；锦标赛 Agent 互相隔离、独立产出、事后 PK，没有实时交流。',
  },
  {
    id: 'loop',
    cn: '循环直至达标（条件循环）',
    en: 'Loop Until Done',
    topo: '执行 → 校验 → 未达标 ↘\n　↑────────────────────↙ 循环，直到停止条件达成',
    oneLiner: '无固定迭代次数，由脚本条件控制循环：持续执行、校验，直到达成停止条件（测试全部通过 / 不再发现新漏洞 / 达到最大重试上限）。',
    scenes: [
      '代码修改 → 跑单元测试 → 失败自动修复循环',
      '漏洞持续挖掘，连续多轮无新漏洞才终止',
      '迭代优化性能直到指标达标',
    ],
    vsNote: '用 Subagent 模拟循环：重试计数器存在父 Agent 上下文，长链路极易遗忘计数，无限循环或提前终止；DW 把计数器、终止条件写在 JS 脚本，强制生效。',
  },
]

// ============================================================
// 元数据
// ============================================================

export const scenarios: Record<string, Scenario> = {
  subagent: subagentScenario,
  subagentPlus: subagentPlusScenario,
  subagent_real: subagentRealScenario,
  subagentPlus_real: subagentPlusRealScenario,
  team: teamScenario,
  workflow: workflowScenario,
}

export const archMetas: ArchMeta[] = [
  {
    id: 'subagent',
    name: 'Subagent',
    cn: '父子子代理',
    en: 'Parent-Child Subagent',
    tagline: '独立窗口 · 只回流摘要',
    color: '#22d3ee',
    colorSoft: 'rgba(34, 211, 238, 0.12)',
    topology: '星型',
    control: '父 Agent（LLM 逐轮决策）',
    bestFor: '边界清晰、相互独立的子任务',
    concurrency: '2 ~ 8 个',
    cost: 'token 最低',
    reproducibility: '低',
    stats: [
      { key: 'done', label: '已回流摘要', max: 8 },
      { key: 'conc', label: '当前并发', max: 4 },
      { key: 'ctx', label: '父上下文占用', max: 100, format: (v) => `${Math.round(v)}%`, tone: 'danger' },
      { key: 'risk', label: '⚠️ 架构缺陷', max: 3, tone: 'danger' },
    ],
  },
  {
    id: 'team',
    name: 'Agent Team',
    cn: '智能体团队',
    en: 'Agent Team',
    tagline: '共享任务列表 · 队友直连协商',
    color: '#e879f9',
    colorSoft: 'rgba(232, 121, 249, 0.12)',
    topology: '网状',
    control: 'Lead 主导 + 共享任务列表自协调',
    bestFor: '边探索边调整的开放问题',
    concurrency: '3 ~ 6 人',
    cost: 'token 最高',
    reproducibility: '中',
    stats: [
      { key: 'done', label: '已交付成果', max: 4 },
      { key: 'conc', label: '并行成员', max: 4 },
      { key: 'msgs', label: '协作消息数', max: 26 },
      { key: 'risk', label: '⚠️ 协调事故', max: 2, tone: 'danger' },
    ],
  },
  {
    id: 'workflow',
    name: 'Dynamic Workflow',
    cn: '动态工作流',
    en: 'Dynamic Workflow',
    tagline: '动态生成脚本 · 静态拓扑执行',
    color: '#34d399',
    colorSoft: 'rgba(52, 211, 153, 0.12)',
    topology: '静态 DAG 调度',
    control: 'JS 编排脚本 + Runtime',
    bestFor: '无人值守的批量执行',
    concurrency: '数十 ~ 上百个',
    cost: '工程最高',
    reproducibility: '高',
    stats: [
      { key: 'done', label: '已处理文件', max: 12 },
      { key: 'conc', label: '当前并发', max: 5 },
      { key: 'retries', label: '自动重试', max: 3 },
      { key: 'ctx', label: 'Runtime 状态', max: 100, format: (v) => `${Math.round(v)}%`, tone: 'ok' },
    ],
  },
]
