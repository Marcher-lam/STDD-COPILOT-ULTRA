# 快速开始

STDD Copilot Ultra v2.0.0 — 首次使用指南。

## 交互式启动向导

```bash
stdd start                    # 交互式引导，自动推荐工作流
```

`stdd start` 提供一站式交互向导，根据项目类型和需求自动推荐合适的工作流路径，是最推荐的入门方式。

## CLI 命令速查

```bash
# 初始化
stdd init                     # 初始化项目
stdd init /path/to/project    # 在指定目录初始化
stdd init --force             # 强制重新初始化

# 变更管理
stdd list                     # 列出所有变更
stdd list --specs             # 仅列出 Spec
stdd list --archived          # 列出已归档变更
stdd list --json              # JSON 输出
stdd status                   # 显示项目状态
stdd status add-dark-mode     # 显示特定变更状态
stdd new change add-dark-mode # 开始新变更

# 查看可用能力
stdd skills                   # 列出 57 个可用 Skill
stdd commands                 # 列出 88 个可用命令

# 修复与脚手架
stdd fix-packet add-dark-mode # 生成 Golden Packet 修复上下文
stdd outside-in init          # 初始化外向内 TDD
stdd outside-in scaffold add-dark-mode  # 生成分层测试骨架

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

# 诊断
stdd doctor                   # 健康检查
stdd doctor --deep            # 深度诊断

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

# 应用变更
stdd apply <name> --allow-no-tests   # 应用变更（允许无测试）
```

## TDD 增强命令

- `stdd fix-packet [change]` — Golden Packet 风格失败修复上下文
- `stdd outside-in init/scaffold/status` — 外向内 TDD 分层测试骨架

## Docker 快速启动

```bash
docker run --rm -v "$PWD:/workspace" marcher-lam/stdd-copilot:latest --help
```

## 文档导航
- [项目首页](../README.md) - 项目概览和顶层示例
- [使用手册](../USAGE.md) - 完整使用指南
- [CLI 使用指南](cli-guide.md) - CLI 完整文档
- [工作流程](workflows.md) - 常见模式和使用场景
- [命令参考](commands.md) - 统一会话入口参考
- [核心概念](concepts.md) - 深入理解 specs、changes 和 schemas
- [能力清单](capabilities.md) - 工具能力边界说明
- [英文文档入口](en/README.md) - English docs index
