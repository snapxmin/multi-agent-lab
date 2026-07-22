import { useMemo } from 'react'
import type { ScriptDef, VarEvent } from '@/types/sim'
import { Braces, Database } from 'lucide-react'

interface Props {
  script: ScriptDef
  vars?: VarEvent[]
  t: number
  color: string
}

export default function ScriptPanel({ script, vars = [], t, color }: Props) {
  const activeLines = useMemo(
    () => new Set(script.spans.filter((sp) => sp.t0 <= t && t <= sp.t1).map((sp) => sp.line)),
    [script, t],
  )

  const varSnapshot = useMemo(() => {
    const m = new Map<string, string | number>()
    vars.filter((v) => v.t <= t).forEach((v) => m.set(v.key, v.value))
    return [...m.entries()]
  }, [vars, t])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950/90">
      <div className="flex items-center gap-2 border-b border-slate-800/80 px-4 py-2.5">
        <Braces size={13} style={{ color }} />
        <span className="font-mono text-[11px] text-slate-400">{script.file}</span>
        <span className="ml-auto rounded px-1.5 py-0.5 font-mono text-[10px]" style={{ backgroundColor: `${color}1f`, color }}>
          执行中
        </span>
      </div>

      <div className="max-h-72 overflow-y-auto px-0 py-2 font-mono text-[11px] leading-[1.7]">
        {script.lines.map((line, i) => {
          const ln = i + 1
          const active = activeLines.has(ln)
          return (
            <div
              key={ln}
              className="flex transition-colors duration-200"
              style={active ? { backgroundColor: `${color}1a`, boxShadow: `inset 2.5px 0 0 ${color}` } : undefined}
            >
              <span className="w-9 shrink-0 pr-3 text-right text-slate-700 select-none">{ln}</span>
              <pre className={`whitespace-pre-wrap ${active ? 'text-slate-100' : 'text-slate-500'}`}>{line}</pre>
            </div>
          )
        })}
      </div>

      <div className="border-t border-slate-800/80 px-4 py-3">
        <div className="mb-2 flex items-center gap-1.5">
          <Database size={12} className="text-slate-500" />
          <span className="text-[11px] font-semibold text-slate-400">Runtime 变量</span>
          <span className="ml-auto text-[10px] text-slate-600">不占用 LLM 上下文</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {varSnapshot.length === 0 && <span className="font-mono text-[11px] text-slate-600">（等待初始化…）</span>}
          {varSnapshot.map(([k, v]) => (
            <span
              key={k}
              className="rounded-md border border-slate-800 bg-slate-900/80 px-2 py-1 font-mono text-[10.5px]"
            >
              <span className="text-slate-500">{k} = </span>
              <span style={{ color }}>{String(v)}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
