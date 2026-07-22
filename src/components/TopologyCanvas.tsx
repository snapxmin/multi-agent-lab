import { useMemo } from 'react'
import type { NodeDef, PacketEvent, PacketKind, Scenario } from '@/types/sim'

export const PACKET_COLORS: Record<PacketKind, string> = {
  task: '#67e8f9',
  result: '#fbbf24',
  chat: '#f0abfc',
  state: '#94a3b8',
  human: '#fb7185',
  final: '#ffffff',
}

const KIND_GLYPH: Record<string, string> = {
  user: '👤',
  main: '🧠',
  lead: '🧭',
  member: '🤖',
  sub: '⚙️',
  script: '📜',
  runtime: '🗄️',
  tasklist: '📋',
  human: '🧑‍💻',
}

const KIND_R: Record<string, number> = {
  user: 24,
  human: 24,
  main: 32,
  lead: 32,
  script: 32,
  runtime: 27,
  tasklist: 27,
  member: 22,
  sub: 21,
}

interface Pt {
  x: number
  y: number
}

function hashStr(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

function curveFor(a: Pt, b: Pt, key: string) {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dx = b.x - a.x
  const dy = b.y - a.y
  const dist = Math.hypot(dx, dy) || 1
  const sign = hashStr(key) % 2 === 0 ? 1 : -1
  const bend = Math.min(Math.max(dist * 0.14, 14), 42) * sign
  return { x: mx + (-dy / dist) * bend, y: my + (dx / dist) * bend }
}

function quadPoint(p0: Pt, c: Pt, p1: Pt, u: number): Pt {
  const v = 1 - u
  return {
    x: v * v * p0.x + 2 * v * u * c.x + u * u * p1.x,
    y: v * v * p0.y + 2 * v * u * c.y + u * u * p1.y,
  }
}

function ease(u: number) {
  return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2
}

interface Props {
  scenario: Scenario
  color: string
  t: number
  extraPackets?: PacketEvent[]
  compact?: boolean
  /** 在哪些节点下方显示上下文/状态条 */
  ctxBarFor?: string[]
  /** 节点点击（控制权 / 可达性探索） */
  onNodeClick?: (node: NodeDef) => void
  /** 点击后短暂高亮的节点 */
  flashNode?: string | null
}

export default function TopologyCanvas({ scenario, color, t, extraPackets = [], compact = false, ctxBarFor = [], onNodeClick, flashNode }: Props) {
  const nodeMap = useMemo(() => {
    const m = new Map<string, NodeDef>()
    scenario.nodes.forEach((n) => m.set(n.id, n))
    return m
  }, [scenario])

  const packets = useMemo(
    () => [...scenario.packets, ...extraPackets],
    [scenario, extraPackets],
  )

  const ctxValue = useMemo(
    () =>
      scenario.stats
        .filter((s) => s.key === 'ctx' && s.t <= t)
        .reduce((acc, s) => acc + (s.delta ?? 0), 0),
    [scenario, t],
  )

  const activeWorks = useMemo(
    () => scenario.works.filter((w) => w.t <= t && t < w.t + w.dur),
    [scenario, t],
  )

  const activePackets = useMemo(
    () => packets.filter((p) => p.t <= t && t <= p.t + p.dur),
    [packets, t],
  )

  const visibleNode = (n: NodeDef) =>
    (n.appearAt === undefined || t >= n.appearAt - 0.35) &&
    (n.disappearAt === undefined || t <= n.disappearAt + 0.45)
  const nodeScale = (n: NodeDef) => {
    let s = 1
    if (n.appearAt !== undefined) {
      const u = Math.min(Math.max((t - (n.appearAt - 0.35)) / 0.35, 0), 1)
      s = ease(u)
    }
    if (n.disappearAt !== undefined) {
      const u = Math.min(Math.max((t - n.disappearAt) / 0.45, 0), 1)
      s *= 1 - ease(u)
    }
    return s
  }

  return (
    <svg viewBox="0 0 860 560" className="h-full w-full" style={{ display: 'block' }}>
      <defs>
        <filter id={`glow-${scenario.id}`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <pattern id={`grid-${scenario.id}`} width="34" height="34" patternUnits="userSpaceOnUse">
          <circle cx="1.2" cy="1.2" r="1.2" fill="rgba(148,163,184,0.10)" />
        </pattern>
        <marker
          id={`arrow-${scenario.id}`}
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="5"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
        </marker>
      </defs>

      <rect width="860" height="560" fill={`url(#grid-${scenario.id})`} rx="12" />

      {/* 边 */}
      {scenario.edges.map((e) => {
        const a = nodeMap.get(e.from)
        const b = nodeMap.get(e.to)
        if (!a || !b || !visibleNode(a) || !visibleNode(b)) return null
        // appearAt：边在指定时刻淡入（DAG 在 topoSort 完成后浮现）
        const edgeU = e.appearAt === undefined ? 1 : ease(Math.min(Math.max((t - (e.appearAt - 0.3)) / 0.3, 0), 1))
        if (edgeU <= 0) return null
        // dep 边：终点收缩到目标节点边缘（半径 + 4），露出箭头
        let end: Pt = b
        if (e.dep) {
          const dx = b.x - a.x
          const dy = b.y - a.y
          const dist = Math.hypot(dx, dy) || 1
          const rb = KIND_R[b.kind] ?? 22
          end = { x: b.x - (dx / dist) * (rb + 4), y: b.y - (dy / dist) * (rb + 4) }
        }
        const c = curveFor(a, end, e.from + e.to)
        return (
          <path
            key={`${e.from}-${e.to}`}
            d={`M ${a.x} ${a.y} Q ${c.x} ${c.y} ${end.x} ${end.y}`}
            fill="none"
            stroke={e.dashed ? 'rgba(148,163,184,0.35)' : color}
            strokeOpacity={(e.faint ? 0.14 : e.dep ? 0.45 : 0.32) * edgeU}
            strokeWidth={e.faint ? 1 : e.dep ? 1.3 : 1.6}
            strokeDasharray={e.dashed ? '5 7' : undefined}
            markerEnd={e.dep ? `url(#arrow-${scenario.id})` : undefined}
          />
        )
      })}

      {/* 飞行中的消息包 */}
      {activePackets.map((p, i) => {
        const a = nodeMap.get(p.from)
        const b = nodeMap.get(p.to)
        if (!a || !b) return null
        const u = ease(Math.min((t - p.t) / p.dur, 1))
        const c = curveFor(a, b, p.from + p.to)
        const pos = quadPoint(a, c, b, u)
        const pc = p.kind === 'task' ? color : PACKET_COLORS[p.kind]
        return (
          <g key={`${p.t}-${p.from}-${p.to}-${i}`} filter={`url(#glow-${scenario.id})`}>
            <circle cx={pos.x} cy={pos.y} r={9} fill={pc} opacity={0.25} />
            <circle cx={pos.x} cy={pos.y} r={4.5} fill={pc} />
            {!compact && p.label && (
              <text
                x={pos.x}
                y={pos.y - 13}
                textAnchor="middle"
                fontSize={11}
                fill={pc}
                style={{ fontWeight: 600 }}
              >
                {p.label}
              </text>
            )}
          </g>
        )
      })}

      {/* 节点 */}
      {scenario.nodes.map((n) => {
        if (!visibleNode(n)) return null
        const s = nodeScale(n)
        const r = KIND_R[n.kind] ?? 22
        const work = activeWorks.find((w) => w.node === n.id)
        const wp = work ? Math.min((t - work.t) / work.dur, 1) : 0
        const isCore = n.kind === 'main' || n.kind === 'lead' || n.kind === 'script'
        const dying = n.disappearAt !== undefined && t >= n.disappearAt
        const stroke = dying
          ? '#475569'
          : isCore ? color : n.kind === 'runtime' ? '#64748b' : n.kind === 'user' || n.kind === 'human' ? '#94a3b8' : color
        const C = 2 * Math.PI * (r + 6)
        const flashing = flashNode === n.id
        return (
          <g
            key={n.id}
            transform={`translate(${n.x}, ${n.y}) scale(${s})`}
            opacity={s}
            onClick={onNodeClick ? () => onNodeClick(n) : undefined}
            style={onNodeClick ? { cursor: 'pointer' } : undefined}
          >
            {/* 点击反馈光圈 */}
            {flashing && (
              <circle r={r + 12} fill="none" stroke={color} strokeWidth={2} opacity={0.8}>
                <animate attributeName="r" from={r + 4} to={r + 18} dur="0.5s" repeatCount="2" />
                <animate attributeName="opacity" from="0.9" to="0" dur="0.5s" repeatCount="2" />
              </circle>
            )}
            {/* 工作进度环 */}
            {work && (
              <circle
                r={r + 6}
                fill="none"
                stroke={color}
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - wp)}
                transform="rotate(-90)"
                filter={`url(#glow-${scenario.id})`}
              />
            )}
            <circle
              r={r}
              fill="#0b1220"
              stroke={stroke}
              strokeWidth={isCore ? 2.4 : 1.6}
              strokeOpacity={n.kind === 'runtime' ? 0.7 : 1}
              strokeDasharray={n.kind === 'runtime' || n.kind === 'tasklist' ? '4 4' : undefined}
              filter={work || isCore ? `url(#glow-${scenario.id})` : undefined}
            />
            <text textAnchor="middle" dy={compact ? 5 : 6} fontSize={compact ? 14 : 17}>
              {KIND_GLYPH[n.kind]}
            </text>
            {/* 销毁提示：实例回收（用完即毁） */}
            {dying && (
              <text
                textAnchor="middle"
                dy={compact ? 5 : 6}
                fontSize={compact ? 14 : 18}
                fill="#f87171"
                style={{ fontWeight: 700 }}
              >
                ✕
              </text>
            )}
            {!compact && (
              <>
                <text
                  y={r + 17}
                  textAnchor="middle"
                  fontSize={12.5}
                  fill="#e2e8f0"
                  style={{ fontWeight: 600 }}
                >
                  {n.label}
                </text>
                {n.sub && (
                  <text y={r + 32} textAnchor="middle" fontSize={10} fill="#64748b">
                    {n.sub}
                  </text>
                )}
              </>
            )}
            {/* 上下文 / 状态条 */}
            {ctxBarFor.includes(n.id) && (
              <g transform={`translate(-32, ${r + (compact ? 8 : n.sub ? 38 : 24)})`}>
                <rect width={64} height={5} rx={2.5} fill="rgba(148,163,184,0.15)" />
                <rect
                  width={64 * Math.min(ctxValue / 100, 1)}
                  height={5}
                  rx={2.5}
                  fill={ctxValue > 70 ? '#f87171' : color}
                  style={{ transition: 'width 0.3s' }}
                />
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}
