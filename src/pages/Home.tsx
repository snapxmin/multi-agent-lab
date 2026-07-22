import Hero from '@/sections/Hero'
import Simulator from '@/sections/Simulator'
import Comparison from '@/sections/Comparison'
import Race from '@/sections/Race'
import { Bot } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 antialiased selection:bg-cyan-500/30">
      {/* 顶部导航 */}
      <nav className="fixed top-0 z-50 w-full border-b border-slate-800/60 bg-slate-950/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:px-6">
          <Bot size={20} className="text-cyan-400" />
          <span className="text-sm font-bold text-slate-100">Multi-Agent Lab</span>
          <div className="ml-auto flex items-center gap-1 text-xs sm:gap-2 sm:text-sm">
            <a href="#simulator" className="rounded-full px-3 py-1.5 text-slate-400 transition hover:bg-slate-800/70 hover:text-slate-100">
              模拟器
            </a>
            <a href="#comparison" className="rounded-full px-3 py-1.5 text-slate-400 transition hover:bg-slate-800/70 hover:text-slate-100">
              八维对比
            </a>
            <a href="#race" className="rounded-full px-3 py-1.5 text-slate-400 transition hover:bg-slate-800/70 hover:text-slate-100">
              竞速实验室
            </a>
          </div>
        </div>
      </nav>

      <Hero />
      <div className="border-t border-slate-800/60" />
      <Simulator />
      <div className="border-t border-slate-800/60" />
      <Comparison />
      <div className="border-t border-slate-800/60" />
      <Race />

      <footer className="border-t border-slate-800/60 py-10 text-center">
        <p className="text-sm text-slate-500">Multi-Agent Architecture Lab · 多智能体架构可视化实验室</p>
        <p className="mt-2 text-xs text-slate-600">
          星型 ≠ 网状 ≠ 脚本调度 —— 拓扑决定通信，控制权决定行为
        </p>
      </footer>
    </div>
  )
}
