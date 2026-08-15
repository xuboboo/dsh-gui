# DeepSeek Harness 桌面版客户端（GUI）

> 把 DeepSeek Harness 装进一个原生桌面窗口：品牌化启动动画、DeepSeek 设计语言界面、稳定启动。
> 第三方非官方项目（与 DeepSeek / DeepSeek AI 官方无关）。
>
> English: A desktop GUI client for DeepSeek Harness — native window, branded splash animation, DeepSeek design language UI, and a stable startup (includes the rc.5 startup crash fix). Third-party, unofficial.

## 下载与安装 / Download & Install

前往 [Releases](https://github.com/xuboboo/dsh-gui/releases) 下载最新版本：

- **`dsh-gui-v1.0.4-win-x64.zip`**（Windows 64 位，约 280 MB）— 最新版（自动更新 + 进度 + 关于）

### 安装步骤

1. 解压 zip 到任意目录（建议英文路径，如 `D:\Tools\dsh-gui`）
2. 双击 **`DeepSeek Harness.exe`**
3. 首次启动会显示品牌启动动画，几秒后进入主界面

**无需安装 Node.js 或其他任何运行时**——exe 已内置完整运行环境，解压即用。

### 卸载

删除解压目录即可。用户数据（会话、配置）保存在 `%USERPROFILE%\.dsh`，如需彻底清除可一并删除。

## 系统要求 / System requirements

- 操作系统：Windows 10 / 11（64 位）
- 内存：建议 4 GB 以上
- 磁盘：解压后约 900 MB
- **无需 Node.js / npm / pnpm / 任何开发环境**（内置运行时）

## 使用说明 / Usage

### 首次启动

1. 双击 `DeepSeek Harness.exe`
2. 等待品牌启动动画结束（首次启动需初始化，约 3–10 秒）
3. 在界面中配置模型服务（设置 → 模型，填入你的 DeepSeek API Key）即可开始对话

### 日常使用

- 本地服务默认运行在 `http://127.0.0.1:3081`（仅本机可访问）
- 界面语言：简体中文（默认），可在界面内切换
- 支持浅色 / 深色主题，跟随系统或手动切换

### 端口冲突

如果 3081 端口被占用，可设置环境变量后重启：

```
DSH_DESKTOP_PORT=3082
```

### 常见问题 / FAQ

**Q：需要先安装 Node.js 吗？**
A：不需要。本客户端完全自包含，运行时已内置在 exe 中，解压后双击即可使用。

**Q：杀毒软件提示风险？**
A：本客户端为第三方构建、未做商业签名，Windows SmartScreen / 杀毒软件可能提示。来源为本仓库 Releases 的安装包可放心使用；也可以选择自行构建（见下文源码构建）。

**Q：启动后白屏 / 无法打开？**
A：请确认已解压完整（不要直接运行压缩包内的 exe）；首次启动请耐心等待动画结束。仍失败可查看日志 `%APPDATA%\@deepseek-ai\dsh-root\logs\desktop.log`。

**Q：数据存放在哪里？**
A：用户数据（会话记录、配置、凭据）保存在 `%USERPROFILE%\.dsh`，与官方版本一致。

**Q：如何更新？**
A：关注本仓库 Releases，下载新版 zip 解压覆盖即可（保留 `%USERPROFILE%\.dsh` 即可保留数据）。

## 特性 / Features

- 🪟 **原生桌面窗口** — 独立窗口承载完整 Harness Web UI
- 🎬 **品牌启动动画** — logo 呼吸光晕 + 双环加载动画 + 深色渐变背景（纯 CSS，无外部依赖）
- 🎨 **DeepSeek 设计语言界面** — token 级主题覆盖：品牌蓝主按钮、浅蓝消息气泡、蓝调选中/悬停态、细圆角滚动条、品牌色选区与焦点环、柔和过渡与按压反馈
- 🔧 **rc.5 启动崩溃修复** — launcher 补传 --expose-internals、profile 依赖落盘、ensureSymlink 兼容真实目录
- 📋 **复制按钮修复（v1.0.1）** — 放行 `clipboard-sanitized-write` 权限，对话/代码块复制按钮恢复可用
- 📊 **Token 用量统计（v1.0.2）** — 设置页新增用量统计：总览卡片、每日柱状图（7/30 天）、会话排行；支持**清空统计**（非破坏性，不删会话）与一键**恢复完整统计**
- 🌗 **浅色 / 深色双主题** — 跟随系统或手动切换，两套配色均对齐品牌

## 更新日志 / Changelog

### v1.0.1（2026-08-15）

- 🐛 **修复复制按钮无反应**：官方 launcher 默认拒绝一切权限请求（`setPermissionRequestHandler` 一律 `callback(false)`），导致 `navigator.clipboard.writeText` 被拒、复制按钮静默失效。v1.0.1 放行 `clipboard-sanitized-write` 权限（见 `patches/0003-launcher-clipboard-permission.patch`）。

### v1.0.0（2026-08-14）

- 首个发行版：品牌启动动画、DeepSeek 设计语言主题、rc.5 启动崩溃修复

## 更新日志 / Changelog

### v1.0.4（2026-08-15）

- 📊 **下载进度窗口**：更新下载实时进度条；多通道下载快速失败切换
- ℹ️ **帮助菜单 → 关于 dsh-gui**：版本号与项目信息
- 🐛 下载失败必提示原因（不再无响应）

### v1.0.3（2026-08-15）

- 🔄 **新增自动更新**：帮助菜单 → 检查更新；启动后自动检查（每 6 小时）；发现新版本显示更新内容，一键下载（约 33 MB 增量包）安装，失败自动回滚（`patches/0006-auto-updater.patch`）
- 发布流程：每次发版需同时上传整包 + asar 更新包（见下方「发版清单」）

### v1.0.2（2026-08-15）

> 修复多个 Bug 并新增功能：复制按钮无反应、启动崩溃（v1.0.0 起）、帮助菜单项目主页指向、设置页布局问题等均已修复。

- 📊 **新增 Token 用量统计设置页**：总览卡片（输入/输出/缓存/会话数/LLM 耗时）、每日用量柱状图（近 7/30 天）、会话用量排行（Top 50）；**清空统计**仅重置统计起点（不删除任何会话记录，localStorage 持久），可随时**恢复完整统计**
- 实现：浏览器端插件 `client-plugins/ui-settings-token-usage`（聚合 `session.list` 投影列，零日志加载）
- 🏠 **项目主页**：设置页新增"项目主页"页（GitHub 仓库 + Releases 直达链接）；**帮助菜单 → 项目主页**改为指向本仓库（`patches/0005-menu-project-homepage.patch`）
- 🔄 **自动更新（v1.0.2）**：帮助菜单 → 检查更新；启动后自动检查（每 6 小时），发现新版本显示更新内容并一键下载安装（`patches/0006-auto-updater.patch`）

### v1.0.1（2026-08-15）

- 🐛 **修复复制按钮无反应**：官方 launcher 拒绝一切权限请求（`setPermissionRequestHandler` 一律 `callback(false)`），导致 `navigator.clipboard.writeText` 被拒、复制按钮静默失效。v1.0.1 放行 `clipboard-sanitized-write` 权限（见 `patches/0003-launcher-clipboard-permission.patch`）。

### v1.0.0（2026-08-14）

- 首个发行版：品牌启动动画、DeepSeek 设计语言主题、rc.5 启动崩溃修复

## 界面预览 / Preview

<!-- 在此放置截图：主界面、启动动画、深色模式 -->

## 发版清单 / Release checklist

> 自动更新依赖以下步骤，**每步都不能漏**，否则客户收不到更新：

1. **改版本号**：`desktop/lib/main.js` 的 `DSH_GUI_VERSION` 常量改为新版本（如 `1.0.3`）
2. **打整包**：`dsh-gui-vX.Y.Z-win-x64.zip`（解压即用完整包）
3. **打更新包**：`dsh-gui-vX.Y.Z-win-x64-asar.zip`（仅 `resources/app.asar`，zip 内路径 `resources/app.asar`）——客户端自动更新下载的就是它
4. **上传两个包**到 GitHub Release（整包 + asar 更新包，tag `vX.Y.Z`）
5. **验证**：帮助菜单 → 检查更新 应提示新版本；或等启动后 8 秒自动检查

> 说明：自动更新下载 asar 更新包（约 33 MB）并校验 GitHub sha256 后替换 `app.asar`，无需重新下载 280 MB 整包；更新失败会自动回滚并提示手动下载。

## 面向开发者 / For developers

本仓库包含客户端的三块核心资产：

```
├── theme/
│   └── dsw-override.css        # 界面主题覆盖层（DeepSeek 设计语言）
├── splash/
│   ├── splash-page.html        # 启动动画页模板（浏览器可直接预览）
│   └── launcher-patch.md       # 启动动画接入 launcher 的说明
├── patches/
│   ├── 0001-launcher-expose-internals.patch   # 启动修复 1
│   ├── 0002-app-boot-ensure-symlink.patch     # 启动修复 2
│   ├── 0003-launcher-clipboard-permission.patch # 复制按钮修复（剪贴板权限）
│   └── README.md               # rc.5 启动崩溃修复完整方案
└── SECURITY.md                 # 安全与敏感信息说明
```

### 应用主题（无需改动应用文件）

1. 复制 `theme/dsw-override.css` 到前端 dist：`<profile>/node_modules/@deepseek-ai/dsh-web-frontend/dist/assets/`
2. 在 `dist/index.html` 的 `<head>` 中、主 CSS（`index-*.css`）之后追加：

```html
<link rel="stylesheet" crossorigin href="/assets/dsw-override.css">
```

3. 刷新页面即生效。此后只需维护这一个文件即可持续调整界面细节。

### 启动动画与启动修复

详见 `splash/launcher-patch.md` 与 `patches/README.md`（涉及 `resources/app.asar` 解包/重打包，请保留原始备份）。

### 从官方源码构建

本客户端基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（官方，MIT）桌面版构建。从源码构建需要 Node.js 环境（仅构建时需要，运行无需）——此场景才需要 `Install Node.js, then run: pnpm install`。

## 技术实现 / How it works

| 模块 | 方案 |
| --- | --- |
| 桌面窗口 | Electron 原生窗口承载 Harness Web UI |
| 运行时 | Electron 内置 Node（ELECTRON_RUN_AS_NODE）运行 dsh 服务，完全自包含 |
| 启动动画 | 纯 CSS 动画的 data: URL 页面，图标运行时内嵌 base64，无外部资源依赖 |
| 界面主题 | CSS 变量（--dsw-* token）覆盖层，后加载覆盖原设计系统，不破坏组件 |
| 启动修复 | launcher 补传 --expose-internals；profile 依赖从 junction 改为真实文件；ensureSymlink 兼容真实目录 |

## 安全 / Security

本仓库经严格敏感信息扫描：不含任何 API key、密码、凭据、本地数据或本地路径（检查方法见 SECURITY.md）。

## 免责声明 / Disclaimer

独立的第三方项目，与 DeepSeek / DeepSeek AI 官方无关。DeepSeek Harness 是官方项目（MIT）。

## 许可证 / License

MIT License © dsh-gui contributors

