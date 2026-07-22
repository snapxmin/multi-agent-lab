import { useEffect, useRef, useState } from 'react'
import { archMetas } from '@/lib/scenarios'
import { BadgeCheck } from 'lucide-react'

interface CompareRow {
  dim: string
  cells: [string, string, string]
  meters?: [number, number, number] // 0 ~ 5
  meterLabel?: [string, string, string]
  best?: number // 高亮列
}

const ROWS: CompareRow[] = [
  {
    dim: '控制权持有者',
    cells: ['主 Agent（LLM 逐轮决策下一步）', 'Lead 主导 + 共享任务列表自协调', 'JS 编排脚本 + Runtime（代码驱动调度）'],
  },
  {
    dim: '通信拓扑',
    cells: ['星型：子 Agent 仅能向父汇报，互相不可通信', '网状：队友经邮箱直接对话，无需 Lead 转发', '脚本调度：Agent 之间不直接通信，信息经脚本流转'],
  },
  {
    dim: '状态存储',
    cells: ['子 Agent 各自独立窗口，仅摘要回流父对话', '队友各自独立窗口 + 共享任务列表', 'Runtime 脚本变量，不污染顶层对话'],
  },
  {
    dim: '上下文隔离',
    cells: ['独立窗口：只回流摘要，主上下文零污染', '队友各自独立窗口，经消息共享信息', 'Worker 无对话上下文，状态全在脚本变量'],
    meters: [5, 4, 4],
    meterLabel: ['零污染', '消息共享', '无对话'],
    best: 0,
  },
  {
    dim: '协调状态存放',
    cells: ['父 Agent 的对话记忆里（隐式）', '共享任务列表（显式，全员可见）', '脚本变量 + Runtime（显式 + 代码强制）'],
    best: 2,
  },
  {
    dim: '执行模式',
    cells: ['可同轮并行派发，但协调串行经过父 Agent', '交互式持续协作，适合边探索边调整', '后台异步执行，不受对话 turn 限制'],
  },
  {
    dim: '人工介入',
    cells: ['只能和主 Agent 对话，无法直达子任务', '友好支持中途插话、定向询问成员', '默认无人值守；可预留审批关卡（需预先设计）'],
    meters: [1, 5, 1.5],
    meterLabel: ['弱', '强', '需预留'],
    best: 1,
  },
  {
    dim: '灵活性·应对未知',
    cells: ['中：父 Agent 可临场调整派单', '高：可辩论、改方向、边探索边调整', '低：剧本外的情况无法处理（探索性任务无剧本可写）'],
    meters: [2.5, 5, 1],
    meterLabel: ['中', '高', '低'],
    best: 1,
  },
  {
    dim: '可复现性',
    cells: ['低：每一轮模型决策存在随机性', '中：协作路径具备随机性', '高：编排逻辑固化，链路稳定可复现'],
    meters: [1, 2.5, 5],
    meterLabel: ['低', '中', '高'],
    best: 2,
  },
  {
    dim: '适用并发规模',
    cells: ['少量（2 ~ 8 个子 Agent）', '少量团队成员（3 ~ 6 人）', '数十 ~ 上百个子 Agent'],
    meters: [1.4, 1.2, 5],
    meterLabel: ['2~8', '3~6', '10~100+'],
    best: 2,
  },
  {
    dim: '运行 Token 成本',
    cells: ['最低：只回流摘要，主上下文零污染', '最高：每个队友都是独立实例，官方明确「显著多于单会话」', '中高：并行量大，但无协商开销'],
    meters: [1, 5, 3],
    meterLabel: ['最低', '最高', '中高'],
    best: 0,
  },
  {
    dim: '前期工程投入',
    cells: ['零配置：直接派单即用', '一个环境变量即可开启（实验性）', '最高：需预先写对编排脚本'],
    meters: [1, 1.5, 5],
    meterLabel: ['零配置', '1 个变量', '最高'],
    best: 0,
  },
]

export default function Comparison() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ob = new IntersectionObserver(
      ([e]) => e.isIntersecting && setVisible(true),
      { threshold: 0.15 },
    )
    ob.observe(el)
    return () => ob.disconnect()
  }, [])

  return (
    <section id="comparison" className="mx-auto max-w-7xl px-4 py-16 sm:px-6" ref={ref}>
      <div className="mb-8 text-center">
        <p className="mb-2 text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase">Side by Side</p>
        <h2 className="text-3xl font-bold text-slate-100 sm:text-4xl">十二维关键差异对比</h2>
        <p className="mt-3 text-slate-400">同一任务，三种架构 —— 差异全在这张表里</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/70">
        <div className="min-w-[880px]">
          {/* 表头 */}
          <div className="grid grid-cols-[130px_1fr_1fr_1fr] border-b border-slate-800">
            <div className="px-5 py-4 text-xs font-semibold tracking-wider text-slate-500 uppercase">对比维度</div>
            {archMetas.map((m) => (
              <div key={m.id} className="border-l border-slate-800/70 px-5 py-4" style={{ boxShadow: `inset 0 2px 0 ${m.color}` }}>
                <p className="text-sm font-bold" style={{ color: m.color }}>{m.name}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{m.cn}</p>
              </div>
            ))}
          </div>

          {/* 行 */}
          {ROWS.map((row, ri) => (
            <div
              key={row.dim}
              className={`grid grid-cols-[130px_1fr_1fr_1fr] ${ri < ROWS.length - 1 ? 'border-b border-slate-800/60' : ''} transition-colors hover:bg-slate-900/40`}
            >
              <div className="flex items-center px-5 py-4 text-[13px] font-semibold text-slate-300">{row.dim}</div>
              {row.cells.map((cell, ci) => {
                const meta = archMetas[ci]
                const isBest = row.best === ci
                return (
                  <div key={ci} className="border-l border-slate-800/50 px-5 py-4">
                    <p className={`text-[13px] leading-relaxed ${isBest ? 'text-slate-100' : 'text-slate-400'}`}>
                      {isBest && <BadgeCheck size={13} className="mr-1.5 inline -translate-y-px" style={{ color: meta.color }} />}
                      {cell}
                    </p>
                    {row.meters && (
                      <div className="mt-2.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: visible ? `${(row.meters[ci] / 5) * 100}%` : '0%',
                              backgroundColor: meta.color,
                              transition: `width 0.9s cubic-bezier(0.22,1,0.36,1) ${ri * 0.08 + ci * 0.06}s`,
                            }}
                          />
                        </div>
                        <span className="w-12 text-right font-mono text-[11px] text-slate-500">{row.meterLabel?.[ci]}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 场景化结论 */}
      <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900/50 px-5 py-4 text-center text-sm text-slate-400">
        在「SDK 大版本升级」同一任务中：
        <span className="mx-1.5 text-cyan-300">Subagent 上下文隔离是卖点，瓶颈在协作墙与单脑协调</span>·
        <span className="mx-1.5 text-fuchsia-300">Agent Team 共享任务列表协调，Token 开销最高</span>·
        <span className="mx-1.5 text-emerald-300">Dynamic Workflow 代码锁死规则，稳但吃前期工程</span>
      </div>

      {/* 选型速记 */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {archMetas.map((m) => (
          <div key={m.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs text-slate-500">什么时候选</p>
            <p className="mt-1 text-sm font-bold" style={{ color: m.color }}>{m.name}？</p>
            <p className="mt-1.5 text-[13px] text-slate-300">👉 {m.bestFor}</p>
            <p className="mt-1 text-xs text-slate-500">可复现性 {m.reproducibility} · 并发 {m.concurrency} · 成本 {m.cost}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
