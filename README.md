<div align="center">

# STDD Copilot

**Specification & Test-Driven Development Copilot**

基于 Skill Graph 的全链路自动化开发框架

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[**简体中文**](./README.md) · [**English**](./README_EN.md)

</div>

---

### 简介

STDD Copilot 是一套基于 **Skill Graph（技能图谱）** 的全链路自动化开发框架。它将 **Spec-First (需求规范优先)** 与 **TDD (测试驱动开发)** 深度融合，通过动态编排外部 AI 代码助手（如 Claude Code, Cursor, Windsurf 等 22 个引擎），实现从"需求捕获"到"原子化提交"的全自动闭环。

### 核心特性

| 特性 | 描述 |
|------|------|
| **规范先行、提案驱动** | 用文件化管理，让 AI 编程从 "模糊对话" 走向 "可控工程" |
| **Spec-First 需求驱动** | 通过多轮智能澄清 (78 种结构化推理方法) 与确认门 (Confirm Gate)，将模糊语言转化为严谨的 BDD 规范 |
| **Ralph Loop 自动化 TDD** | 红灯 (生成测试) → 静态检查 → 绿灯 (实现代码) → 变异审查 → 重构 |
| **5 级防跑偏防御体系** | 人机确认门 · 微任务隔离 · 连续失败回滚 · 静态质检门 · 伪变异审查 |
| **Constitution + Hook 一体化** | 9 篇开发条例 + Pre/Post Hook 自动执行 + 豁免审计追踪 |
| **38 个 Skills + 12 Agent 角色** | 完整的工作流覆盖，从需求到提交 |
| **Graph Engine** | DAG 可视化、编排、调度和追踪系统 |
| **4-Tier AI 引擎适配** | 兼容 22 个 AI 引擎 (Claude Code / Cursor / Copilot 等) |
| **双入口设计** | CLI (Commander.js) + Claude Code Skills 斜杠命令 |

### 目录

