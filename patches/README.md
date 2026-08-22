# rc.5 启动崩溃修复方案

## 症状 / Symptoms

桌面版启动后立即退出，日志报：

```
Error: failed to apply loader entry <id> (@deepseek-ai/cordis-plugin-hmr): --expose-internals is required for HMR service
```

## 根因 / Root causes

1. **launcher 漏传 `--expose-internals`**：桌面 launcher 用 `spawn(process.execPath, [cliPath, "web", …])` 启动运行时，未传 `--expose-internals`；而 HMR 服务（每个 profile 必需）依赖该标志获取 Node internal loader。`node-addon-require-builtin` 后备在 Electron 的 V8 中不兼容（找不到 `GetAlignedPointerFromEmbedderData` 符号），因此必然崩溃。
2. **profile 依赖为指向 asar 内部的 junction**：`healProfilesModuleFallback` 把 profile 依赖建成指向 `app.asar` 内路径的 junction。加 `--expose-internals` 后 loader 改用原生 Node internal loader 解析模块，不认识 asar 路径 → `Cannot find package`。
3. **heal 拒绝真实目录**：`ensureSymlink` 遇到已存在的真实目录会抛错退出。

## 修复 / Fixes

| 补丁 | 文件 | 内容 |
| --- | --- | --- |
| 0001 | `desktop/lib/main.js` | spawn 参数加入 `--expose-internals` |
| 0002 | `@deepseek-ai/dsh-app-boot/lib/index.js` | `ensureSymlink` 对已存在的真实目录直接跳过（不再抛错） |
| 0003 | `desktop/lib/main.js` | 放行 `clipboard-sanitized-write` 权限，修复复制按钮无反应（官方 launcher 拒绝一切权限请求，含剪贴板写入） |

另外还需（脚本化或手动）：

- **恢复 `resources/app.asar.unpacked`**：重打包时按原 unpack 规则恢复 200 个原生依赖文件（`.node`/`.dll` 等必须位于真实文件系统）。
- **profile 依赖落盘**：把 `<DSH_HOME>/profiles/node_modules` 下的 junction 替换为真实依赖文件（从 asar 完整提取；或安装对应版本），保证两种解析路径都可用。

## 验证 / Verification

- 模拟 launcher 启动：`electron.exe --expose-internals <asar>/node_modules/@deepseek-ai/dsh/lib/bin.js web --host 127.0.0.1 --port <port>`，等待 `dsh web: http://…` 就绪行并确认 HTTP 200。
- 直接启动桌面应用，确认窗口正常、日志无 `runtime exited`。

> 提示：本修复针对 rc.5；建议同时关注官方新版是否已修复 launcher。


---

## v1.0.2 附加说明

- 新增浏览器端插件 **Token 用量统计设置页**（`client-plugins/ui-settings-token-usage`）：总览卡片、每日柱状图、会话排行，含**清空统计 / 恢复完整统计**（非破坏性，localStorage 持久）。安装方式见插件目录 README。

---

## v1.0.10 附加说明（目录选择器修复）

- 新增补丁 **0010**：官方 rc.5 打包漏发两个文件导致"添加工作区"报 `win32 folder dialog worker exited before reporting a result`：
  1. `node_modules/@deepseek-ai/dsh-host-directory-picker-native/lib/worker.cjs` — package.json 声明但构建从未产出（手工按官方源码构建的 CJS 版本）；
  2. `node_modules/@koromix/koffi-win32-x64/{index.js,package.json,win32_x64/koffi.node,koffi.lib}` — 官方包只剩 README，koffi 无法加载平台绑定。
- 验证：worker 子进程（ELECTRON_RUN_AS_NODE）成功加载 koffi 并弹出系统文件夹对话框。

---

## v1.0.9 附加说明（静默升级 + 应用内重启提示条）

