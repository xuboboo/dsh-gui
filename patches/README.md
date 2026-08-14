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

另外还需（脚本化或手动）：

- **恢复 `resources/app.asar.unpacked`**：重打包时按原 unpack 规则恢复 200 个原生依赖文件（`.node`/`.dll` 等必须位于真实文件系统）。
- **profile 依赖落盘**：把 `<DSH_HOME>/profiles/node_modules` 下的 junction 替换为真实依赖文件（从 asar 完整提取；或安装对应版本），保证两种解析路径都可用。

## 验证 / Verification

- 模拟 launcher 启动：`electron.exe --expose-internals <asar>/node_modules/@deepseek-ai/dsh/lib/bin.js web --host 127.0.0.1 --port <port>`，等待 `dsh web: http://…` 就绪行并确认 HTTP 200。
- 直接启动桌面应用，确认窗口正常、日志无 `runtime exited`。

> 提示：本修复针对 rc.5；建议同时关注官方新版是否已修复 launcher。

