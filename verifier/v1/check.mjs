// Verifier v1 — 场景数据一致性自动检查（D1-D3）
// 用法：node verifier/v1/check.mjs（在 /mnt/agents/output/app 下运行）
import { execSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const tmp = path.join(root, 'verifier/.tmp')
mkdirSync(tmp, { recursive: true })

// 用 esbuild 把 TS 场景数据打包为 mjs 再导入（type-only import 会被剥离）
execSync(
  `npx esbuild src/lib/scenarios.ts --bundle --format=esm --outfile=${tmp}/scenarios.mjs --log-level=error`,
  { cwd: root, stdio: 'inherit' },
)
const { scenarios, archMetas } = await import(`${tmp}/scenarios.mjs`)

let failures = 0
const fail = (msg) => {
  failures++
  console.error(`  ✗ ${msg}`)
}
const ok = (msg) => console.log(`  ✓ ${msg}`)

for (const meta of archMetas) {
  const sc = scenarios[meta.id]
  console.log(`\n[${meta.id}]`)
  if (!sc) {
    fail('缺少场景')
    continue
  }
  const nodeIds = new Set(sc.nodes.map((n) => n.id))

  // D1 packet / work / edge 引用合法节点
  let bad = 0
  for (const p of sc.packets) {
    if (!nodeIds.has(p.from) || !nodeIds.has(p.to)) bad++
  }
  for (const w of sc.works) if (!nodeIds.has(w.node)) bad++
  for (const e of sc.edges) {
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) bad++
  }
  bad === 0 ? ok(`D1 节点引用全部合法（packets=${sc.packets.length}, works=${sc.works.length}, edges=${sc.edges.length}）`) : fail(`D1 存在 ${bad} 处非法节点引用`)

  // D2 meta.stats 与场景数据一致
  const doneCount = sc.packets.filter((p) => p.kind === 'result' && p.countsDone !== false).length
  const statKeys = new Set(sc.stats.map((s) => s.key))
  for (const sd of meta.stats) {
    if (sd.key === 'done') {
      sd.max === doneCount
        ? ok(`D2 done 上限 ${sd.max} 与 result 包数一致`)
        : fail(`D2 done 上限 ${sd.max} ≠ result 包数 ${doneCount}`)
    } else if (sd.key === 'msgs') {
      sd.max >= sc.packets.length
        ? ok(`D2 msgs 上限 ${sd.max} ≥ 总包数 ${sc.packets.length}`)
        : fail(`D2 msgs 上限 ${sd.max} < 总包数 ${sc.packets.length}`)
    } else if (sd.key === 'conc') {
      const peak = Math.max(
        ...sc.works.map((w) => sc.works.filter((x) => x.t < w.t + w.dur && x.t + x.dur > w.t && !['main', 'lead', 'script'].includes(x.node)).length),
        0,
      )
      sd.max >= peak ? ok(`D2 conc 上限 ${sd.max} ≥ 峰值 ${peak}`) : fail(`D2 conc 上限 ${sd.max} < 峰值 ${peak}`)
    } else {
      statKeys.has(sd.key) ? ok(`D2 统计键 ${sd.key} 有场景数据来源`) : fail(`D2 统计键 ${sd.key} 无场景数据来源`)
    }
  }

  // D3 script spans 合法且时间递增
  if (sc.script) {
    let prev = -1
    let badSpan = 0
    for (const sp of sc.script.spans) {
      if (sp.line < 1 || sp.line > sc.script.lines.length) badSpan++
      if (sp.t0 < prev) badSpan++
      prev = sp.t0
    }
    badSpan === 0 ? ok(`D3 脚本高亮 spans 合法（${sc.script.spans.length} 段 / ${sc.script.lines.length} 行）`) : fail(`D3 脚本 spans 存在 ${badSpan} 处非法`)
  }

  // 场景内时长覆盖：最后一个事件不超过 duration
  const lastT = Math.max(
    ...sc.packets.map((p) => p.t + p.dur),
    ...sc.works.map((w) => w.t + w.dur),
    ...sc.logs.map((l) => l.t),
  )
  lastT <= sc.duration + 0.01
    ? ok(`时长覆盖 ${sc.duration}s（最后事件 ${lastT.toFixed(1)}s）`)
    : fail(`最后事件 ${lastT.toFixed(1)}s 超出 duration ${sc.duration}s`)
}

// A1 统一场景关键词检查
console.log('\n[统一场景]')
for (const meta of archMetas) {
  const sc = scenarios[meta.id]
  const text = sc.logs.map((l) => l.text).join('') + sc.packets.map((p) => p.label ?? '').join('')
  const hits = ['SDK', '测试', '重试'].filter((k) => text.includes(k))
  hits.length === 3 ? ok(`${meta.id} 场景包含 SDK/测试/重试要素`) : fail(`${meta.id} 场景缺少要素：${['SDK', '测试', '重试'].filter((k) => !hits.includes(k)).join(',')}`)
}

console.log(failures === 0 ? '\n全部通过 ✅' : `\n${failures} 项未通过 ❌`)
process.exit(failures === 0 ? 0 : 1)
