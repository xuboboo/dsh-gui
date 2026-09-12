// upgrade.mjs — dsh-gui 一键升级流水线
// 用法:
//   node dev/tools/upgrade/upgrade.mjs --tag dsh-v0.1.6-rc.1 --gui-version 1.2.0 [--from 步骤名] [--skip-install] [--skip-build]
//
// 步骤:
//   sync     官方仓库拉取 tag、创建 gui/<tag> 分支
//   patches  按序应用补丁序列（git am；冲突即停，解决后 git am --continue）
//   env      写 .npmrc（镜像）
//   install  pnpm install
//   build    pnpm build（全量：宿主 lib + 客户端 bundle + 前端 dist）
//   flatten  闭包感知拍平（conflict 自动嵌套）
//   assemble 拍平树镜像进工作区 + GUI 包回填 + 主题注入
//   pack     打 app.asar + profile seed
//   verify   发布门禁（存在性/版本/补丁标记/嵌套卫生）
//
// 设计要点：
// - 补丁序列 = dev/enhance/patches-series/*.patch（git format-patch 导出），
//   版本化在 enhance 仓库；升级 = 对新 tag 重放。
// - skipPatches（如 lockfile）自动跳过。
// - 任一步失败即停，--from 可从该步重跑（幂等：sync/patches 做成可重入）。
import fs from 'node:fs'
import path from 'node:path'
import { execSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const ROOT = process.env.DSH_GUI_ROOT ?? path.resolve(here, '../..')  // <dsh-gui> 根目录；也可用环境变量 DSH_GUI_ROOT 指定
const config = JSON.parse(fs.readFileSync(path.join(here, 'config.json'), 'utf8'))

// ---- 参数 ----
const args = process.argv.slice(2)
function arg(name) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const TAG = arg('--tag')
const GUI_VERSION = arg('--gui-version')
const FROM = arg('--from') || 'sync'
const SKIP_INSTALL = args.includes('--skip-install')
const SKIP_BUILD = args.includes('--skip-build')

const REPO = config.officialRepo
const FLAT = path.join(path.dirname(REPO), 'dsh-flat')
const WSNM = path.join(config.workspace, 'node_modules')
const PATCH_DIR = path.join(config.enhanceRepo, 'patches-series')
const LOG = path.join(ROOT, 'dev/builds/upgrade-pipeline.log')

function log(step, msg) { console.log(`[${step}] ${msg}`) }
function die(step, msg) { console.error(`[${step}] ✗ ${msg}\n流水线停止。解决后用 --from ${step} 重跑。`); process.exit(1) }
function sh(cmd, opts = {}) {
  try {
    const out = execSync(cmd, { stdio: 'pipe', encoding: 'utf8', timeout: opts.timeout ?? 3600000, ...opts })
    return { code: 0, out: String(out ?? '') }
  } catch (e) {
    return { code: e.status ?? 1, out: String(e.stdout ?? ''), err: String(e.stderr ?? '') }
  }
}
function assertRepo() {
  if (!fs.existsSync(path.join(REPO, '.git'))) die('sync', `官方仓库不存在: ${REPO}（首次请 git clone <upstream> ${REPO}）`)
}

const steps = ['sync', 'patches', 'env', 'install', 'build', 'flatten', 'assemble', 'pack', 'verify']
const startIdx = FROM === 'sync' ? 0 : steps.indexOf(FROM)
if (startIdx < 0) die('args', `未知步骤 ${FROM}；可选: ${steps.join(',')}`)
fs.mkdirSync(path.dirname(LOG), { recursive: true })
fs.appendFileSync(LOG, `\n===== RUN ${new Date().toISOString()} tag=${TAG ?? '(续)'} gui=${GUI_VERSION ?? '(续)'} from=${FROM} =====\n`)

// ---------- sync ----------
if (startIdx <= 0) {
  assertRepo()
  if (!TAG) die('sync', '缺少 --tag <officialTag>（如 dsh-v0.1.6-rc.1）')
  log('sync', `拉取 ${TAG}`)
  let r = sh(`git -C "${REPO}" fetch origin --tags --prune`, { timeout: 600000 })
  if (r.code !== 0) die('sync', 'git fetch 失败: ' + (r.err || r.out).slice(0, 300))
  r = sh(`git -C "${REPO}" checkout -B gui/${TAG} ${TAG}`, { timeout: 120000 })
  if (r.code !== 0) die('sync', 'checkout 失败: ' + (r.err || r.out).slice(0, 300))
  // 分支基线记录
  const cfg = { ...config, officialTag: TAG, guiBranch: `gui/${TAG}` }
  if (GUI_VERSION) cfg.guiVersion = GUI_VERSION
  fs.writeFileSync(path.join(here, 'config.json'), JSON.stringify(cfg, null, 2) + '\n')
  log('sync', `分支 gui/${TAG} 就绪`)
}

// ---------- patches ----------
if (startIdx <= 1) {
  if (!fs.existsSync(PATCH_DIR)) die('patches', `补丁序列缺失: ${PATCH_DIR}`)
  const patches = fs.readdirSync(PATCH_DIR).filter(f => f.endsWith('.patch')).sort()
    .filter(f => !config.skipPatches.some(s => f.includes(s)))
  log('patches', `按序应用 ${patches.length} 个补丁`)
  for (const f of patches) {
    log('patches', `  am ${f}`)
    const r = sh(`git -C "${REPO}" am --3way "${path.join(PATCH_DIR, f)}"`, { timeout: 300000 })
    if (r.code !== 0) {
      sh(`git -C "${REPO}" am --abort`)
      die('patches', `${f} 应用失败（已回滚该补丁）。通常 = 官方改动与补丁冲突。手工处理：\n` +
        `  git -C "${REPO}" checkout gui/${TAG}\n` +
        `  git -C "${REPO}" am --3way "${path.join(PATCH_DIR, f)}"\n` +
        `  解决冲突后: git -C "${REPO}" am --continue\n` +
        `  然后重跑: node upgrade.mjs --tag ${TAG} --gui-version ${GUI_VERSION ?? config.guiVersion} --from env`)
    }
  }
  log('patches', '补丁序列应用完成')
}

// ---------- env ----------
if (startIdx <= 2) {
  fs.writeFileSync(path.join(REPO, '.npmrc'), `registry=${config.registry}\n`)
  log('env', '.npmrc 已写入（镜像源）')
}

// ---------- install ----------
if (startIdx <= 3) {
  if (SKIP_INSTALL) { log('install', '跳过（--skip-install）') } else {
    log('install', 'pnpm install（可能数分钟）')
    const r = sh(`pnpm install --reporter=append-only`, { cwd: REPO, timeout: 3600000 })
    if (r.code !== 0) die('install', 'pnpm install 失败，详见控制台')
  }
}

// ---------- build ----------
if (startIdx <= 4) {
  if (SKIP_BUILD) { log('build', '跳过（--skip-build）') } else {
    log('build', 'pnpm run build（宿主 lib + 客户端 bundle + 前端 dist，约 5-10 分钟）')
    const r = sh(`pnpm run build`, { cwd: REPO, timeout: 7200000 })
    if (r.code !== 0) die('build', '构建失败。若为补丁兼容性问题，修复源码后从 build 重跑。')
  }
}

// ---------- flatten ----------
function flattenScript(REAL, DEST) {
  return `// 由 upgrade.mjs 生成的闭包感知拍平脚本
const fs = require('fs'), path = require('path')
const REPO = ${JSON.stringify(REAL)}
const ANCHOR_PKG = path.join(REPO, 'apps', 'cli')
const HOIST = path.join(REPO, 'node_modules', '.pnpm', 'node_modules')
const STORE = path.join(REPO, 'node_modules', '.pnpm')
const DEST = ${JSON.stringify(DEST)}
console.log('FLATTEN_START', new Date().toISOString())
fs.rmSync(path.dirname(DEST), { recursive: true, force: true })
fs.mkdirSync(DEST, { recursive: true })
function copyTree(src, dest, active) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue
    const s = path.join(src, entry.name), d = path.join(dest, entry.name)
    const real = entry.isSymbolicLink() ? fs.realpathSync(s) : s
    if (active.has(real)) continue
    const st = fs.lstatSync(real)
    if (st.isDirectory()) { active.add(real); copyTree(real, d, active); active.delete(real) }
    else fs.copyFileSync(real, d)
  }
}
function manifestOf(d) { try { return JSON.parse(fs.readFileSync(path.join(d, 'package.json'), 'utf8')) } catch { return {} } }
function depNames(m) { return [...Object.keys(m.dependencies || {}), ...Object.keys(m.peerDependencies || {}), ...Object.keys(m.optionalDependencies || {})] }
function storeSiblingDir(realDir) {
  const norm = realDir.replace(/\\\\/g, '/')
  const idx = norm.indexOf('/node_modules/.pnpm/')
  if (idx < 0) return undefined
  const vdir = norm.slice(idx + '/node_modules/.pnpm/'.length).split('/')[0]
  return path.join(STORE, vdir, 'node_modules')
}
const written = new Map(), conflicts = [], nests = new Map(), visited = new Set(), unresolved = new Set()
const queue = []
const destPathOf = n => path.join(DEST, ...n.split('/'))
function claimTop(name, realDir) {
  if (written.has(name)) return false
  written.set(name, realDir); copyTree(realDir, destPathOf(name), new Set([realDir])); return true
}
function recordConflict(name, realDir, consumerReal) {
  conflicts.push(name + ': kept ' + written.get(name) + ' | nested ' + realDir + ' for ' + consumerReal)
  if (!nests.has(consumerReal)) nests.set(consumerReal, [])
  const list = nests.get(consumerReal)
  if (!list.some(e => e.name === name && e.realDir === realDir)) list.push({ name, realDir })
}
function writeFlat(name, realDir, consumerReal) {
  const segs = name.split('/')
  if (name.startsWith('@') && segs.length === 1) {
    for (const child of fs.readdirSync(realDir, { withFileTypes: true })) {
      const childName = name + '/' + child.name
      const childReal = child.isSymbolicLink() ? fs.realpathSync(path.join(realDir, child.name)) : path.join(realDir, child.name)
      const st = fs.lstatSync(childReal)
      if (!st.isDirectory()) continue
      if (!claimTop(childName, childReal)) {
        if (written.get(childName) !== childReal) recordConflict(childName, childReal, consumerReal || '?')
      }
    }
    return
  }
  if (!claimTop(name, realDir)) {
    if (written.get(name) !== realDir) recordConflict(name, realDir, consumerReal || '?')
  }
}
{
  const real = fs.realpathSync(ANCHOR_PKG)
  copyTree(real, path.join(DEST, '@deepseek-ai', 'dsh'), new Set([real]))
  written.set('@deepseek-ai/dsh', real)
  queue.push({ name: '@deepseek-ai/dsh', dir: real })
}
let qc = 0
while (queue.length) {
  const { name, dir } = queue.shift(); qc++
  if (qc % 100 === 0) console.log('...', qc, 'visited,', written.size, 'written,', conflicts.length, 'conflicts')
  const sib = storeSiblingDir(dir)
  for (const dep of depNames(manifestOf(dir))) {
    let real
    const local = path.join(dir, 'node_modules', dep)
    if (fs.existsSync(local)) { try { real = fs.realpathSync(local) } catch {} }
    if (real === undefined && sib !== undefined) {
      const s = path.join(sib, dep)
      if (fs.existsSync(s)) { try { real = fs.realpathSync(s) } catch {} }
    }
    if (real === undefined) {
      const h = path.join(HOIST, dep)
      if (fs.existsSync(h)) { try { real = fs.realpathSync(h) } catch {} }
    }
    if (real === undefined || !fs.existsSync(path.join(real, 'package.json'))) { unresolved.add(dep + ' (from ' + name + ')'); continue }
    writeFlat(dep, real, dir)
    if (!visited.has(real)) { visited.add(real); queue.push({ name: dep, dir: real }) }
  }
}
let nested = 0
for (const [consumerReal, list] of nests) {
  const consumerName = [...written.entries()].find(([, r]) => r === consumerReal)?.[0]
  if (consumerName === undefined) continue
  for (const { name, realDir } of list) {
    copyTree(realDir, path.join(destPathOf(consumerName), 'node_modules', ...name.split('/')), new Set([realDir]))
    nested++
  }
}
console.log('VISITED=' + visited.length, 'WRITTEN=' + written.size, 'CONFLICTS=' + conflicts.length, 'NESTED=' + nested)
for (const c of conflicts) console.log('  CONFLICT', c)
console.log('UNRESOLVED=' + unresolved.size)
const seen = fs.readdirSync(DEST)
console.log('READBACK_TOP_LEVEL=' + seen.length)
if (!fs.existsSync(path.join(DEST, 'js-yaml'))) { console.error('js-yaml 缺失——拍平异常'); process.exit(1) }
console.log('FLATTEN_DONE', new Date().toISOString())
`;
}

// ---------- flatten ----------
if (startIdx <= 5) {
  log('flatten', '闭包感知拍平（BFS + 冲突自动嵌套）')
  fs.rmSync(FLAT, { recursive: true, force: true })
  fs.mkdirSync(path.join(FLAT, 'node_modules'), { recursive: true })
  const REAL = fs.realpathSync(REPO)
  fs.writeFileSync(path.join(REPO, '_pipeline_flatten.cjs'), flattenScript(REAL, path.join(FLAT, 'node_modules')))
  const r = sh(`node "${path.join(REPO, '_pipeline_flatten.cjs')}"`, { timeout: 3600000 })
  if (r.code !== 0) die('flatten', '拍平失败: ' + ((r.out || '') + (r.err || '')).slice(-500))
  log('flatten', (r.out || '').split('\n').filter(l => /READBACK_TOP|children|CONFLICTS=/.test(l)).join(' | '))
}

// ---------- assemble ----------
if (startIdx <= 6) {
  log('assemble', '镜像拍平树进工作区 + GUI 包回填 + 主题注入')
  const st = sh(`node "${path.join(ROOT, 'dev/builds/upgrade-v2/_assemble_workspace.cjs')}" --flat "${FLAT}/node_modules" --repo "${REPO}"`, { timeout: 3600000 })
  if (st.code !== 0) {
    console.error(st.err || st.out || '')
    die('assemble', '组装失败（详见上方输出）')
  }
}

// ---------- pack ----------
if (startIdx <= 7) {
  const ver = GUI_VERSION ?? config.guiVersion
  log('pack', `pack.mjs ${ver}`)
  const r = sh(`node "${path.join(ROOT, 'dev/tools/pack.mjs')}" ${ver}`, { cwd: path.join(ROOT, 'dev/tools'), timeout: 3600000 })
  if (r.code !== 0) die('pack', '打包失败（详见 dev/tools/pack-*.log）')
  log('pack', `产物: dev/builds/app.asar.v${ver.replace(/\./g, '')} + profile-seed`)
}

// ---------- verify ----------
if (startIdx <= 8) {
  log('verify', '发布门禁')
  const r = sh(`node "${path.join(ROOT, 'dev/tools/verify-v110.mjs')}"`, { cwd: ROOT, timeout: 600000 })
    if (r.code !== 0 || !/VERIFY_OK/.test(r.out || '')) die('verify', '门禁未全过——不得发版')
  const n = sh(`node "${path.join(ROOT, 'dev/builds/upgrade-v2/_audit_nests.cjs')}"`, { cwd: path.join(ROOT, 'dev/builds/upgrade-v2'), timeout: 300000 })
  if (n.code !== 0) die('verify', '嵌套卫生未过')
  log('verify', '全部门禁通过')
}

console.log('\nPIPELINE_DONE 下一步: 部署(swap seed/asar + fill_natives) → 浏览器实测 → 打 zip → GitHub Release')
