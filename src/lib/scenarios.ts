import type { ArchMeta, EdgeDef, PacketEvent, Scenario, WorkEvent } from '@/types/sim'

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
  { id: 's_scan', label: '子 Agent · 扫描', sub: '扫描基础模块', x: 590, y: 100, kind: 'sub' as const, appearAt: 2.6 },
  { id: 's_dev', label: '子 Agent · 改造', sub: 'SDK 代码升级', x: 655, y: 210, kind: 'sub' as const, appearAt: 6.6 },
  { id: 's_test', label: '子 Agent · 测试', sub: '运行单元测试', x: 655, y: 330, kind: 'sub' as const, appearAt: 10.8 },
  { id: 's_dev2', label: '子 Agent · 实例#2', sub: '网络+业务模块', x: 590, y: 445, kind: 'sub' as const, appearAt: 2.7 },
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
  // ④ 重试 ×1（重新派发 = 全新实例）
  { t: 15.0, from: 'main', to: 's_dev', dur: 0.7, kind: 'task', label: '修复·重试 ×1' },
  { t: 17.6, from: 's_dev', to: 'main', dur: 0.7, kind: 'result', label: '摘要 · 修复完成' },
  // ⑤ 复测
  { t: 18.4, from: 'main', to: 's_test', dur: 0.7, kind: 'task', label: '复测基础模块' },
  { t: 20.8, from: 's_test', to: 'main', dur: 0.7, kind: 'result', label: '✅ 基础模块通过' },
  // ⑥ 改造网络+业务（又一个全新实例）
  { t: 21.9, from: 'main', to: 's_dev2', dur: 0.7, kind: 'task', label: '改造·网络+业务' },
  { t: 25.3, from: 's_dev2', to: 'main', dur: 0.7, kind: 'result', label: '摘要 · 8 文件完成' },
  // ⑦ 全量测试
  { t: 26.2, from: 'main', to: 's_test', dur: 0.7, kind: 'task', label: '全量测试' },
  { t: 28.6, from: 's_test', to: 'main', dur: 0.7, kind: 'result', label: '✅ 全部通过' },
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
  { t: 15.7, node: 's_dev', dur: 1.7 },
  { t: 19.1, node: 's_test', dur: 1.5 },
  { t: 21.5, node: 'main', dur: 0.4 },
  { t: 22.6, node: 's_dev2', dur: 2.5 },
  { t: 26.9, node: 's_test', dur: 1.5 },
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
  ],
  packets: subPackets,
  works: subWorks,
  logs: [
    { t: 0.2, text: '系统就绪：星型拓扑 —— 每个子 Agent 拥有独立上下文窗口，只有摘要回流父对话', tone: 'system' },
    { t: 1.5, text: '父 Agent 规划：并行扫描 → 分组改造 → 单测 → 失败重试 → 汇总', tone: 'info' },
    { t: 2.7, text: '父 Agent 同轮并行派发 2 个子任务 —— 但理解结果、决策下一步仍要逐个经过它的大脑（协调瓶颈）', tone: 'info' },
    { t: 3.1, text: '⚠️ 缺陷①协作墙：两个扫描子 Agent 彼此不可见，任务边界全靠父 Agent 预先切分', tone: 'warn' },
    { t: 5.9, text: '⚠️ 缺陷③协调瓶颈：摘要逐份回流、父 Agent 串行理解决策 —— 并行可发，判断不并行', tone: 'warn' },
    { t: 10.0, text: '子 Agent 独立窗口内消耗 ~15k token，父上下文只 +2KB 摘要 —— 上下文隔离是 Subagent 的头号卖点', tone: 'success' },
    { t: 15.2, text: '⚠️ 缺陷②无记忆：重新派发即全新实例 —— 不记得上次改到哪，派单需重述背景', tone: 'warn' },
    { t: 20.8, text: '基础模块复测通过 ✅（父上下文占用仍不到 30%）', tone: 'info' },
    { t: 22.0, text: '网络+业务派给又一个新实例 —— 派单里附带必要背景（无记忆的代价）', tone: 'info' },
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
// 场景二：Agent Team —— 项目微信群式协作
// 暴露缺陷：决策靠自觉 / 闲聊 Token 消耗 / 任务遗漏 / 不可复现
// ============================================================

const teamNodes = [
  { id: 'user', label: '用户', sub: 'SDK 升级需求方', x: 85, y: 270, kind: 'user' as const },
  { id: 'human', label: '人类', sub: '可直达任意成员', x: 100, y: 470, kind: 'human' as const },
  { id: 'lead', label: 'Lead · 总协调', sub: '拆解任务 · 凭记忆决策', x: 320, y: 250, kind: 'lead' as const },
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
teamEdges.push({ from: 'human', to: 'm1', dashed: true })
teamEdges.push({ from: 'human', to: 'm2', dashed: true })

const teamPackets: PacketEvent[] = [
  { t: 0.6, from: 'user', to: 'lead', dur: 0.9, kind: 'task', label: 'SDK 大版本升级' },
  { t: 2.6, from: 'lead', to: 'm4', dur: 0.7, kind: 'task', label: '扫描仓库' },
  { t: 5.4, from: 'm4', to: 'lead', dur: 0.7, kind: 'result', label: '12 个文件清单' },
  { t: 6.4, from: 'lead', to: 'm1', dur: 0.7, kind: 'task', label: '改造全部模块' },
  // 成员间反复确认（无效 token 消耗）
  { t: 7.4, from: 'm1', to: 'm2', dur: 0.8, kind: 'chat', label: '新接口怎么调？' },
  { t: 8.3, from: 'm2', to: 'm1', dur: 0.8, kind: 'chat', label: '先看迁移文档' },
  { t: 9.2, from: 'm1', to: 'm2', dur: 0.8, kind: 'chat', label: '这个签名对吗' },
  { t: 10.1, from: 'm2', to: 'm1', dur: 0.8, kind: 'chat', label: '再确认一下' },
  { t: 11.0, from: 'm1', to: 'm2', dur: 0.8, kind: 'chat', label: '版本号对齐没' },
  { t: 11.9, from: 'm2', to: 'm1', dur: 0.8, kind: 'chat', label: 'OK 了' },
  { t: 14.5, from: 'm1', to: 'm2', dur: 0.7, kind: 'chat', label: '改完了，可以测' },
  { t: 18.0, from: 'm2', to: 'lead', dur: 0.7, kind: 'result', label: '❌ 3 个文件失败' },
  { t: 18.8, from: 'lead', to: 'm1', dur: 0.7, kind: 'chat', label: '修复·重试 ×1' },
  { t: 21.5, from: 'm1', to: 'm2', dur: 0.7, kind: 'chat', label: '修好了，复测' },
  { t: 23.5, from: 'm2', to: 'lead', dur: 0.7, kind: 'result', label: '✅ 通过（漏 2 个文件）' },
  { t: 24.6, from: 'lead', to: 'm3', dur: 0.7, kind: 'task', label: '风险审核' },
  { t: 26.4, from: 'm3', to: 'lead', dur: 0.7, kind: 'result', label: '风险报告' },
  { t: 27.4, from: 'lead', to: 'user', dur: 1.0, kind: 'final', label: '升级总结' },
]

const teamWorks: WorkEvent[] = [
  { t: 1.5, node: 'lead', dur: 1.0 },
  { t: 3.3, node: 'm4', dur: 2.1 },
  { t: 7.1, node: 'm1', dur: 7.4 },
  { t: 15.2, node: 'm2', dur: 2.8 },
  { t: 19.5, node: 'm1', dur: 2.0 },
  { t: 22.2, node: 'm2', dur: 1.3 },
  { t: 25.3, node: 'm3', dur: 1.1 },
  { t: 27.0, node: 'lead', dur: 0.4 },
]

const teamScenario: Scenario = {
  id: 'team',
  duration: 29.5,
  nodes: teamNodes,
  edges: teamEdges,
  packets: teamPackets,
  works: teamWorks,
  logs: [
    { t: 0.2, text: '系统就绪：网状拓扑 —— 消息分散在各成员会话，没有独立计数器', tone: 'system' },
    { t: 1.5, text: 'Lead 拆解 SDK 升级任务，先安排扫描', tone: 'info' },
    { t: 6.4, text: 'Lead 安排改造 Agent 开工', tone: 'info' },
    { t: 7.6, text: '改造 ↔ 测试开始互相确认接口细节', tone: 'info' },
    { t: 12.2, text: '⚠️ 缺陷②无效 Token 消耗：6 次来回确认 —— 开放式讨论 ≠ 标准化流水线', tone: 'warn' },
    { t: 18.0, text: '测试 Agent 把失败结果同步给 Lead', tone: 'info' },
    { t: 18.8, text: '⚠️ 缺陷①「最多重试 3 次」仍只是文字约定 —— Lead 凭记忆决策，无强制', tone: 'warn' },
    { t: 23.5, text: '⚠️ 缺陷③任务遗漏：业务模块 2 个文件被遗忘，没有完成升级', tone: 'warn' },
    { t: 26.4, text: '风险审核 Agent 交付风险报告', tone: 'info' },
    { t: 28.6, text: '复盘：适合讨论，不适合批量流水线 —— 漏事、失控、成本高 ✗', tone: 'system' },
  ],
  stats: [
    { t: 18.7, key: 'ctx', delta: 12 },
    { t: 24.2, key: 'ctx', delta: 10 },
    { t: 27.1, key: 'ctx', delta: 8 },
    { t: 12.2, key: 'risk', delta: 1 },
    { t: 23.5, key: 'risk', delta: 1 },
  ],
}

// ============================================================
// 场景三：Dynamic Workflow —— 规则全部写进 JS 编排脚本
// 重试计数器 / 依赖顺序 / 熔断规则由代码强制执行
// ============================================================

const wfNodes = [
  { id: 'user', label: '用户', sub: 'SDK 升级需求方', x: 80, y: 110, kind: 'user' as const },
  { id: 'human', label: '人类', sub: '中途难以干预', x: 80, y: 320, kind: 'human' as const },
  { id: 'script', label: 'JS 编排脚本', sub: '规则代码锁死', x: 250, y: 280, kind: 'script' as const },
  { id: 'runtime', label: 'Runtime 状态', sub: '重试计数 · 进度 · 风险', x: 250, y: 465, kind: 'runtime' as const },
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `f${i + 1}`,
    label: `f${i + 1}`,
    sub: undefined as string | undefined,
    x: 480 + (i % 4) * 95,
    y: 110 + Math.floor(i / 4) * 130,
    kind: 'sub' as const,
    appearAt: i < 3 ? 3.0 : i < 7 ? 8.2 : 16.0,
  })),
]