- 新增补丁 **0009**（`desktop/lib/main.js`）：更新流程改为**静默升级**。
- 行为：发现新版本后**无任何弹窗**，后台静默下载 → 校验 → 自动暂存（staging）；完成后在**应用窗口左下角**注入原生风格提示条（toast）：「更新已就绪 vX.Y.Z」，含 **立即重启 / 稍后重启** 两个按钮。
  - 立即重启：应用退出并自动重启完成安装；
  - 稍后重启：提示条消失，下次退出应用时自动应用（before-quit），下次启动即为新版本；
  - 若应用窗口已关闭则直接等退出时应用。
- 移除：下载进度弹窗（进度仅在日志记录）、下载开始/完成的系统通知、更新前的"发现新版本"确认框（自动检查与手动检查均静默，手动检查失败才弹错误框）。
- 修复：before-quit 检查的是 `app.asar` 而暂存文件实际为 `payload.asar`，导致"稍后重启"退出时从不生效——改为 `isUpdateStaged()` 检查。
- 新增 `alreadyStaged()`：已暂存同版本时不再重复下载，直接再次弹出提示条。
- **关键修复（"立即重启"终于可用）**：
  1. 应用脚本（apply-update.ps1）加 **UTF-8 BOM**（PS 5.1 无 BOM 按 GBK 解析中文路径会乱码）；
  2. 修正脚本内 applied.txt 行的转义错误（原生成 `('' + version + '')` 是 PowerShell 解析错误，整个脚本直接失败）；
  3. 修正 `asarTarget` 路径（`../../resources/app.asar` 在 asar 虚拟目录下解析错误，应为 `../../../app.asar`）；
  4. **实测发现：Electron 在 Windows 退出时会杀死其派生的子进程（Job Object），辅助脚本永远不会执行**——改为 `applyUpdateAndRelaunch()`：主进程原地 `copyFileSync` 覆盖 `app.asar`（实测可行）+ `app.relaunch()` 重启；before-quit 退出时应用同样原地覆盖；辅助脚本仅作兜底。

---

## v1.0.8 附加说明（更新进度弹窗重做）

- 新增补丁 **0008**（`desktop/lib/main.js`）：重做更新下载进度弹窗。
- 视觉：修复"正方形深色框 + 圆角卡片"两层折叠问题——窗口加 `hasShadow: false` 去掉系统矩形阴影，窗口背景色与卡片渐变底色一致（透明失效时不再露出方框），卡片改为单层扁平深色设计。
- 进度：curl 通道（实际下载成功的通道）此前完全不上报进度，现通过解析 `curl --progress-bar` 输出实时上报；四个下载通道统一走 `showDownloadProgress`（200ms 节流，文本与百分比同源计算，"3 / 33 MB" 与 9% 不再对不上）。

---

## v1.0.7 附加说明（重启服务误报修复）

- 新增补丁 **0007**（`desktop/lib/main.js`）：修复"帮助 → 重新启动本地服务"后闪现"运行时已停止 / runtime exited with code 1"错误页的问题。
- 根因：重启时旧运行时被 taskkill 后，其 exit 事件晚于新进程 spawn 到达，launcher 误以为运行时意外退出，在启动画面上覆盖了错误状态页。
- 修复：
  1. 重启流程设置 `expectedStop` 标记，被预期停止的进程不再弹错误页（日志标注 `(expected stop)`）；
  2. 就绪 URL 按进程归属跟踪（`applicationUrlOwner`），旧进程退出不再清掉新进程的就绪状态；
  3. Windows 下 `stopHarness` 真正等待子进程 exit 事件（带 5s 上限）后再启动新进程，消除端口释放竞态；
  4. 重启增加重入保护，连点"重新启动本地服务"不会反复杀掉刚起来的服务。

---

## v1.1.0 附加说明（官方 rc.2 多模态升级适配）

> 把 dsh-gui 从官方 **rc.5(0.1.0-rc.5,即稳定版 v1037)** 升级到官方最新**多模态版本 rc.2(0.1.1-rc.2 / `dsh-v0.1.1-rc.2` tag)**。官方 rc.2 新增图片/附件多模态能力（`dsh-client-ui-attachment`、`dsh-attachment`、ACP 等），但**删除了 rc.5 的两个包**并重构了启动逻辑，导致直接升级会启动崩溃或插件加载失败。本次适配做了三个修复：

