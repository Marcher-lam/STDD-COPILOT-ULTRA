# Getting Started with STDD Copilot

本指南介绍 STDD Copilot 的工作原理和使用方法。安装说明请参阅 [INSTALL.md](../INSTALL.md)。

## 核心概念

STDD Copilot 帮助你和 AI 编程助手就"要做什么"达成一致，然后再写代码。

## 安装 CLI 工具

### 全局安装 (推荐)

```bash
# 克隆仓库
git clone https://github.com/Marcher-lam/STDD-COPILOT.git ~/stdd-copilot
cd ~/stdd-copilot

# 安装依赖
npm install

# 全局链接 CLI
npm link
```

### 验证安装

```bash
stdd --help
# 输出:
# Usage: stdd [options] [command]
# STDD Copilot - Spec + Test Driven Development Framework
# ...
```

### 快速初始化

```bash
# 在你的项目中初始化 STDD
cd your-project
stdd init

# 输出:
# ✓ STDD Copilot initialized successfully!
#
# Next steps:
#   1. In Claude Code, run:
#      /stdd:new your-first-feature
#   2. Or start with exploration:
#      /stdd:explore
#   3. View all commands:
#      stdd commands
```

## CLI 命令参考

### 核心命令

| 命令 | 说明 |
|------|------|
| `stdd init [path]` | 初始化 STDD 工作区 |
| `stdd update [path]` | 更新 STDD 文件 |
| `stdd list` | 列出活跃变更 |
| `stdd list --specs` | 列出规格 |
| `stdd status` | 显示整体状态 |
| `stdd status <change>` | 显示特定变更状态 |

### 创建命令

| 命令 | 说明 |
|------|------|
| `stdd new change <name>` | 创建新变更 |
| `stdd new change <name> --title "Title"` | 带标题创建 |
| `stdd new spec <domain>` | 创建新规格 |

### 信息命令

| 命令 | 说明 |
|------|------|
| `stdd skills` | 列出所有技能 |
| `stdd skills --phase 4` | 按阶段筛选技能 |
| `stdd commands` | 列出 Claude Code 斜杠命令 |
| `stdd constitution` | 查看所有条例 |
| `stdd constitution check` | 触发 CLI 侧合规检查入口 |
| `stdd hooks install` | 安装 Hooks |
| `stdd hooks verify` | 验证 Hooks |
| `stdd hooks status` | 查看 Hooks 状态 |
| `stdd hooks disable` | 禁用 Hooks |
| `stdd hooks enable` | 恢复 Hooks |

### 命令选项

```bash
stdd init                    # 初始化项目
stdd init /path/to/project   # 指定目录
stdd init --force            # 强制覆盖

stdd list                    # 列出活跃变更
stdd list --specs            # 列出规格
stdd list --archived         # 包含已归档
stdd list --json             # JSON 输出

stdd status                  # 整体状态
stdd status add-dark-mode    # 特定变更状态
stdd status --json           # JSON 输出

stdd new change add-dark-mode      # 创建新变更
stdd new spec auth                 # 创建新规格

stdd skills                  # 列出所有技能
stdd skills --phase 4        # 按阶段筛选技能

stdd commands                # 列出 Claude Code 斜杠命令
stdd constitution            # 查看所有条例
stdd constitution show 2     # 查看 Article 2 详情
stdd constitution check      # CLI 侧合规检查入口

stdd hooks install           # 安装 Hooks
stdd hooks verify            # 验证 Hooks
stdd hooks status            # 查看 Hooks 状态
stdd hooks disable           # 禁用 Hooks
stdd hooks enable            # 恢复 Hooks
```

## 快速路径

### 默认快速路径 (core profile)

```text
/stdd:new ──► /stdd:apply ──► /stdd:archive
```

### 扩展路径 (expanded workflow)

```text
/stdd:new ──► /stdd:ff 或 /stdd:continue ──► /stdd:apply ──► /stdd:verify ──► /stdd:archive
```

## 目录结构

运行 `/stdd:init` 后，项目将具有以下结构:

```
stdd/
├── specs/              # Source of Truth (系统当前行为)
│   └── {domain}/
│       └── spec.md
├── changes/            # 提议的修改 (每个变更一个文件夹)
│   └── {change-id}/
│       ├── proposal.md
│       ├── design.md
│       ├── tasks.md
│       └── specs/      # Delta specs (变更内容)
│           └── {domain}/
│               └── spec.md
└── config.yaml         # 项目配置 (可选)
```

**两个关键目录:**

- **`specs/`** - Source of Truth。描述系统当前行为。按领域组织 (如 `specs/auth/`, `specs/payments/`)。
- **`changes/`** - 提议的修改。每个变更有自己的文件夹，包含所有相关产物。变更完成后，其 specs 合并到主 `specs/` 目录。

## 理解产物

每个变更文件夹包含指导工作的产物:

