# ui-settings-token-usage（Token 用量统计设置页）

为 DeepSeek Harness 桌面客户端新增的浏览器端设置插件：

- **设置 → 用量统计**：总 Token（输入/输出/缓存）、会话数、LLM 耗时等总览卡片
- **每日用量柱状图**（近 7 / 30 天切换，纯 CSS 实现）
- **会话用量排行表**（Top 50，按合计 Token 排序）
- **清空统计 / 恢复完整统计**：非破坏性重置统计起点（localStorage 持久，不删除任何会话记录）

## 数据来源

聚合自 `session.list` 的投影列（`tokenUsage` / `sessionStats` / `title`），与侧边栏会话列表同一零日志加载通道，不需要读取会话文件。

## 构建

```
cd <deepseek-harness 源码仓库>
node node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/bin/tsc -b packages/client/ui-settings-token-usage
node node_modules/.pnpm/tsdown@0.22.2_*/node_modules/tsdown/dist/run.mjs  # 在包目录内执行
```

产物：`lib/client.js`（浏览器插件 bundle）+ `lib/types/**`（类型）。

## 安装到 asar

1. 解包 `resources/app.asar`
2. 将本目录（package.json + lib/）复制到 `node_modules/@deepseek-ai/dsh-client-ui-settings-token-usage`
3. 在 `node_modules/@deepseek-ai/dsh-web-app/cordis.patch.yml` 的 `ui-settings-models` 条目后追加：

```yaml
    - id: ui-settings-token-usage
      name: '@deepseek-ai/dsh-client-ui-settings-token-usage'
```

4. 在 `node_modules/@deepseek-ai/dsh-web-app/package.json` 的 dependencies 追加
   `"@deepseek-ai/dsh-client-ui-settings-token-usage": "workspace:^"`
5. 重新打包 asar（保持 unpack 规则与 integrity）

## 运行环境

- 除 asar 外，运行中的实例还需要同步更新 `<DSH_HOME>/profiles/node_modules/@deepseek-ai/dsh-client-ui-settings-token-usage`（bundle 由运行时从该路径服务）。
