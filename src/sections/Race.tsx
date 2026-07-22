import { useEffect, useMemo, useRef, useState } from 'react'
import { archMetas, scenarios } from '@/lib/scenarios'
import type { ArchId } from '@/types/sim'
import TopologyCanvas from '@/components/TopologyCanvas'
import { useSimClock, type SimClock } from '@/hooks/useSimClock'
import { Flag, Play, RotateCcw } from 'lucide-react'

const TOTAL_TASKS: Record<ArchId, number> = { subagent: 8, team: 4, workflow: 12 }
const MEDALS = ['🥇', '🥈', '🥉']

interface LaneProps {
  id: ArchId
  raceKey: number
  onFinish: (id: ArchId) => void
  register: (id: ArchId, clock: SimClock) => void
}

function RaceLane({ id, raceKey, onFinish, register }: LaneProps) {
  const scenario = scenarios[id]
  const meta = archMetas.find((m) => m.id === id)!
  const clock = useSimClock(scenario.duration, {
    loop: false,
    autoPlay: false,
    onEnd: () => onFinish(id),
  })

  useEffect(() => {
    register(id, clock)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clock])

  useEffect(() => {
    if (raceKey > 0) clock.restart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceKey])

  const done = useMemo(
    () => scenario.packets.filter((p) => p.kind === 'result' && p.countsDone !== false && p.t + p.dur <= clock.t).length,
    [scenario, clock.t],
  )
  const total = TOTAL_TASKS[id]

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80">
      <div className="flex items-center gap-2 border-b border-slate-800/80 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
        <span className="text-sm font-bold" style={{ color: meta.color }}>
          {meta.name}
        </span>
        <span className="text-[11px] text-slate-500">{meta.topology}拓扑</span>
        <span className="ml-auto font-mono text-xs text-slate-500 tabular-nums">
          {Math.min(clock.t, scenario.duration).toFixed(1)}s
        </span>
      </div>
      <div style={{ aspectRatio: '860 / 560' }}>
        <TopologyCanvas scenario={scenario} color={meta.color} t={clock.t} compact />
      </div>
      <div className="px-4 pt-2 pb-3.5">
        <div className="mb-1.5 flex items-baseline justify-between text-xs">
          <span className="text-slate-400">任务进度</span>
          <span className="font-bold tabular-nums" style={{ color: meta.color }}>
            {done} / {total}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${(done / total) * 100}%`, backgroundColor: meta.color }}
          />
        </div>
      </div>
    </div>
  )
}

export default function Race() {
  const [raceKey, setRaceKey] = useState(0)
  const [finishOrder, setFinishOrder] = useState<ArchId[]>([])
  const clocksRef = useRef<Map<ArchId, SimClock>>(new Map())

  const register = (id: ArchId, clock: SimClock) => {
    clocksRef.current.set(id, clock)
  }

  const start = () => {
    setFinishOrder([])
    setRaceKey((k) => k + 1)
  }

  const stopAll = () => {
    clocksRef.current.forEach((c) => c.pause())
  }

  const onFinish = (id: ArchId) => {
    setFinishOrder((o) => (o.includes(id) ? o : [...o, id]))
  }

  const running = raceKey > 0 && finishOrder.length < 3

  return (
    <section id="race" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="mb-8 text-center">
        <p className="mb-2 text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase">Race Mode</p>
        <h2 className="text-3xl font-bold text-slate-100 sm:text-4xl">竞速实验室</h2>
        <p className="mx-auto mt-3 max-w-2xl text-slate-400">
          同一场 SDK 升级任务同屏起跑：Subagent 并行派发、摘要回流 8 段成果，Agent Team 靠共享任务列表协同交付 4 项成果，
          Dynamic Workflow 并行处理 12 个文件——看看同样的墙钟时间里谁的吞吐更高
        </p>
        <p className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-[11px] text-amber-300/90">
          示意动画 · 时长为教学编排，非实测性能
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={start}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:brightness-110"
        >
          {raceKey === 0 ? <Play size={16} /> : <RotateCcw size={15} />}
          {raceKey === 0 ? '开始竞速' : '重新竞速'}
        </button>
        {running && (
          <button
            onClick={stopAll}
            className="flex items-center gap-2 rounded-full border border-slate-700 px-5 py-2.5 text-sm text-slate-300 transition hover:border-slate-500"
          >
            <Flag size={14} />
            暂停全部
          </button>
        )}
        {finishOrder.length > 0 && (
          <div className="flex items-center gap-3 rounded-full border border-slate-800 bg-slate-900/70 px-5 py-2 text-sm">
            {finishOrder.map((id, i) => {
              const meta = archMetas.find((m) => m.id === id)!
              return (
                <span key={id} className="flex items-center gap-1.5">
                  <span>{MEDALS[i]}</span>
                  <span className="font-semibold" style={{ color: meta.color }}>
                    {meta.name}
                  </span>
                </span>
              )
            })}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {(['subagent', 'team', 'workflow'] as ArchId[]).map((id) => (
          <RaceLane key={`${id}-${raceKey}`} id={id} raceKey={raceKey} onFinish={onFinish} register={register} />
        ))}
      </div>

      <p className="mx-auto mt-6 max-w-3xl text-center text-sm text-slate-500">
        💡 观察重点（编排示意，非实测）：Dynamic Workflow 一次性生成静态 DAG，沿依赖边逐组解锁、并发处理 12 个文件，吞吐最高；
        Subagent 可同轮并行派发，但协调汇聚单一父脑；Agent Team 靠共享任务列表自协调，但有真实协商开销——
        这是「通信拓扑 + 控制权分布」带来的吞吐差异。
      </p>
    </section>
  )
}
