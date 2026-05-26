# STDD Copilot CLI 使用指南

v2.0.0 — 88 个命令模板 + 57 个 Skill 模板

## CLI 命令速查

```bash
# 初始化
stdd init                     # 初始化项目
stdd init /path/to/project    # 在指定目录初始化
stdd init --force             # 强制重新初始化

# 交互式启动
stdd start                    # 交互式引导，自动推荐工作流

# 变更管理
stdd list                     # 列出所有变更
stdd list --specs             # 仅列出 Spec
stdd list --archived          # 列出已归档变更
stdd list --json              # JSON 输出
stdd status                   # 显示项目状态
stdd status add-dark-mode     # 显示特定变更状态
stdd new change add-dark-mode # 开始新变更

# 能力查看
stdd skills                   # 列出 57 个可用 Skill
stdd commands                 # 列出 88 个可用命令

# 修复与脚手架
stdd fix-packet add-dark-mode # Golden Packet 修复上下文
stdd outside-in init          # 初始化外向内 TDD
stdd outside-in scaffold add-dark-mode  # 分层测试骨架

# 质量治理
stdd constitution             # 查看 9 篇条例
stdd constitution show 2      # 查看特定条例
stdd constitution check       # 运行合规检查

# Git Hooks
stdd hooks install            # 安装 Git Hooks
stdd hooks verify             # 验证 Hooks 状态
stdd hooks status             # 显示 Hooks 状态
stdd hooks disable            # 禁用 Hooks
stdd hooks enable             # 启用 Hooks

# 进度追踪
stdd progress                 # 查看进度时间线
stdd progress --summary       # 摘要视图
stdd progress --resume        # 恢复进度
stdd progress --json          # JSON 输出
stdd progress --clear         # 清除进度

# 产品提案
stdd product-proposal         # 生成产品提案
stdd product-proposal --json  # JSON 输出
stdd product-proposal --output my-report.md  # 指定输出文件

# Dashboard
stdd dashboard open           # 打开 HTML 项目健康仪表板

# 诊断
stdd doctor                   # 健康检查
stdd doctor --deep            # 深度诊断

# 应用变更
stdd apply <name> --allow-no-tests   # 应用变更
```

## TDD 增强命令

- `stdd fix-packet [change]` — Golden Packet 风格失败修复上下文
- `stdd outside-in init/scaffold/status` — 外向内 TDD 分层测试骨架

## 文档导航
- [项目首页](../README.md) - 项目概览和顶层示例
- [使用手册](../USAGE.md) - 完整使用指南
- [快速开始](getting-started.md) - 首次使用流程和 CLI 速查
- [工作流程](workflows.md) - 常见模式和使用场景
- [命令参考](commands.md) - 完整命令参考
- [核心概念](concepts.md) - 深入理解 specs、changes 和 schemas
- [能力清单](capabilities.md) - 工具能力边界说明
- [英文文档入口](en/README.md) - English docs index
