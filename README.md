# dsh-desktop-enhance

> DeepSeek Harness 桌面增强包（第三方，非官方）：DeepSeek 品牌主题 + 启动动画 + rc.5 启动崩溃修复。
> A third-party enhancement pack for the DeepSeek Harness desktop app: DeepSeek-brand theme, splash animation, and the rc.5 startup crash fix.

## 特性 / Features

- 🎨 **DeepSeek 品牌主题** — token 级覆盖层，把 Harness Web UI 对齐 DeepSeek 设计语言（品牌蓝 `#4D6BFE`，浅色/深色双主题），含滚动条、选区、焦点环、过渡动画等交互打磨
- 🎬 **启动动画** — 品牌化 splash 页（logo 呼吸光晕 + 双环加载动画 + 渐变背景），替代默认的白底文字页
- 🔧 **rc.5 启动崩溃修复** — 修复桌面 launcher 未传 `--expose-internals` 导致的 `HMR service` 崩溃，及 profile 依赖 junction 解析失败问题

## 目录结构 / Layout

```
├── theme/
│   └── dsw-override.css        # DeepSeek 品牌主题覆盖层（挂到 dist 主 CSS 之后）
├── splash/
│   ├── splash-page.html        # 启动动画页独立模板（可直接用浏览器预览）
│   └── launcher-patch.md       # 把 splash 页接入 launcher 的说明
├── patches/
│   ├── 0001-launcher-expose-internals.patch
│   ├── 0002-app-boot-ensure-symlink.patch
│   └── README.md               # rc.5 启动修复完整方案（根因/步骤/验证）
├── SECURITY.md                 # 敏感信息检查清单
└── LICENSE                     # MIT
```

## 使用 / Usage

### 主题（推荐，无需改动应用文件）

1. 复制 `theme/dsw-override.css` 到前端 dist：`<profile>/node_modules/@deepseek-ai/dsh-web-frontend/dist/assets/`
2. 在 `dist/index.html` 的 `<head>` 中、主 CSS（`index-*.css`）之后追加：
   ```html
   <link rel="stylesheet" crossorigin href="/assets/dsw-override.css">
   ```
3. 刷新页面即生效。改这一个文件即可持续调整主题。

### 启动动画 / rc.5 修复

见 `splash/launcher-patch.md` 与 `patches/README.md`（需要解包/重打包 `resources/app.asar`，建议保留原始备份）。

## 安全 / Security

本仓库经过严格敏感信息扫描：不含任何 API key、密码、凭据或本地数据（见 `SECURITY.md`）。

## 免责声明 / Disclaimer

本仓库是**独立的第三方增强**，与 DeepSeek / DeepSeek AI 官方无关。[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 是官方项目（MIT）。

## 许可证 / License

[MIT](LICENSE) © dsh-desktop-enhance contributors
