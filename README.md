# DeepSeek Harness 桌面版客户端（GUI）

> 把 DeepSeek Harness 装进一个原生桌面窗口：品牌化启动动画、DeepSeek 设计语言界面、稳定启动。
> 第三方非官方项目（与 DeepSeek / DeepSeek AI 官方无关）。
>
> English: A desktop GUI client for DeepSeek Harness — native window, branded splash animation, DeepSeek design language UI, and a stable startup (includes the rc.5 startup crash fix). Third-party, unofficial.

## 为什么需要它 / Why

官方 DeepSeek Harness 以 Web 界面 + 命令行方式运行。本客户端把它装进一个原生桌面窗口，提供完整的桌面应用体验：

- **双击即用**：原生窗口（Electron），打开即进入 Harness
- **启动即品牌感**：品牌化启动动画，替代默认的白底文字等待页
- **界面对齐 DeepSeek 设计语言**：品牌蓝 #4D6BFE、浅色/深色双主题、交互细节打磨
- **稳定启动**：修复 rc.5 桌面版启动崩溃（--expose-internals 缺失导致的 HMR 服务崩溃）

## 特性 / Features

- 🪟 **原生桌面窗口** — 独立窗口承载完整 Harness Web UI
- 🎬 **品牌启动动画** — logo 呼吸光晕 + 双环加载动画 + 深色渐变背景（纯 CSS，无外部依赖）
- 🎨 **DeepSeek 设计语言界面** — token 级主题覆盖：品牌蓝主按钮、浅蓝消息气泡、蓝调选中/悬停态、细圆角滚动条、品牌色选区与焦点环、柔和过渡与按压反馈
- 🔧 **rc.5 启动崩溃修复** — launcher 补传 --expose-internals、profile 依赖落盘、ensureSymlink 兼容真实目录
- 🌗 **浅色 / 深色双主题** — 跟随系统或手动切换，两套配色均对齐品牌

## 界面预览 / Preview

<!-- 在此放置截图：主界面、启动动画、深色模式 -->

## 快速开始 / Quick start

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
│   └── README.md               # rc.5 启动崩溃修复完整方案
└── SECURITY.md                 # 安全与敏感信息说明
```

### 应用主题

1. 复制 theme/dsw-override.css 到前端 dist：<profile>/node_modules/@deepseek-ai/dsh-web-frontend/dist/assets/
2. 在 dist/index.html 的 <head> 中、主 CSS（index-*.css）之后追加：

```html
<link rel="stylesheet" crossorigin href="/assets/dsw-override.css">
```

3. 刷新页面即生效。此后只需维护这一个文件即可持续调整界面细节。

### 启动动画与启动修复

详见 splash/launcher-patch.md 与 patches/README.md（涉及 resources/app.asar 解包/重打包，请保留原始备份）。

## 技术实现 / How it works

| 模块 | 方案 |
| --- | --- |
| 桌面窗口 | Electron 原生窗口承载 Harness Web UI |
| 启动动画 | 纯 CSS 动画的 data: URL 页面，图标运行时内嵌 base64，无外部资源依赖 |
| 界面主题 | CSS 变量（--dsw-* token）覆盖层，后加载覆盖原设计系统，不破坏组件 |
| 启动修复 | launcher 补传 --expose-internals；profile 依赖从 junction 改为真实文件；ensureSymlink 兼容真实目录 |

## 安全 / Security

本仓库经严格敏感信息扫描：不含任何 API key、密码、凭据、本地数据或本地路径（检查方法见 SECURITY.md）。

## 免责声明 / Disclaimer

独立的第三方项目，与 DeepSeek / DeepSeek AI 官方无关。DeepSeek Harness 是官方项目（MIT）。

## 许可证 / License

MIT License © dsh-gui contributors