### 1. `dsh-app-boot/lib/index.js` —— 启动崩溃根治（核心）

官方 rc.2 的 `ensureSymlink` 遇到"真实目录"（不是 symlink）会 `throw`，而 dsh-gui 的 profile 依赖是**实体目录**（v1037 的 v1.0.16 修复后布局），因此升级后启动即崩：

```
Error: dsh: ...\profiles\node_modules\@deepseek-ai\dsh exists and is not a symlink; remove it
	at ensureSymlink (dsh-app-boot/lib/index.js:379)
```

- 修复：`ensureSymlink` 遇到真实目录由 `throw` 改为 `return`（移植 v1037 的 patch 0002）。
- **并移植 v1037 的完整 `healProfilesModuleFallback`**：rc.2 官方版只做简单 symlink closure，缺失了 v1037 的关键逻辑：
  - `app.asar.unpacked` 原生模块处理（node-pty / sharp / koffi / ripgrep …）；
  - **`dsh-profile-seed` 种子 junction 优先**（毫秒级启动，替代 ~150MB 实体拷贝）；
  - Windows 下对 asar 内目标**实体拷贝**（Node ESM 解析不了指向 `app.asar` 内文件的 junction）；
  - `isForeignPlatform` 过滤、`readHealStamp` / `manifestsMatch` / `copyPackageDir` / `fillMissingFiles` 辅助函数。

缺少这套逻辑会导致**新电脑首次启动失败**（`ERR_MODULE_NOT_FOUND` / `runtime exited with code 1`）。

### 2. `desktop/lib/main.js` —— 目录选择器改用官方原生 + 防弹浏览器

- **目录选择器**：官方 rc.2 已修复目录选择器（自带 `worker.cjs` + koffi win32 原生 `IFileOpenDialog` 平台绑定）。因此**移除 v1037 的 `healProfileDirectoryPicker` 强制覆盖**（它塞的是 rc.5 的 PowerShell 兜底 worker，协议与 rc.2 原生 worker 不同，覆盖反而破坏），改用官方原生。保留 3082 loopback HTTP 服务作无害兜底。
- **`--no-open`**：rc.2 的 `dsh web` 默认 `openBrowser: true` 会自动打开系统浏览器；桌面 GUI 由 Electron 窗口承载，spawn 参数加 `--no-open` 禁用。

### 3. `@deepseek-ai/dsh-client-ui-settings-token-usage` —— Token 用量统计插件修复

官方 rc.2 移除了 `@deepseek-ai/dsh-client-web-react`，但 Token 用量统计插件（rc.5 遗留）仍引用它，导致客户端插件加载失败：

```
Failed to load plugins
failed to import loader entry (...@deepseek-ai/dsh-client-ui-settings-token-usage):
client-modules: require("@deepseek-ai/dsh-client-web-react") missed the module table
```

- 修复：把插件 `lib/client.js` 里的 `bindSnapshotSelector` **内联实现**（直接用 React 的 `useSyncExternalStore`），去掉对被删包的 require；同步更新 `src` 源码、`.d.ts` 类型、`package.json` peer/devDependencies。

### 验证结果

- `dsh web: http://127.0.0.1:3081` 就绪，HTTP 200，窗口标题 "DSH Local Build"；
- profile 依赖重建为指向 rc.2 seed 的 junction，多模态依赖（`dsh-attachment`、`dsh-client-ui-attachment`、`dsh-web-frontend` 等）全部就位；
- Token 用量统计页不再报 "Failed to load plugins"。

> 说明：上述修改直接落在已构建的 npm 包产物（`lib/`、`src/`、`package.json`）上，非标准源码 diff；差异见 `patches/0011-rc2-multimodal-upgrade.patch`。
