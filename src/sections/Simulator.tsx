import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { archMetas, patternMetas, scenarios, workflowPatterns } from '@/lib/scenarios'
import type { ArchId, LogEvent, NodeDef, PacketEvent, PatternId } from '@/types/sim'
import TopologyCanvas, { PACKET_COLORS } from '@/components/TopologyCanvas'
import ScriptPanel from '@/components/ScriptPanel'
import { useSimClock } from '@/hooks/useSimClock'
import { Switch } from '@/components/ui/switch'
import {
  Pause, Play, RotateCcw, MessageSquarePlus, Network, Crown, Gauge, Coins,
  Ban, MousePointerClick, X, CheckCircle2, XCircle, MessagesSquare,
} from 'lucide-react'

const LOG_TONE_CLASS: Record<string, string> = {
  system: 'text-slate-500',
  info: 'text-slate-300',
  warn: 'text-amber-400',
  success: 'text-emerald-400',
  human: 'text-rose-400',
}

const CTX_BAR_FOR: Record<ArchId, string[]> = {
  subagent: ['main'],
  team: ['lead'],
  workflow: ['runtime'],
}

interface PopInfo {
  title: string
  desc: string
  ok: boolean // true=可交互/控制权，false=不可达
  askable?: boolean // Team 成员：可定向询问
}

function nodeInfo(archId: ArchId, node: NodeDef, patternId: PatternId = 'full'): PopInfo {
  const k = node.kind
  if (k === 'user') return { title: '任务发起者', desc: '提出「SDK 大版本升级」需求，等待最终结果。', ok: true }
  if (k === 'human') {
    if (archId === 'subagent') return { title: '人类（受限）', desc: '只能和父 Agent 对话，无法直达任何子任务。', ok: false }
    if (archId === 'team') return { title: '人类（可介入）', desc: '网状拓扑下可随时插话，直达任意成员的独立会话。', ok: true }
    return { title: '人类（难介入）', desc: '默认无人值守、没有交互入口 —— 但编排脚本本可预留审批关卡（approval gate）。', ok: false }
  }
  if (archId === 'subagent') {
    if (k === 'main') return { title: '✓ 控制权持有者', desc: '所有规划、判断、重试计数都汇聚在这一个大脑 —— 并行派发可以，理解与决策仍串行经过它（协调瓶颈）。', ok: true }
    if (k === 'tasklist') return { title: '共享黑板（增强②）', desc: '子 Agent 实例读写中间产物的公共区：绕开协作墙、不污染父上下文；失败现场与半成品也回收在这里。', ok: true }
    if (k === 'runtime') return { title: '经验库（增强③）', desc: '实例销毁前写入踩坑记录，新实例派发时冷启动读取 —— 零记忆但不清零。', ok: true }
    return { title: '✕ 无法直达', desc: '子 Agent 拥有独立上下文窗口，只向父 Agent 回流摘要：互相不可通信（协作墙），每次调用都是全新实例（无记忆）。', ok: false }
  }
  if (archId === 'team') {
    if (k === 'lead') return { title: '✓ 控制权持有者（LLM）', desc: '拆解任务、审批方案（Plan Approval）；协调中枢是共享任务列表 —— 状态全员可见，不靠它记忆。', ok: true }
    if (k === 'tasklist') return { title: '状态存储 · 协调中枢', desc: '认领、依赖解锁、文件锁都在这里，全员可见 —— 不靠任何人的记忆。', ok: true }
    return { title: '✓ 可直接对话', desc: '成员是独立 Claude 实例，拥有自己的上下文窗口；人类与其他成员都能直接联系它。', ok: true, askable: true }
  }
  // workflow：模式专属节点（须先于通用 kind 判断 —— w_auto / barrier / runner 是 runtime 节点）
  if (node.id === 'w_auto') return { title: '纯代码通道', desc: '机械任务直接走代码修复 —— 0 次 LLM 调用、0 token：便宜的任务不惊动模型，这是分类路由省钱的来源。', ok: true }
  if (node.id === 'barrier') return { title: '⏸ 屏障（纯代码）', desc: 'Synthesize 的闸门：必须等所有并行 Worker 结束才放行汇总 —— 0 次 LLM 调用，规模再大也不漏等。', ok: true }
  if (node.id === 'runner') return { title: '⏱ 测试执行器（纯代码）', desc: '跑测试、出结果 —— 0 次 LLM 调用、0 token；通过与否就是脚本的循环条件。', ok: true }
  if (node.id === 'cls') return { title: '分类 Agent（Haiku · 低成本）', desc: '一次调用给输入打标签，按类别路由到专门分支 —— 归类要便宜，分拣规则固化在脚本里。', ok: false }
  if (node.id === 'judge') return { title: '评审 Agent（LLM · 两两 PK）', desc: '成对对比、逐层淘汰 —— 两两 PK 比单一绝对打分更稳定；选手互相隔离，事后才评审。', ok: false }
  if (node.id === 'filt') return { title: '筛选 Agent（LLM · rubric）', desc: '按标准化评判规则打分、去重、过滤 —— rubric 是代码，不是感觉。', ok: false }
  if (node.id === 'w_sec') return { title: '校验 Agent（完全隔离）', desc: '与生产者上下文完全隔离：按固定标准主动挑漏洞、质疑结论，发现缺陷触发重试。', ok: false }
  if (k === 'script') return { title: '✓ 控制权持有者（代码）', desc: '要不要重试、等待谁、何时汇总，全部由这段代码确定性地决定 —— 偏向无人值守，但可预留审批关卡。', ok: true }
  if (k === 'runtime') return { title: '状态存储', desc: '重试计数、进度、风险报告都存放在这里的变量中，不污染顶层对话。', ok: true }
  if (patternId !== 'full') return { title: '✕ 无对话入口', desc: 'Worker 只接收脚本指令、执行完即返回：步骤与路由由代码确定性决定；人类无法在运行中插话（除非脚本预留审批关卡）。', ok: false }
  return { title: '✕ 无对话入口', desc: 'Worker 只接收脚本指令、执行完即返回：开工时机由 DAG 拓扑序决定，而非 LLM 临场决策；人类无法在运行中插话（除非脚本预留审批关卡）。', ok: false }
}