| 产物 | 用途 |
|------|------|
| `proposal.md` | "为什么"和"做什么" - 捕捉意图、范围和方法 |
| `specs/` | Delta specs 显示 ADDED/MODIFIED/REMOVED 需求 |
| `design.md` | "怎么做" - 技术方案和架构决策 |
| `tasks.md` | 实现清单，带复选框 |

**产物相互依赖:**

```
proposal ──► specs ──► design ──► tasks ──► implement
    ▲           ▲           ▲            │
    └───────────┴───────────┴────────────┘
              随着学习更新
```

你随时可以返回并优化早期产物。

## Delta Specs 工作原理

Delta specs 是 STDD Copilot 的核心概念。它们描述相对于当前 specs 的变更。

### 格式

Delta specs 使用章节指示变更类型:

```markdown
# Delta for Auth

## ADDED Requirements

### Requirement: Two-Factor Authentication
The system MUST require a second factor during login.

#### Scenario: OTP required
- GIVEN a user with 2FA enabled
- WHEN the user submits valid credentials
- THEN an OTP challenge is presented

## MODIFIED Requirements

### Requirement: Session Timeout
The system SHALL expire sessions after 30 minutes of inactivity.
(Previously: 60 minutes)

## REMOVED Requirements

### Requirement: Remember Me
(Deprecated in favor of 2FA)
```

### 归档时发生什么

归档变更时:

1. **ADDED** 需求追加到主 spec
2. **MODIFIED** 需求替换现有版本
3. **REMOVED** 需求从主 spec 删除

变更文件夹移动到 `stdd/changes/archive/` 作为审计历史。

## 示例: 第一个变更

让我们为应用添加暗色模式。

### 1. 开始变更

```text
You: /stdd:new add-dark-mode
AI: Created stdd/changes/add-dark-mode/
   ✓ proposal.md — why we're doing this, what's changing
   ✓ specs/ — requirements and scenarios
   ✓ design.md — technical approach
   ✓ tasks.md — implementation checklist
   Ready for implementation!
```

或使用扩展工作流: `/stdd:new` 然后 `/stdd:ff` (或逐步 `/stdd:continue`)。

### 2. 生成的产物

**proposal.md** - 捕捉意图:

```markdown
# Proposal: Add Dark Mode

## Intent
Users have requested a dark mode option to reduce eye strain
during nighttime usage.

## Scope
- Add theme toggle in settings
- Support system preference detection
- Persist preference in localStorage

## Approach
Use CSS custom properties for theming with a React context
for state management.
```

**specs/ui/spec.md** - 显示新需求的 Delta:

```markdown
# Delta for UI

## ADDED Requirements

### Requirement: Theme Selection
The system SHALL allow users to choose between light and dark themes.

#### Scenario: Manual toggle
- GIVEN a user on any page
- WHEN the user clicks the theme toggle
- THEN the theme switches immediately
- AND the preference persists across sessions

#### Scenario: System preference
- GIVEN a user with no saved preference
- WHEN the application loads
- THEN the system's preferred color scheme is used
```

**tasks.md** - 实现清单:

```markdown
# Tasks

## 1. Theme Infrastructure
- [ ] 1.1 Create ThemeContext with light/dark state
- [ ] 1.2 Add CSS custom properties for colors
- [ ] 1.3 Implement localStorage persistence

## 2. UI Components
- [ ] 2.1 Create ThemeToggle component
- [ ] 2.2 Add toggle to settings page

## 3. Styling
- [ ] 3.1 Define dark theme color palette
- [ ] 3.2 Update components to use CSS variables
```

### 3. 实现

```text
You: /stdd:apply
AI: Working through tasks...
   ✓ 1.1 Created ThemeContext with light/dark state
   ✓ 1.2 Added CSS custom properties to globals.css
   ✓ 1.3 Implemented localStorage persistence
   ✓ 2.1 Created ThemeToggle component
   ...
   All tasks complete!
```

实现过程中，如果发现设计需要调整，只需更新产物并继续。

### 4. 归档

```text
You: /stdd:archive
AI: Archiving add-dark-mode...
   ✓ Merged specs into stdd/specs/ui/spec.md
   ✓ Moved to stdd/changes/archive/2026-03-27-add-dark-mode/
   Done! Ready for the next feature.
```

你的 delta specs 现在成为主 specs 的一部分，记录系统如何工作。

## 验证和审查

使用 CLI 检查变更状态:

```bash
# 列出活跃变更
stdd list

# 查看变更详情
stdd status add-dark-mode
```

## 下一步

- [项目首页](../README.md) - 项目概览和顶层示例
- [使用手册](../USAGE.md) - 完整使用指南
- [CLI 使用指南](cli-guide.md) - CLI 完整文档
- [工作流程](workflows.md) - 常见模式和使用场景
- [命令参考](commands.md) - 统一会话入口参考
- [核心概念](concepts.md) - 深入理解 specs、changes 和 schemas
- [英文文档入口](en/README.md) - English docs index
