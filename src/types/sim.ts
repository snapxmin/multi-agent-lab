// 多智能体架构模拟引擎 —— 类型定义

export type ArchId = 'subagent' | 'team' | 'workflow'

export type NodeKind =
  | 'user'
  | 'main' // 主 Agent
  | 'lead' // Lead Agent
  | 'member' // 团队成员
  | 'sub' // 子 Agent
  | 'script' // JS 编排脚本
  | 'runtime' // Runtime 状态
  | 'tasklist' // 共享任务列表（Agent Team 协调中枢）
  | 'human' // 人类

export interface NodeDef {
  id: string
  label: string
  sub?: string
  x: number
  y: number
  kind: NodeKind
  appearAt?: number // 秒，undefined 表示一开始就存在
}

export interface EdgeDef {
  from: string
  to: string
  dashed?: boolean
  faint?: boolean
}

export type PacketKind = 'task' | 'result' | 'chat' | 'state' | 'human' | 'final'

export interface PacketEvent {
  t: number
  from: string
  to: string
  dur: number
  kind: PacketKind
  label?: string
  /** result 包是否计入「已完成」统计（中间失败的尝试不计入），默认 true */
  countsDone?: boolean
}

export interface WorkEvent {
  t: number
  node: string
  dur: number
}

export interface LogEvent {
  t: number
  text: string
  tone?: 'info' | 'success' | 'warn' | 'human' | 'system'
}

export interface StatEvent {
  t: number
  key: string
  delta?: number
  set?: number
}

/** JS 编排脚本：当前执行行高亮区间 */
export interface ScriptSpan {
  t0: number
  t1: number
  line: number // 1-based
}

export interface ScriptDef {
  file: string
  lines: string[]
  spans: ScriptSpan[]
}

/** Runtime 脚本变量变化事件 */
export interface VarEvent {
  t: number
  key: string
  value: string | number
}

export interface Scenario {
  id: ArchId
  duration: number // 秒
  nodes: NodeDef[]
  edges: EdgeDef[]
  packets: PacketEvent[]
  works: WorkEvent[]
  logs: LogEvent[]
  stats: StatEvent[]
  script?: ScriptDef
  vars?: VarEvent[]
}

export interface StatDisplay {
  key: string
  label: string
  max: number
  format?: (v: number) => string
  tone?: 'ok' | 'warn' | 'danger'
}

export interface ArchMeta {
  id: ArchId
  name: string
  cn: string
  en: string
  tagline: string
  color: string // 主色 hex
  colorSoft: string
  topology: string
  control: string
  bestFor: string
  concurrency: string
  cost: string
  reproducibility: string
  stats: StatDisplay[]
}