- [安装](#安装)
- [快速开始](#快速开始)
- [核心工作流](#核心工作流)
- [全部命令](#全部命令)
- [项目结构](#项目结构)
- [Constitution + Hook](#constitution--hook-enforcement)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

### 安装

```bash
# 克隆仓库
git clone https://github.com/Marcher-lam/STDD-COPILOT.git ~/stdd-copilot
cd ~/stdd-copilot

# 安装依赖
npm install

# 配置全局 CLI (可选)
npm link
```

详细安装说明请参阅 **[INSTALL.md](./INSTALL.md)**

### 快速开始

#### CLI 工具 (推荐)

```bash
# 1. 在项目中初始化 STDD
cd your-project
stdd init

# 2. 创建新变更
stdd new change add-dark-mode

# 3. 在 Claude Code 中使用斜杠命令
# /stdd:new add-dark-mode
# /stdd:apply
# /stdd:archive

# 4. 使用 CLI 查看状态
stdd status
stdd list
```

#### Claude Code 斜杠命令

```bash
# 1. 初始化项目 (首次使用)
/stdd:init

# 2. 创建新变更 (两种方式)

# 方式 A: 需求明确 → Fast-Forward 一键生成
/stdd:ff 实现一个支持 Markdown 导出的 todo-list

# 方式 B: 需求模糊 → 逐步澄清
/stdd:new 实现用户认证功能
/stdd:continue  # 逐步生成 proposal → specs → design → tasks

# 3. 实现任务 (TDD 循环)
/stdd:apply

# 4. 验证并归档
/stdd:verify
/stdd:archive
```

### 核心工作流

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  /stdd:init │───▶│/stdd:propose│───▶│/stdd:clarify│───▶│/stdd:confirm│
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                │
                                                                ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│/stdd:commit │◀───│/stdd:final- │◀───│/stdd:execute│◀───│  /stdd:spec │
│             │    │    doc      │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                            │              │
                                            ▼              ▼
                                     ┌─────────────┐ ┌─────────────┐
                                     │ Ralph Loop  │ │ /stdd:plan  │
                                     │  🔴 → 🟢 → 🔵 │ └─────────────┘
                                     └─────────────┘
```

### 典型执行路径

```
# 场景1：简单明确需求
/stdd:new --> /stdd:ff --> /stdd:apply --> /stdd:verify --> /stdd:archive

# 场景2：需求表达不出来
/stdd:explore --> /stdd:new --> /stdd:continue --> ... --> /stdd:apply --> /stdd:archive

# 场景3：一键 Turbo
/stdd:turbo "实现用户登录" --> 自动完成所有阶段 --> /stdd:commit

# 场景4：Bug 修复
/stdd:issue --> Bug 分类 → 失败测试 → 最小修复 → 回归验证 --> /stdd:archive
```

### 全部命令

#### 核心流程

| 命令 | 说明 |
|------|------|
| `/stdd:init` | 初始化项目，创建目录结构和配置 |
| `/stdd:new` | 创建新变更提案 |
| `/stdd:propose` | 提出需求草案 |
| `/stdd:clarify` | 需求澄清 (78 种结构化推理方法) |
| `/stdd:confirm` | 需求确认门 |
| `/stdd:spec` | 生成 BDD 规格 + Test Pipeline |
| `/stdd:plan` | 任务拆解 + ADR 记录 |
| `/stdd:apply` | 实现任务 (Ralph Loop TDD) |
| `/stdd:execute` | Ralph Loop 执行循环 |
| `/stdd:verify` | 验证规范一致性 (含 3D 验证) |
| `/stdd:archive` | 归档变更 |
| `/stdd:ff` | Fast-Forward 快速生成所有产物 |
| `/stdd:continue` | 继续生成下一个产物 |
| `/stdd:explore` | 自由探索模式 (只读) |
| `/stdd:turbo` | One-Shot 一键全流程 |
| `/stdd:brainstorm` | 纯分析建议模式 (多角度) |
| `/stdd:issue` | Bug/Issue TDD 修复流程 |

#### Graph 引擎

| 命令 | 说明 |
|------|------|
| `/stdd:graph visualize` | 可视化 Skill 依赖图 |
| `/stdd:graph analyze` | 分析当前状态和可执行路径 |
| `/stdd:graph run` | 从指定 Skill 开始执行 |
| `/stdd:graph parallel` | 识别并执行可并行的 Skill |
| `/stdd:graph history` | 查看执行历史 |
| `/stdd:graph replay` | 回放历史执行 |
| `/stdd:graph recommend` | 智能推荐下一步 |

#### SDD 增强

| 命令 | 说明 |
|------|------|
| `/stdd:api-spec` | API 规范先行 (OpenAPI/TypeScript) |
| `/stdd:schema` | 类型规范先行 (JSON Schema/Zod) |
| `/stdd:contract` | 契约测试 (5 种消息模式) |
| `/stdd:validate` | 规范验证 + Spec Guardian |

#### TDD 增强

| 命令 | 说明 |
|------|------|
| `/stdd:outside-in` | 外向内 TDD (E2E → 集成 → 单元) |
| `/stdd:mock` | 自动 Mock 生成 |
| `/stdd:factory` | 测试数据工厂 (Builder/Faker/Nested Fixture) |
| `/stdd:mutation` | 变异测试 (Quick AI + Deep Stryker) |

#### 辅助功能

| 命令 | 说明 |
|------|------|
| `/stdd:guard` | TDD 守护钩子 + Anti-Bypass 防绕过 |
| `/stdd:constitution` | Constitution 管理 (9 篇条例 + 豁免) |
| `/stdd:prp` | PRP 结构化规划 (What/Why/How/Success) |
| `/stdd:supervisor` | 多 Agent 协调器 (Supervisor 模式) |
| `/stdd:context` | 三层文档架构 (渐进式加载) |
| `/stdd:iterate` | 自主迭代循环 (Plan-Execute-Reflect) |
| `/stdd:memory` | 向量数据库记忆 (语义搜索) |
| `/stdd:parallel` | 并行执行模式 (DAG 调度) |
| `/stdd:roles` | 12 Agent 角色协作 (含对抗式审查) |
| `/stdd:metrics` | 质量指标仪表板 |
| `/stdd:learn` | 自适应学习 + Pattern Teaching |
| `/stdd:certainty` | 5 维度置信度评分 |
| `/stdd:complexity` | APP Mass 代码质量计算 |
| `/stdd:vision` | 项目愿景文档管理 |
| `/stdd:user-test` | 用户测试脚本生成 |
| `/stdd:help` | 上下文感知帮助系统 |
| `/stdd:final-doc` | 生成最终文档 |
| `/stdd:commit` | 原子化提交 (red:/green:/refactor: 前缀) |

### CLI 命令

```bash
stdd init                    # 初始化项目
stdd init /path/to/project   # 指定目录
stdd init --force            # 强制覆盖

stdd list                    # 列出活跃变更
stdd list --specs            # 列出规格
stdd list --archived         # 包含已归档
stdd list --json             # JSON 格式

stdd status                  # 整体状态
stdd status add-dark-mode    # 特定变更状态

stdd new change add-dark-mode      # 创建新变更
stdd new spec auth                 # 创建新规格

stdd skills                  # 列出所有技能
stdd skills --phase 4        # 按阶段筛选

stdd commands                # 列出 Claude Code 斜杠命令
stdd constitution            # 查看所有条例
stdd constitution show 2     # 查看 Article 2 详情
stdd constitution check      # 触发 CLI 侧合规检查入口
stdd hooks install           # 安装 Hooks
stdd hooks verify            # 验证 Hooks
stdd hooks status            # 查看 Hooks 状态
stdd hooks disable           # 禁用 Hooks
stdd hooks enable            # 恢复 Hooks
```

### 项目结构

```
stdd-copilot/
├── .claude/
│   ├── commands/stdd/           # 19 个斜杠命令
│   │   ├── init.md
│   │   ├── new.md
│   │   ├── apply.md
│   │   ├── brainstorm.md
│   │   ├── clarify.md
│   │   ├── confirm.md
│   │   ├── constitution.md
│   │   ├── continue.md
│   │   ├── execute.md
│   │   ├── explore.md
│   │   ├── ff.md
│   │   ├── final-doc.md
│   │   ├── graph.md
│   │   ├── issue.md
│   │   ├── plan.md
│   │   ├── propose.md
│   │   ├── spec.md
│   │   ├── verify.md
│   │   └── archive.md
│   ├── hooks/                  # Hook 脚本
│   │   └── pre-file-write.js
│   └── skills/                 # 38 个技能定义
│       ├── stdd-init/
│       ├── stdd-spec/
│       ├── stdd-execute/
│       ├── stdd-guard/
│       ├── stdd-turbo/
│       ├── stdd-brainstorm/
│       ├── stdd-issue/
│       └── ... (共 38 个)
├── stdd/                       # 工作目录
│   ├── changes/                # 变更管理
│   │   └── archive/            # 归档变更
│   ├── specs/                  # BDD 规格文件
│   ├── memory/                 # 持久化记忆
│   ├── graph/                  # Graph 配置
│   ├── config/                 # 引擎配置
│   │   └── engines.yaml        # 22 个 AI 引擎
│   ├── templates/              # 模板系统
│   │   ├── starters/           # 5 种语言 Starter
│   │   ├── docs-site/          # 文档站点模板
│   │   └── devcontainer/       # DevContainer
│   ├── presets/                # 预设配置
│   ├── extensions/             # 扩展系统
│   ├── reporters/              # 测试报告器 (6 种)
│   ├── constitution/           # 豁免管理
│   └── config.yaml             # 项目配置
├── schemas/                    # JSON/YAML Schema
│   ├── spec-driven/            # 规格模板
│   ├── constitution/           # 9 篇条例
│   └── hooks/                  # Hooks 配置
├── docs/                       # 文档
│   ├── getting-started.md
│   ├── concepts.md
│   ├── workflows.md
│   ├── commands.md
│   └── cli-guide.md
├── AGENTS.md                   # AI 代理指令
├── README_EN.md                # 英文说明文档
├── ARCHITECTURE.md             # 系统架构
├── INSTALL.md                  # 安装指南
└── USAGE.md                    # 使用手册
```

### Constitution + Hook Enforcement

STDD Copilot 引入了 **9 篇开发条例 (Constitution)** 和 **Hook Enforcement System**，实现自动化代码质量管控。

#### 9 篇开发条例

| 优先级 | 条例 | 核心原则 | 执行方式 |
|--------|------|----------|----------|
| **Blocking** | Article 2: TDD | 测试先行 | Pre Hook 阻断 |
| **Blocking** | Article 7: Security | 安全优先 | Pre Hook 阻断 |
| **Blocking** | Article 9: CI/CD | 自动化流水线 | CI 门禁 |
| Warning | Article 1: Library-First | 优先使用成熟库 | 警告提示 |
| Warning | Article 3: Small Commits | 原子提交 | 警告提示 |
| Warning | Article 4: Code Style | 统一风格 | Hook 检查 |
| Warning | Article 6: Error Handling | 显式错误处理 | 建议提示 |
| Suggestion | Article 5: Documentation | 文档即代码 | Post Hook 建议 |
| Suggestion | Article 8: Performance | 性能默认 | Post Hook 建议 |

#### Hook 集成

```bash
# 安装 Hooks
stdd hooks install

# 验证配置
stdd hooks verify

# 查看条例
stdd constitution
stdd constitution show 2
stdd constitution check

# 管理 Hooks
stdd hooks status
stdd hooks disable
stdd hooks enable

# 申请临时豁免
/stdd:constitution waiver --article=2 --reason="Legacy migration"
```

### 变更管理流程

| 流程阶段 | 对应文件/操作 | 状态标识 |
|----------|---------------|----------|
| 创建提案 | `proposal.md` | 待启动 |
| 生成规格 | `specs/*.feature` | 规格中 |
| 设计方案 | `design.md` | 设计中 |
| 任务拆解 | `tasks.md` | 任务就绪 |
| 实现变更 | `/stdd:apply` | 实现中 |
| 归档完成 | `archive/` | 已完成 |

### 技术栈

- **运行时**: Node.js >= 20.0.0
- **核心引擎**: Skill Graph 动态编排
- **TDD 框架**: 框架无关 (Vitest/Jest/pytest/go test/cargo test)
- **AI 集成**: 22 个引擎，4 级兼容体系

### 详细文档

| 文档 | 说明 |
|------|------|
| [安装指南](./INSTALL.md) | 安装步骤和系统要求 |
| [使用手册](./USAGE.md) | 完整使用指南 |
| [系统架构](./ARCHITECTURE.md) | 架构设计和组件说明 |
| [示例集](./EXAMPLES.md) | 社区示例和学习资源 |
| [CLI 使用指南](./docs/cli-guide.md) | CLI 完整文档 |
| [快速开始](./docs/getting-started.md) | 5 分钟上手 |
| [核心概念](./docs/concepts.md) | Specs、Changes、Schemas 详解 |
| [工作流程](./docs/workflows.md) | 8 种常见工作流模式 |
| [命令参考](./docs/commands.md) | 40+ 命令完整参考 |
| [框架对比](./docs/comprehensive-framework-comparison.md) | 与 12 个框架对比 |

### 贡献指南

欢迎提交 Issue 和 Pull Request！请参阅 [CONTRIBUTING.md](./CONTRIBUTING.md)。

### 许可证

[MIT License](LICENSE)

---

<div align="center">

**STDD Copilot** — 让每个开发者都能拥有一个不跑偏、不产生"屎山"的超级 AI 结对编程专家

Made with ❤️ by [Marcher-lam](https://github.com/Marcher-lam)

</div>
