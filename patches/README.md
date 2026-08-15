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
