import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { archMetas, scenarios } from '@/lib/scenarios'
import type { ArchId, LogEvent, NodeDef, PacketEvent } from '@/types/sim'
import TopologyCanvas, { PACKET_COLORS } from '@/components/TopologyCanvas'
import ScriptPanel from '@/components/ScriptPanel'
import { useSimClock } from '@/hooks/useSimClock'
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

function nodeInfo(archId: ArchId, node: NodeDef): PopInfo {
  const k = node.kind
  if (k === 'user') return { title: '任务发起者', desc: '提出「SDK 大版本升级」需求，等待最终结果。', ok: true }
  if (k === 'human') {
    if (archId === 'subagent') return { title: '人类（受限）', desc: '只能和父 Agent 对话，无法直达任何子任务。', ok: false }
    if (archId === 'team') return { title: '人类（可介入）', desc: '网状拓扑下可随时插话，直达任意成员的独立会话。', ok: true }
    return { title: '人类（难介入）', desc: '脚本后台执行，没有交互入口 —— 偏向无人值守。', ok: false }
  }
  if (archId === 'subagent') {
    if (k === 'main') return { title: '✓ 控制权持有者', desc: '所有规划、判断、重试计数都在这个上下文里 —— 它一「失忆」，流程就失控。', ok: true }
    return { title: '✕ 无法直达', desc: '子 Agent 只接受父 Agent 派单：互相之间不可通信，人类也联系不上它。', ok: false }
  }
  if (archId === 'team') {
    if (k === 'lead') return { title: '✓ 控制权持有者（LLM）', desc: '主导协作与决策，但「重试≤3次」对它只是文字约定，没有代码强制。', ok: true }
    return { title: '✓ 可直接对话', desc: '成员拥有独立会话，人类与其他成员都能直接联系它。', ok: true, askable: true }
  }
  if (k === 'script') return { title: '✓ 控制权持有者（代码）', desc: '要不要重试、等待谁、何时汇总，全部由这段代码确定性地决定。', ok: true }
  if (k === 'runtime') return { title: '状态存储', desc: '重试计数、进度、风险报告都存放在这里的变量中，不污染顶层对话。', ok: true }
  return { title: '✕ 无对话入口', desc: 'Worker 只接收脚本指令、执行完即返回，人类无法在运行中插话。', ok: false }
}

export default function Simulator() {
  const [archId, setArchId] = useState<ArchId>('subagent')
  const scenario = scenarios[archId]
  const meta = archMetas.find((m) => m.id === archId)!

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
  }, [archId])

  useEffect(() => {
    if (!flashNode) return
    const id = setTimeout(() => setFlashNode(null), 1100)
    return () => clearTimeout(id)
  }, [flashNode])

  // 统计指标
  const allPackets = useMemo(() => [...scenario.packets, ...humanPackets], [scenario, humanPackets])
  const stats = useMemo(() => {
    const done = allPackets.filter((p) => p.kind === 'result' && p.countsDone !== false && p.t + p.dur <= t).length
    const msgs = allPackets.filter((p) => p.t <= t).length
    const conc = scenario.works.filter((w) => w.t <= t && t < w.t + w.dur && !['main', 'lead', 'script'].includes(w.node)).length
    const sum = (key: string) => scenario.stats.filter((s) => s.key === key && s.t <= t).reduce((a, s) => a + (s.delta ?? 0), 0)
    return { done, msgs, conc, ctx: sum('ctx'), risk: sum('risk'), retries: sum('retries') }
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
          { t: now + 1.0, text: '⚠️ 干预未被接收：脚本按既定逻辑运行，没有交互入口 —— 偏向无人值守', tone: 'warn' },
        ],
      )
    }
  }

  const onNodeClick = (node: NodeDef) => {
    setFlashNode(node.id)
    setPop({ node, info: nodeInfo(archId, node) })
  }

  const legendItems: { color: string; label: string }[] = [
    { color: meta.color, label: '任务派发' },
    { color: PACKET_COLORS.result, label: '结果回流' },
    ...(archId === 'team' ? [{ color: PACKET_COLORS.chat, label: '成员协商' }] : []),
    ...(archId === 'workflow' ? [{ color: PACKET_COLORS.state, label: '写入状态' }] : []),
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
              <span className="text-slate-500">成本基线</span>
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
          </div>

          {/* 图例 */}
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 border-t border-slate-800/60 px-5 py-2.5">
            {legendItems.map((l) => (
              <span key={l.label} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                {l.label}
              </span>
            ))}
            <span className="ml-auto text-[11px] text-slate-600">节点外圈进度环 = 正在工作</span>
          </div>
        </div>

        {/* 右栏：统计 + 脚本面板/日志 */}
        <div className="flex min-h-0 flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            {meta.stats.map((sd) => {
              const v = stats[sd.key as keyof typeof stats] ?? 0
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