const wfEdges: EdgeDef[] = [
  { from: 'user', to: 'script' },
  { from: 'human', to: 'script', dashed: true },
  { from: 'script', to: 'runtime', dashed: true },
  ...Array.from({ length: 12 }, (_, i) => ({ from: 'script', to: `f${i + 1}`, faint: true, dashed: true })),
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
      label: isRetry ? `重试 ×${attempt - 1}` : undefined,
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

wfWorks.push({ t: 20.4, node: 'script', dur: 1.2 })
wfPackets.push({ t: 21.8, from: 'script', to: 'user', dur: 1.0, kind: 'final', label: '变更清单 + 风险报告' })

const wfScript = {
  file: 'sdk-upgrade.workflow.js',
  lines: [
    `// sdk-upgrade.workflow.js —— 编排逻辑固化为代码`,
    `const files = await scanRepo('./src')      // ① 扫描仓库`,
    `const groups = groupByModule(files)       // ② 按模块分组`,
    `const done = [], risk = []`,
    `for (const g of topoSort(groups)) {       // ③ 依赖排序：基础→网络→业务`,
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
    { t0: 3.3, t1: 5.3, line: 9 },
    { t0: 4.8, t1: 5.4, line: 10 },
    { t0: 5.2, t1: 5.6, line: 12 },
    { t0: 5.8, t1: 7.3, line: 9 },
    { t0: 5.9, t1: 6.1, line: 11 },
    { t0: 7.2, t1: 7.4, line: 11 },
    { t0: 8.0, t1: 8.3, line: 5 },
    { t0: 8.3, t1: 11.6, line: 9 },
    { t0: 10.2, t1: 11.8, line: 10 },
    { t0: 10.6, t1: 10.9, line: 12 },
    { t0: 11.2, t1: 12.8, line: 9 },
    { t0: 12.7, t1: 13.0, line: 12 },
    { t0: 13.4, t1: 15.0, line: 9 },
    { t0: 14.9, t1: 15.2, line: 12 },
    { t0: 15.1, t1: 15.8, line: 13 },
    { t0: 15.8, t1: 16.1, line: 5 },
    { t0: 16.0, t1: 19.6, line: 9 },
    { t0: 18.6, t1: 20.0, line: 10 },
    { t0: 19.6, t1: 20.1, line: 11 },
    { t0: 20.4, t1: 21.8, line: 19 },
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
    { t: 3.1, text: '基础组 3 个文件并行改造', tone: 'info' },
    { t: 5.3, text: 'f2 测试失败 → 脚本自动重试（retries.f2: 0→1）', tone: 'info' },
    { t: 8.0, text: '✓ 依赖锁：基础组全部通过，网络组才允许开工', tone: 'success' },
    { t: 10.7, text: 'f5 第 1 次失败 → 自动重试（计数器在脚本变量，不靠 LLM 记忆）', tone: 'info' },
    { t: 12.9, text: 'f5 第 2 次失败 → 再重试（retries.f5 = 2）', tone: 'info' },
    { t: 15.1, text: '⛔ f5 连续失败 3 次 —— 代码熔断：终止并写入风险报告，规则强制执行', tone: 'warn' },
    { t: 16.1, text: '业务组 5 个文件并行开工（无人值守）', tone: 'info' },
    { t: 20.5, text: '⑦ 汇总：11 个文件升级完成 + 1 份风险报告 —— 状态全在 Runtime，顶层对话零污染', tone: 'info' },
    { t: 23.0, text: '任务完成 ✓ 可复现性最高：同一代码库跑两次，流程完全一致', tone: 'success' },
  ],
  stats: wfStats,
  script: wfScript,
  vars: wfVars,
}

// ============================================================
// 元数据
// ============================================================

export const scenarios: Record<string, Scenario> = {
  subagent: subagentScenario,
  team: teamScenario,
  workflow: workflowScenario,
}

export const archMetas: ArchMeta[] = [
  {
    id: 'subagent',
    name: 'Subagent',
    cn: '父子子代理',
    en: 'Parent-Child Subagent',
    tagline: '父 Agent 独自记所有台账',
    color: '#22d3ee',
    colorSoft: 'rgba(34, 211, 238, 0.12)',
    topology: '星型',
    control: '父 Agent（LLM 逐轮决策）',
    bestFor: '边界清晰的串行子任务',
    concurrency: '2 ~ 8 个',
    cost: '最低',
    reproducibility: '低',
    stats: [
      { key: 'done', label: '已回流环节', max: 7 },
      { key: 'conc', label: '当前并发', max: 4 },
      { key: 'ctx', label: '父上下文占用', max: 100, format: (v) => `${Math.round(v)}%`, tone: 'danger' },
      { key: 'risk', label: '⚠️ 规则违背', max: 3, tone: 'danger' },
    ],
  },
  {
    id: 'team',
    name: 'Agent Team',
    cn: '智能体团队',
    en: 'Agent Team',
    tagline: '项目微信群式协作',
    color: '#e879f9',
    colorSoft: 'rgba(232, 121, 249, 0.12)',
    topology: '网状',
    control: 'Lead Agent 主导，成员可协商',
    bestFor: '边探索边调整的开放问题',
    concurrency: '3 ~ 6 人',
    cost: '中等偏高',
    reproducibility: '中',
    stats: [
      { key: 'done', label: '已交付成果', max: 4 },
      { key: 'conc', label: '并行成员', max: 4 },
      { key: 'msgs', label: '协作消息数', max: 18 },
      { key: 'risk', label: '⚠️ 失控 / 遗漏', max: 2, tone: 'danger' },
    ],
  },
  {
    id: 'workflow',
    name: 'Dynamic Workflow',
    cn: '动态工作流',
    en: 'Dynamic Workflow',
    tagline: '规则全部写进编排脚本',
    color: '#34d399',
    colorSoft: 'rgba(52, 211, 153, 0.12)',
    topology: '脚本调度',
    control: 'JS 编排脚本 + Runtime',
    bestFor: '无人值守的批量执行',
    concurrency: '数十 ~ 上百个',
    cost: '最高',
    reproducibility: '高',
    stats: [
      { key: 'done', label: '已处理文件', max: 12 },
      { key: 'conc', label: '当前并发', max: 5 },
      { key: 'retries', label: '自动重试', max: 3 },
      { key: 'ctx', label: 'Runtime 状态', max: 100, format: (v) => `${Math.round(v)}%`, tone: 'ok' },
    ],
  },
]