export default function Simulator() {
  const [archId, setArchId] = useState<ArchId>('subagent')
  const [plus, setPlus] = useState(false)
  const [real, setReal] = useState(false)
  const [patternId, setPatternId] = useState<PatternId>('full')
  const scenarioKey = archId === 'subagent' ? (plus ? 'subagentPlus' : 'subagent') + (real ? '_real' : '') : archId
  const scenario = archId === 'workflow' ? workflowPatterns[patternId] : scenarios[scenarioKey]
  const meta = archMetas.find((m) => m.id === archId)!
  const activePattern = patternMetas.find((p) => p.id === patternId)!
  const statDefs = scenario.statDisplays ?? meta.stats

  const [humanPackets, setHumanPackets] = useState<PacketEvent[]>([])
  const [humanLogs, setHumanLogs] = useState<LogEvent[]>([])
  const [pop, setPop] = useState<{ node: NodeDef; info: PopInfo } | null>(null)
  const [flashNode, setFlashNode] = useState<string | null>(null)

  const clearInjected = useCallback(() => {
    setHumanPackets([])
    setHumanLogs([])
  }, [])

  const clock = useSimClock(scenario.duration, { onLoop: clearInjected })
  const t = clock.t

  useEffect(() => {
    clearInjected()
    setPop(null)
    clock.restart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archId, plus, real, patternId])

  useEffect(() => {
    if (!flashNode) return
    const id = setTimeout(() => setFlashNode(null), 1100)
    return () => clearTimeout(id)
  }, [flashNode])

  // 统计指标（场景自定义 key 通过 scenario.stats 泛化累加，如 routing 的 saved）
  const allPackets = useMemo(() => [...scenario.packets, ...humanPackets], [scenario, humanPackets])
  const stats = useMemo(() => {
    const acc: Record<string, number> = {
      done: allPackets.filter((p) => p.kind === 'result' && p.countsDone !== false && p.t + p.dur <= t).length,
      msgs: allPackets.filter((p) => p.t <= t).length,
      conc: scenario.works.filter((w) => w.t <= t && t < w.t + w.dur && !['main', 'lead', 'script'].includes(w.node)).length,
    }
    for (const s of scenario.stats) {
      if (s.t > t) continue
      acc[s.key] = s.set !== undefined ? s.set : (acc[s.key] ?? 0) + (s.delta ?? 0)
    }
    return acc
  }, [allPackets, scenario, t])

  // 日志
  const logs = useMemo(
    () => [...scenario.logs, ...humanLogs].filter((l) => l.t <= t).sort((a, b) => a.t - b.t),
    [scenario, humanLogs, t],
  )
  const logRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [logs.length])

  // ============ 人工介入操作 ============
  const inject = (packets: PacketEvent[], newLogs: LogEvent[]) => {
    setHumanPackets((ps) => [...ps, ...packets])
    setHumanLogs((ls) => [...ls, ...newLogs])
  }

  const askMember = (node: NodeDef) => {
    const now = t
    inject(
      [
        { t: now, from: 'human', to: node.id, dur: 0.8, kind: 'human', label: '定向询问' },
        { t: now + 1.1, from: node.id, to: 'human', dur: 0.8, kind: 'human', label: '即时回应' },
      ],
      [
        { t: now, text: `人类直达「${node.label}」：请优先处理 f5 的兼容问题`, tone: 'human' },
        { t: now + 1.2, text: `「${node.label}」即时回应 —— 网状拓扑下人类可直达任意成员`, tone: 'human' },
      ],
    )
    setPop(null)
  }

  const intervene = () => {
    const now = t
    if (archId === 'subagent') {
      inject(
        [
          { t: now, from: 'human', to: 'main', dur: 0.8, kind: 'human', label: '喊话' },
          { t: now + 1.1, from: 'main', to: 'human', dur: 0.8, kind: 'human', label: '收到' },
        ],
        [
          { t: now, text: '人类向父 Agent 喊话：请加快进度（这是唯一能对话的入口）', tone: 'human' },
          { t: now + 1.2, text: '父 Agent 回应 —— 但人类依旧无法直达任何子任务', tone: 'human' },
        ],
      )
    } else if (archId === 'team') {
      inject(
        [
          { t: now, from: 'human', to: 'm2', dur: 0.8, kind: 'human', label: '人工插话' },
          { t: now + 1.1, from: 'm2', to: 'human', dur: 0.8, kind: 'human', label: '即时回应' },
        ],
        [
          { t: now, text: '人类中途插话 → 定向询问「测试 Agent」：优先保证用例覆盖', tone: 'human' },
          { t: now + 1.2, text: '测试 Agent 即时回应 —— 人类可直达任意成员', tone: 'human' },
        ],
      )
    } else {
      inject(
        [{ t: now, from: 'human', to: 'script', dur: 0.8, kind: 'human', label: '尝试干预' }],
        [
          { t: now, text: '人类试图中途干预脚本执行…', tone: 'human' },
          { t: now + 1.0, text: '⚠️ 脚本未预留审批关卡，干预未生效 —— 这是设计选择的后果：SDK 编排本可以预留 approval gate', tone: 'warn' },
        ],
      )
    }
  }

  const onNodeClick = (node: NodeDef) => {
    setFlashNode(node.id)
    setPop({ node, info: nodeInfo(archId, node, patternId) })
  }

  const legendItems: { color: string; label: string; line?: boolean }[] = [
    { color: meta.color, label: '任务派发' },
    { color: PACKET_COLORS.result, label: '结果回流' },
    ...(archId === 'team'
      ? [
          { color: PACKET_COLORS.chat, label: '成员协商' },
          { color: PACKET_COLORS.state, label: '任务列表读写' },
        ]
      : []),
    // workflow 图例按当前模式场景内容门控：有状态包才显示「写入状态」，有 dep 边才显示「依赖边」
    ...(archId === 'workflow' && scenario.packets.some((p) => p.kind === 'state')
      ? [{ color: PACKET_COLORS.state, label: '写入状态' }]
      : []),
    ...(archId === 'workflow' && scenario.edges.some((e) => e.dep)
      ? [{ color: meta.color, label: '依赖边 · topo DAG', line: true }]
      : []),
    { color: PACKET_COLORS.human, label: '人工介入' },
    { color: PACKET_COLORS.final, label: '最终交付' },
  ]

  const interveneLabel = archId === 'subagent' ? '向父 Agent 喊话' : archId === 'team' ? '人工插话' : '尝试中途干预'

  return (
    <section id="simulator" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="mb-8 text-center">
        <p className="mb-2 text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase">Interactive Lab</p>
        <h2 className="text-3xl font-bold text-slate-100 sm:text-4xl">架构模拟器</h2>
        <p className="mt-3 text-slate-400">
          统一场景：<span className="font-semibold text-slate-200">存量项目 SDK 大版本升级改造</span>
          —— 扫描 → 分组改造 → 单测 → 失败重试≤3次 → 汇总
        </p>
      </div>

      {/* 架构选择卡片 */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {archMetas.map((m) => {
          const active = m.id === archId
          return (
            <button
              key={m.id}
              onClick={() => setArchId(m.id)}
              className={`group rounded-2xl border p-4 text-left transition-all duration-300 ${
                active ? 'border-transparent bg-slate-900/90 shadow-lg' : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
              }`}
              style={active ? { boxShadow: `0 0 0 1.5px ${m.color}, 0 8px 32px -8px ${m.color}55` } : undefined}
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-bold" style={{ color: m.color }}>{m.name}</span>
                <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ backgroundColor: m.colorSoft, color: m.color }}>
                  {m.topology}拓扑
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{m.cn} · {m.tagline}</p>
            </button>
          )
        })}
      </div>

      {/* 工作流模式切换（仅 workflow 架构） */}
      {archId === 'workflow' && (
        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
              Claude Code Dynamic Workflow 六大官方典型模式（源自 Anthropic《A harness for every task》，模式可自由嵌套组合）
            </p>
            <span className="font-mono text-[11px] text-slate-600">1 组合实战 + 6 典型模式</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {patternMetas.map((p) => {
              const active = p.id === patternId
              return (
                <button
                  key={p.id}
                  onClick={() => setPatternId(p.id)}
                  className="flex items-center gap-2 rounded-full px-3.5 py-2 text-[12px] font-medium transition-all duration-200"
                  style={
                    active
                      ? { backgroundColor: meta.colorSoft, color: meta.color, boxShadow: `inset 0 0 0 1px ${meta.color}` }
                      : { color: '#94a3b8', boxShadow: 'inset 0 0 0 1px #1e293b' }
                  }
                >
                  {p.cn}
                  <span className="text-[10px] opacity-60">{p.en}</span>
                </button>
              )
            })}
          </div>
          <div className="mt-3 rounded-xl border border-slate-800/80 bg-slate-950/60 px-4 py-3">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <b className="text-sm" style={{ color: meta.color }}>{activePattern.cn}</b>
              <span className="font-mono text-[11px] text-slate-500">{activePattern.en}</span>
            </div>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900/80 px-3 py-2 font-mono text-[11px] leading-relaxed whitespace-pre text-slate-400">{activePattern.topo}</pre>
            <p className="mt-2 text-[12.5px] leading-relaxed text-slate-300">{activePattern.oneLiner}</p>
            <p className="mt-2 text-[11px] font-semibold text-slate-500">典型工程场景</p>
            <ul className="mt-1 space-y-1">
              {activePattern.scenes.map((s) => (
                <li key={s} className="flex gap-1.5 text-[12px] leading-relaxed text-slate-400">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
                  {s}
                </li>
              ))}
            </ul>
            {activePattern.vsNote && (
              <p className="mt-2 border-l-2 pl-2.5 text-[12px] leading-relaxed text-slate-500" style={{ borderColor: meta.color }}>
                {activePattern.vsNote}
              </p>
            )}
          </div>
          <p className="mt-2.5 text-center text-[11px] text-slate-600">
            Subagent / Agent Team：LLM 承担编排决策；Dynamic Workflow：调度逻辑外置到 Runtime JS 脚本，模型仅作为任务执行者。
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        {/* 画布 + 控制 */}
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-800/80 px-5 py-3">
            <div className="flex items-center gap-2 text-sm">
              <Crown size={14} style={{ color: meta.color }} />
              <span className="text-slate-500">控制权</span>
              <span className="font-medium text-slate-200">{meta.control}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Network size={14} style={{ color: meta.color }} />
              <span className="text-slate-500">拓扑</span>
              <span className="font-medium text-slate-200">{meta.topology}</span>
            </div>
            <div className="hidden items-center gap-2 text-sm sm:flex">
              <Gauge size={14} style={{ color: meta.color }} />
              <span className="text-slate-500">并发规模</span>
              <span className="font-medium text-slate-200">{meta.concurrency}</span>
            </div>
            <div className="ml-auto hidden items-center gap-2 text-sm md:flex">
              <Coins size={14} style={{ color: meta.color }} />
              <span className="text-slate-500">成本</span>
              <span className="font-medium text-slate-200">{meta.cost}</span>
            </div>
          </div>

          <div className="relative" style={{ aspectRatio: '860 / 560' }}>
            <TopologyCanvas
              scenario={scenario}
              color={meta.color}
              t={t}
              extraPackets={humanPackets}
              ctxBarFor={CTX_BAR_FOR[archId]}
              onNodeClick={onNodeClick}
              flashNode={flashNode}
            />

            {/* 节点点击弹层：控制权 / 可达性 */}
            {pop && (
              <>
                <div className="absolute inset-0 z-10" onClick={() => setPop(null)} />
                <div
                  className="absolute z-20 w-64 rounded-xl border border-slate-700 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur"
                  style={{
                    left: `${Math.min(Math.max((pop.node.x / 860) * 100, 12), 68)}%`,
                    top: `${Math.min(Math.max((pop.node.y / 560) * 100, 10), 62)}%`,
                  }}
                >
                  <div className="flex items-start gap-2">
                    {pop.info.ok ? (
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-400" />
                    ) : (
                      <XCircle size={15} className="mt-0.5 shrink-0 text-rose-400" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-slate-100">
                        {pop.node.label}
                        <span className="ml-1.5 text-[11px] font-medium text-slate-500">{pop.info.title}</span>
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-slate-400">{pop.info.desc}</p>
                      {pop.info.askable && (
                        <button
                          onClick={() => askMember(pop.node)}
                          className="mt-2 flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1.5 text-[11px] font-semibold text-rose-300 ring-1 ring-rose-500/40 transition hover:bg-rose-500/25"
                        >
                          <MessagesSquare size={12} />
                          定向询问 TA
                        </button>
                      )}
                    </div>
                    <button onClick={() => setPop(null)} className="shrink-0 text-slate-600 transition hover:text-slate-300">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-slate-900/80 px-3 py-1.5 text-[11px] text-slate-500 backdrop-blur">
              <MousePointerClick size={12} />
              点击节点，探索控制权与可达性
            </div>
          </div>

          {/* 控制条 */}
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-800/80 px-5 py-3">
            <button
              onClick={clock.toggle}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-950 transition hover:opacity-85"
              style={{ backgroundColor: meta.color }}
              aria-label={clock.playing ? '暂停' : '播放'}
            >
              {clock.playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>
            <button
              onClick={clock.restart}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 text-slate-300 transition hover:border-slate-500"
              aria-label="重播"
            >
              <RotateCcw size={15} />
            </button>
            <div className="flex overflow-hidden rounded-full border border-slate-700 text-xs">
              {[0.5, 1, 2].map((s) => (
                <button
                  key={s}
                  onClick={() => clock.setSpeed(s)}
                  className={`px-3 py-2 transition ${clock.speed === s ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {s}×
                </button>
              ))}
            </div>
            <input
              type="range"
              min={0}
              max={scenario.duration}
              step={0.1}
              value={Math.min(t, scenario.duration)}
              onChange={(e) => clock.seek(Number(e.target.value))}
              className="h-1 min-w-24 flex-1 cursor-pointer appearance-none rounded-full bg-slate-800"
              style={{ accentColor: meta.color }}
            />
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {Math.min(t, scenario.duration).toFixed(1)}s / {scenario.duration}s
            </span>
            <button
              onClick={intervene}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold ring-1 transition ${
                archId === 'workflow'
                  ? 'bg-slate-800/60 text-slate-400 ring-slate-600/60 hover:bg-slate-800'
                  : 'bg-rose-500/15 text-rose-300 ring-rose-500/40 hover:bg-rose-500/25'
              }`}
            >
              {archId === 'workflow' ? <Ban size={14} /> : <MessageSquarePlus size={14} />}
              {interveneLabel}
            </button>
            {archId === 'subagent' && (
              <div className="flex items-center gap-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-full bg-slate-900/60 px-3 py-1.5 ring-1 ring-slate-700/70">
                  <Switch checked={plus} onCheckedChange={setPlus} aria-label="增强版开关" />
                  <span className={`text-xs font-semibold transition ${plus ? 'text-cyan-300' : 'text-slate-400'}`}>
                    增强版{plus ? ' · 6 项机制' : ''}
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-full bg-slate-900/60 px-3 py-1.5 ring-1 ring-slate-700/70">
                  <Switch checked={real} onCheckedChange={setReal} aria-label="真实数据开关" />
                  <span className={`text-xs font-semibold transition ${real ? 'text-amber-300' : 'text-slate-400'}`}>
                    真实数据{real ? ' · 支付 SDK v3' : ''}
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* 图例 */}
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 border-t border-slate-800/60 px-5 py-2.5">
            {legendItems.map((l) => (
              <span key={l.label} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                {l.line ? (
                  <span className="inline-block h-0.5 w-4 rounded-full" style={{ backgroundColor: l.color }} />
                ) : (
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                )}
                {l.label}
              </span>
            ))}
            <span className="ml-auto text-[11px] text-slate-600">节点外圈进度环 = 正在工作</span>
          </div>
        </div>

        {/* 右栏：统计 + 脚本面板/日志 */}
        <div className="flex min-h-0 flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            {statDefs.map((sd) => {
              const v = stats[sd.key] ?? 0
              const pct = Math.min(v / sd.max, 1)
              const isRisk = sd.key === 'risk'
              const valueColor = isRisk ? (v > 0 ? '#f87171' : '#64748b') : sd.tone === 'danger' && pct > 0.7 ? '#f87171' : meta.color
              return (
                <div key={sd.key} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
                  <p className="text-[11px] text-slate-500">{sd.label}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: valueColor }}>
                    {sd.format ? sd.format(v) : v}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct * 100}%`, backgroundColor: valueColor }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {scenario.script && <ScriptPanel script={scenario.script} vars={scenario.vars} t={t} color={meta.color} />}

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950/90">
            <div className="flex items-center gap-2 border-b border-slate-800/80 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
              <span className="ml-2 font-mono text-[11px] text-slate-500">runtime.log — 实时推演</span>
            </div>
            <div ref={logRef} className="max-h-64 min-h-40 flex-1 space-y-2 overflow-y-auto px-4 py-3 font-mono text-[12px] leading-relaxed">
              {logs.map((l, i) => (
                <p key={i} className={LOG_TONE_CLASS[l.tone ?? 'info']}>
                  <span className="mr-2 text-slate-600">[{l.t.toFixed(1).padStart(5, '0')}s]</span>
                  {l.text}
                </p>
              ))}
              {logs.length === 0 && <p className="text-slate-600">等待推演开始…</p>}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
