# 把启动动画接入 launcher

`desktop/lib/main.js`（打包在 `resources/app.asar` 内）在等待运行时就绪时渲染一个自包含状态页。以下改动将其替换为品牌化启动动画页。

## 改动点

1. **新增 `splashPage()` 生成器**（返回 data URL 页面，动画见 `splash-page.html` 模板；应用图标运行时从 `desktop/assets/icon.png` 读取并以 base64 内嵌，读取失败时优雅降级为无图标）。
2. **`createWindow()` 初始页**：`statusPage("DeepSeek Harness 正在启动", …)` → `splashPage()`。
3. **`restartHarness()`**：`statusPage("DeepSeek Harness 正在重新启动", …)` → `splashPage("正在重新创建本地运行时", "服务重启中，请稍候")`。
4. **窗口背景色**改为深色（`#0b1020`），避免启动白闪。
5. 错误/停止页（`statusPage`）同步升级为深色玻璃拟态卡片样式。

## 关键实现要点

- 页面通过 `data:text/html;charset=utf-8,${encodeURIComponent(html)}` 加载，无外部资源依赖（图标以 data URL 内嵌），不受 CSP 影响。
- 图标读取使用 `readFileSync`（Electron 的 fs 支持 asar 内路径）。
- 动画全部为纯 CSS（`@keyframes`）。

## 如何应用

由于 launcher 打包在 asar 内，需要：

1. 备份 `resources/app.asar`
2. 解包 asar（例如 `@electron/asar`：`npx asar extract app.asar out`）
3. 按上文修改 `out/desktop/lib/main.js`
4. 重新打包（保留 unpack 规则与 integrity）并替换
5. 重启应用验证

