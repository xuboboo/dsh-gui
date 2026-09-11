// detect.mjs — 官方新版检测器
// 用法: node dev/tools/upgrade/detect.mjs
// 读取 config.json 的 officialTag，查询官方 GitHub Releases，
// 列出所有比当前底座新的版本（含预发布），提示是否需要升级。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const config = JSON.parse(fs.readFileSync(path.join(here, 'config.json'), 'utf8'))

function cmp(a, b) {
  const pa = String(a).replace(/^dsh-v/, '').split(/[.-]/).map(x => Number.parseInt(x, 10) || x)
  const pb = String(b).replace(/^dsh-v/, '').split(/[.-]/).map(x => Number.parseInt(x, 10) || x)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i], y = pb[i]
    if (x === y) continue
    if (x === undefined) return -1
    if (y === undefined) return 1
    if (typeof x === 'number' && typeof y === 'number') return x - y
    return String(x) < String(y) ? -1 : 1
  }
  return 0
}

const res = await fetch('https://api.github.com/repos/deepseek-ai/deepseek-harness/releases?per_page=30', {
  headers: { 'User-Agent': 'dsh-gui-upgrade' },
})
if (!res.ok) {
  console.error('查询 GitHub Releases 失败:', res.status)
  process.exit(1)
}
const releases = await res.json()
const current = config.officialTag.replace(/^dsh-v/, '')
const newer = releases
  .map(r => r.tag_name)
  .filter(t => t.startsWith('dsh-v'))
  .filter(t => cmp(t, config.officialTag) > 0)

console.log('当前底座:', config.officialTag, '(GUI v' + config.guiVersion + ')')
if (newer.length === 0) {
  console.log('已是最新底座，无需升级。')
} else {
  console.log('可升级的官方新版本（新→旧）:')
  for (const t of newer) console.log('  -', t)
  console.log('\n建议：小步快跑，每个官方 rc/alpha 都升，补丁冲突最小。')
  console.log('执行升级: node dev/tools/upgrade/upgrade.mjs --tag ' + newer[newer.length - 1] + ' --gui-version <新GUI版本号>')
}
