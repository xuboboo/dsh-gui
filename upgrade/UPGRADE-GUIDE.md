# dsh-gui 升级手册（官方新版适配 SOP）

> 目标：官方每次发版后，**跑一条命令 + 处理少量 git 冲突**即可完成升级适配，
> 不再需要大版本手工重构。

## 一、体系总览

```
官方 GitHub (deepseek-ai/deepseek-harness)
        │ tag: dsh-vX.Y.Z
        ▼
D:\dsh-official-015rc2（本地官方仓库，持久工作目录）
        │ 分支 gui/<tag> = 官方 tag + GUI 补丁提交序列（6 个提交）
        │ 补丁序列同时导出在 dev/enhance/patches-series/*.patch（防灾备份）
        ▼
流水线 node dev/tools/upgrade/upgrade.mjs --tag <官方tag> --gui-version <GUI版本>
   sync → patches(git am 重放) → env → install → build
        → flatten(闭包感知拍平+冲突自动嵌套) → assemble(GUI包回填+主题) → pack → verify
        ▼
dev/builds/app.asar.vXXX + profile-seed  → 部署 → 实测 → 打 zip → GitHub Release
```

## 二、日常：检测官方新版

```
node dev/tools/upgrade/detect.mjs
```

列出比当前底座新的全部官方版本。建议**小步快跑**：每个 rc/alpha 都升，
补丁冲突最小；拖成大版本跨越 = 冲突爆炸。

## 三、执行升级

```
node dev/tools/upgrade/upgrade.mjs --tag dsh-vX.Y.Z --gui-version 1.2.0
```

- 任一步失败即停；修复后 `--from <步骤名>` 断点续跑。
- `--skip-install` / `--skip-build` 可跳过慢步骤。
- **patches 步冲突处理**（唯一需要人脑的环节）：
  1. 按提示在官方仓库手工 `git am --3way <补丁>`
  2. 解决冲突（每个补丁的意图写在提交信息里）
  3. `git am --continue`
  4. 重跑流水线 `--from env`

## 四、当前补丁序列（6 个，按序）

| # | 补丁 | 内容 |
|---|---|---|
| 0001 | gui(app-boot) | heal 自愈（seed junction+字节新鲜度+物化兜底）、@dsh-gui 浏览器插件 profile 层泛化部署 |
| 0002 | gui(loader) | 绝对路径 file:// 化（纯 JS，禁 node: 顶层 import）+ importInternal 双锚点 |
| 0003 | gui(web-app) | 注册 token-usage 插件行/依赖/client solution |
| 0004 | gui(token-usage) | Token 用量统计插件本体（0.1.5 API） |
| 0005 | gui(lock) | lockfile（升级时可跳过，pnpm 重算） |
| 0006 | gui(assets) | @dsh-gui 三包（mcp-catalog/reasoning-autopilot/plugin-market） |

调停原则：**补丁表达的是"意图"**。若官方已用别的方式实现了同一意图 → 删补丁；
若 API 变了 → 改补丁代码适配新 API（如本次 client-runtime 并入 cordis）。

## 五、上架新插件到市场

1. 宿主+客户端两份 CATALOG 各加一条（`@dsh-gui/plugin-market/lib/{index,client}.js`）
2. 前提核验：包在随包树内、零配置可挂载（或市场代填 config）、不与标准 Agent 预设重复
3. `pack.mjs` 重打包；profile 实体副本（profiles/web/plugin-market/lib/client.js）
   会被 app-boot 的字节漂移检测自动刷新

## 六、发版清单

1. `node dev/tools/upgrade/upgrade.mjs …`（含 verify 门禁）
2. 部署本机：swap seed/asar（.old 轮换）→ `_fill_natives.cjs` → 重启
3. 浏览器实测：新建会话 / 市场 / MCP / 用量 / 旧会话模型重选 / 零控制台错误
4. `python dev/tools/zip-full.py X.Y.Z` + `python dev/tools/zip-asar.py X.Y.Z`
5. README changelog + release-notes → enhance 提交推送
6. `gh release create vX.Y.Z --notes-file …` + 上传两个 zip
7. 更新 `dev/tools/upgrade/config.json`（officialTag/guiVersion）

## 七、历史坑速查（踩过的都在这）

- **fs.cpSync 原生快路径会静默硬崩**（本机）：深拷贝用纯 JS 递归；目录删除须验证+重试（rmSync 静默失败）
- **拍平不能"先到先得"**：必须闭包感知 BFS（最近优先），版本分叉自动嵌套
- **loader 补丁禁用 node: 顶层 import**：前端浏览器构建会因 vite externalize 报未命名导出
- **浏览器半侧必须进 profile 层**才会被扫描器发现（app-boot 泛化部署已自动处理）
- **robocopy 退出码 0-7 都是成功**；cpSync 会抛 errno=0 幻影错误——文件操作用 robocopy
- **0.1.5 起浏览器认证**：就绪 URL 带 `?token=`，launcher 已适配
- **`@deepseek-ai/dsh-tool-session-query` 不在闭包内**：assemble 从官方 store 拷入树（市场旗舰条目）
