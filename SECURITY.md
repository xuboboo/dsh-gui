# 安全声明 / Security

本项目（及发布流程）执行以下敏感信息检查，保证仓库中**不包含**：

- 🔑 API key（`DEEPSEEK_API_KEY`、`sk-*`、`ghp_*` 等任何 token/密钥）
- 🔒 密码与凭据（`.credentials.yaml`、`settings.yaml` 等配置文件）
- 💾 本地数据（会话记录、存储、profile 配置、日志、附件）
- 📍 本地路径与个人信息（用户目录、主机名、邮箱、用户名）

## 发布前检查清单 / Pre-publish checklist

```bash
# 1. 扫描常见密钥格式
grep -rniE "(api[_-]?key|secret|password|token|sk-[a-z0-9]{20,}|ghp_[a-z0-9]{20,})" --include="*" .
# 2. 扫描本地数据引用
grep -rniE "(settings\.yaml|credentials|sessions|storages|profiles|/Users/|C:\\Users\\)" .
# 3. 确认无二进制/数据文件混入
find . -type f | grep -vE "\.(md|css|html|patch|txt)$"
# 4. 检查 git 历史
git log --all --oneline && git grep -niE "(api[_-]?key|password|token)" $(git rev-list --all)
```

## 上报 / Reporting

发现本仓库存在敏感信息泄露，请直接开 issue 或 PR 移除。
