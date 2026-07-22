import { archMetas } from '@/lib/scenarios'
import { ChevronDown, PlayCircle, Table2 } from 'lucide-react'

export default function Hero() {
  return (
    <header className="relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden px-4 text-center">
      {/* 背景光斑 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="animate-blob absolute top-[12%] left-[12%] h-72 w-72 rounded-full bg-cyan-500/14 blur-3xl" />
        <div className="animate-blob animation-delay-2000 absolute top-[30%] right-[10%] h-80 w-80 rounded-full bg-fuchsia-500/12 blur-3xl" />
        <div className="animate-blob animation-delay-4000 absolute bottom-[8%] left-[38%] h-72 w-72 rounded-full bg-emerald-500/12 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.13]"
          style={{
            backgroundImage: 'radial-gradient(rgba(148,163,184,0.5) 1px, transparent 1px)',
            backgroundSize: '34px 34px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-4xl">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/70 px-4 py-1.5 text-xs text-slate-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          游戏化交互演示 · Multi-Agent Architecture Lab
        </div>

        <h1 className="text-4xl leading-tight font-black tracking-tight text-slate-50 sm:text-6xl">
          多智能体架构
          <span className="bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-emerald-400 bg-clip-text text-transparent">
            可视化实验室
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
          用动画复现 <span className="text-cyan-300">Subagent</span>、
          <span className="text-fuchsia-300"> Agent Team</span>、
          <span className="text-emerald-300"> Dynamic Workflow</span> 三种多智能体架构的工作方式——
          看消息如何在星型、网状、脚本调度拓扑之间流动，直观理解它们的关键差异。
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#simulator"
            className="flex items-center gap-2 rounded-full bg-cyan-400 px-7 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-400/25 transition hover:brightness-110"
          >
            <PlayCircle size={17} />
            进入架构模拟器
          </a>
          <a
            href="#comparison"
            className="flex items-center gap-2 rounded-full border border-slate-600 px-7 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-400 hover:bg-slate-800/50"
          >
            <Table2 size={16} />
            直达八维对比
          </a>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-3">
          {archMetas.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-5 py-3 backdrop-blur transition hover:border-slate-700"
            >
              <span className="h-8 w-1.5 rounded-full" style={{ backgroundColor: m.color }} />
              <div className="text-left">
                <p className="text-sm font-bold" style={{ color: m.color }}>{m.name}</p>
                <p className="text-[11px] text-slate-500">{m.topology}拓扑 · {m.concurrency}并发</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <a href="#simulator" className="absolute bottom-7 z-10 animate-bounce text-slate-600 transition hover:text-slate-400">
        <ChevronDown size={26} />
      </a>
    </header>
  )
}
