# STDD Copilot 能力边界说明

> 本文档明确区分工具自身能力和需要外部 AI 执行器才能完成的功能

## 核心设计原则

STDD Copilot 是一个 **CLI 工具 + 模板框架**，它本身不提供 AI 编码能力，而是为你的 AI 编码助手（Claude Code、Cursor、Copilot 等）设定"交通规则"。

---

## ✅ 工具自身已实现的能力

### CLI 命令（可直接使用）

| 命令 | 功能 | 状态 |
|------|------|------|
| `stdd init` | 初始化项目结构 | ✅ 完全实现 |
| `stdd new <name>` | 创建变更目录和文件 | ✅ 完全实现 |
| `stdd apply <name> [--phase red|green|refactor] [--allow-no-tests]` | 运行测试并更新任务状态 | ✅ 完全实现 |
| `stdd verify <name>` | 验证变更（测试 + Constitution） | ✅ 完全实现 |
| `stdd archive <name>` | 归档变更 + Delta Spec 合并 | ✅ 完全实现 |
| `stdd list` | 列出所有变更 | ✅ 完全实现 |
| `stdd status [name]` | 显示变更状态 | ✅ 完全实现 |
| `stdd doctor [--deep]` | 综合健康检查 / 深度诊断 | ✅ 完全实现 |
| `stdd guard` | 质量门禁检查 | ✅ 完全实现 |
| `stdd constitution` | 查看/检查开发条例 | ✅ 完全实现 |
| `stdd mutation <name>` | Quick 启发式变异测试 | ✅ 部分实现 |
| `stdd workspace` | 工作区管理 | ✅ 完全实现 |
| `stdd metrics` | 质量指标 | ✅ 完全实现 |
| `stdd graph run` | Graph 引擎执行 | ⚠️ 需要外部执行器 |
| CommandLoader 模式 | 88 个命令统一注册/发现/加载 | ✅ 完全实现 |

### Constitution 检查（9 篇条例）

| Article | 名称 | 检查能力 |
|---------|------|---------|
| 1 | Library-First | 检测未使用依赖、重复造轮子 | ✅ |
| 2 | TDD | 测试文件存在、反模式检查、阶段合规 | ✅ |
| 3 | Small Commits | Git 历史记录检查 | ✅ |
| 4 | Code Style | ESLint 集成、文件长度检查 | ✅ |
| 5 | Documentation | JSDoc 检查 | ✅ |
| 6 | Error Handling | 空 catch 块检测 | ✅ |
| 7 | Security | 硬编码密码、SQL 注入检测 | ✅ |
| 8 | Performance | useEffect 依赖、N+1 查询检测 | ✅ |
| 9 | CI/CD | CI 配置检测 | ✅ |

### 测试执行

- ✅ 自动检测测试命令（package.json、stdd/config.yaml）
- ✅ 支持多工作区测试
- ✅ 测试报告注入（Jest、Vitest、pytest 等）
- ✅ TDD 阶段强制（RED → GREEN → REFACTOR）

### Evidence 系统

- ✅ 结构化证据收集
- ✅ 审计追踪
- ✅ Shell 执行器审计日志（`stdd/logs/shell-executor-audit.jsonl`）
- ✅ Fix Packet 生成

### Workspace / Monorepo

- ✅ 自动检测 npm/pnpm workspaces
- ✅ `--workspace` 作用域
- ✅ Workspace registry 管理

---

## ⚠️ 需要外部 AI 执行器的能力

### Claude Code 斜杠命令（`/stdd:*`）

这些命令是 **markdown 模板**，需要在 Claude Code 会话中使用，由 AI 助手执行：

| 命令 | 功能 | 依赖 |
|------|------|------|
| `/stdd:propose` | 提出需求草案 | 🤖 AI 生成内容 |
| `/stdd:clarify` | 需求澄清（78 种方法） | 🤖 AI 生成内容 |
| `/stdd:confirm` | 需求确认门 | 🤖 AI 生成内容 |
| `/stdd:spec` | 生成 BDD 规格 | 🤖 AI 生成内容 |
| `/stdd:plan` | 任务拆解 + ADR | 🤖 AI 生成内容 |
| `/stdd:execute` | Ralph Loop TDD 执行 | 🤖 AI 编码 |
| `/stdd:ff` | Fast-Forward 快速生成 | 🤖 AI 生成内容 |
| `/stdd:continue` | 继续生成产物 | 🤖 AI 生成内容 |
| `/stdd:turbo` | 一键全流程 | 🤖 AI 编码 |

### Graph 引擎

| 功能 | 状态 |
|------|------|
| DAG 编译 | ✅ 工具实现 |
| 拓扑排序 | ✅ 工具实现 |
| 节点执行 | ⚠️ 需要外部执行器 |
| 自愈引擎 | ⚠️ 框架存在，需要执行器 |

### Mutation 测试

| 模式 | 状态 |
|------|------|
| Quick（启发式） | ✅ 工具实现 |
| Deep（Stryker） | ⚠️ 需要项目安装配置 Stryker |

### Agent 运行时

| 功能 | 状态 |
|------|------|
| 角色定义 | ✅ 模板存在 |
| Party Mode | ✅ 多 Agent 交叉对话 + 收敛检测 |
| 多 Agent 协作 | ✅ 已实现（Party Mode + roles 触发） |

---

## 🆕 Phase 2-4 新增能力

### Builder 引擎

| 功能 | 状态 |
|------|------|
| 创建自定义 Agent | ✅ 模板 + 注册 |
| 创建自定义 Workflow | ✅ 模板 + 注册 |
| 创建自定义 Skill | ✅ 模板 + 注册 |

### UI Generator

| 功能 | 状态 |
|------|------|
| 设计令牌生成（DESIGN.md） | ✅ 工具实现 |
| HTML 设计预览 | ✅ 工具实现 |
| UI 组件代码生成 | ✅ 模板（需 AI 执行器） |
| 批量加速生成（Turbo） | ✅ 模板（需 AI 执行器） |

### Modules Marketplace

| 功能 | 状态 |
|------|------|
| 模块搜索 | ✅ 工具实现 |
| 模块安装 | ✅ 工具实现 |
| 模块列表 | ✅ 工具实现 |
| 模块卸载 | ✅ 工具实现 |

### Dashboard

| 功能 | 状态 |
|------|------|
| 静态 HTML 仪表板生成 | ✅ 工具实现 |
| 项目健康概览 | ✅ 工具实现 |
| 浏览器自动打开 | ✅ 工具实现 |

### Docs Site

| 功能 | 状态 |
|------|------|
| 文档站点生成 | ✅ 模板（需 AI 执行器） |
| Markdown 组织 | ✅ 工具实现 |

### PRFAQ 工作流

| 功能 | 状态 |
|------|------|
| 5 阶段产品验证 | ✅ 模板（需 AI 执行器） |
| 定量评分（Verdict） | ✅ 模板（需 AI 执行器） |

### CodeGraph

| 功能 | 状态 |
|------|------|
| 代码知识图谱构建 | ✅ 工具实现 |
| 代码关系查询 | ✅ 工具实现 |
| 依赖分析 | ✅ 工具实现 |

### Iterate 循环

| 功能 | 状态 |
|------|------|
| Plan-Execute-Reflect 循环 | ✅ 模板（需 AI 执行器） |
| 自动迭代优化 | ✅ 模板（需 AI 执行器） |

### Profile 自适应

| 功能 | 状态 |
|------|------|
| 项目复杂度自动检测 | ✅ 工具实现 |
| 规划深度自动调节 | ✅ 工具实现 |
| 4 级 Profile（Quick/Standard/Thorough/Enterprise） | ✅ 工具实现 |

### 交互式启动向导

| 功能 | 状态 |
|------|------|
| `stdd start` 交互式引导 | ✅ 工具实现 |
| 自动推荐工作流 | ✅ 工具实现 |

### Visual Regression Testing

| 功能 | 状态 |
|------|------|
| 截图基线管理 (`stdd browser update-baseline`) | ✅ 工具实现 |
| 像素级差异比对 (`stdd browser compare`) | ✅ 工具实现 |
| 差异报告与差异图输出 | ✅ 工具实现 |
| Visual Constitution Gate (verify 时自动触发视觉差异检查) | ✅ 工具实现 |

### Design System Reverse Engineering

| 功能 | 状态 |
|------|------|
| CSS/Tailwind token 自动提取 | ✅ 工具实现 |
| 设计令牌反向扫描 | ✅ 工具实现 |
| 自动生成 DESIGN.md 设计系统文档 (`stdd design reverse-scan`) | ✅ 模板（需 AI 执行器） |

### Workflow DSL

| 功能 | 状态 |
|------|------|
| YAML 工作流定义 | ✅ 工具实现 |
| 拓扑排序 | ✅ 工具实现 |
| DAG 编译 | ✅ 工具实现 |
| 环路检测 (Cycle Detection) | ✅ 工具实现 |

### Sandbox Mode

| 功能 | 状态 |
|------|------|
| 命令执行沙箱 | ✅ 工具实现 |
| 危险二进制拦截 (Dangerous Binary Blocking) | ✅ 工具实现 |
| 路径限制 (Path Restriction) | ✅ 工具实现 |

### Trace & Observability

| 功能 | 状态 |
|------|------|
| TraceID/SpanID 嵌入 `progress.jsonl` | ✅ 工具实现 |
| TraceID/SpanID 嵌入证据报告 (Evidence Reports) | ✅ 工具实现 |
| 分布式追踪上下文传播 | ✅ 工具实现 |

---

## 📋 能力总结

### 工具能做什么

1. **管理 Spec 文件**：创建、组织、版本化
2. **执行测试**：运行测试、更新状态、收集证据
3. **强制 TDD 流程**：RED → GREEN → REFACTOR 阶段控制
4. **质量门禁**：9 篇 Constitution 条例检查
5. **证据收集**：结构化证据、审计追踪
6. **工作区管理**：Monorepo 支持
7. **Builder 引擎**：创建自定义 Agent、Workflow、Skill
8. **UI 生成**：从设计令牌自动生成前端组件
9. **模块市场**：浏览、搜索、安装社区扩展模块
10. **Dashboard**：项目健康仪表板
11. **CodeGraph**：代码知识图谱与依赖分析
12. **Profile 自适应**：根据复杂度自动调节规划深度
13. **PRFAQ 工作流**：Amazon Working Backwards 产品验证
14. **Iterate 循环**：Plan-Execute-Reflect 迭代优化
15. **交互式向导**：`stdd start` 一站式引导
16. **视觉回归测试**：截图基线管理、像素级差异比对、Visual Constitution Gate
17. **设计系统反向工程**：CSS/Tailwind token 提取、自动生成 DESIGN.md
18. **Workflow DSL**：YAML 工作流定义、DAG 编译与拓扑排序、环路检测
19. **沙箱模式**：命令执行沙箱、危险二进制拦截、路径限制
20. **追踪与可观测性**：TraceID/SpanID 嵌入 progress.jsonl 和证据报告

### 工具不能做什么

1. **AI 编码**：不能自动写代码
2. **需求分析**：不能自动分析需求
3. **Spec 生成**：不能自动生成规格文档
4. **任务拆解**：不能自动拆解任务

### 需要配合的 AI 工具

- **Claude Code**：主要支持的 AI 编码助手
- **Cursor**：支持的 IDE
- **GitHub Copilot**：支持的 IDE
- **其他 AI 工具**：可通过模板适配

---

## 🔧 典型工作流

### 场景 1：需求明确

```bash
# 1. 初始化（工具）
stdd init

# 2. 创建变更（工具）
stdd new add-login

# 3. 生成 Spec 和任务（AI - 使用 /stdd:ff）
# 在 Claude Code 中: /stdd:ff 实现用户登录

# 4. 执行 TDD 任务（工具 + 人类）
stdd apply add-login --phase red     # 写失败测试（人类）
stdd apply add-login --phase green   # 实现代码（人类/AI）
stdd apply add-login --phase refactor # 重构（人类/AI）

# 5. 验证（工具）
stdd verify add-login

# 6. 归档（工具）
stdd archive add-login
```

### 场景 2：需求模糊

```bash
# 1. 初始化（工具）
stdd init

# 2. 创建变更（工具）
stdd new auth-flow

# 3. 需求澄清（AI - 使用 /stdd:clarify）
# 在 Claude Code 中: /stdd:clarify 实现用户认证

# 4. 生成 Spec（AI - 使用 /stdd:spec）
# 在 Claude Code 中: /stdd:spec

# 5. 后续同场景 1
```

---

## 📚 相关文档

- [README.md](../README.md) - 项目介绍
- [USAGE.md](../USAGE.md) - 完整使用指南
- [ARCHITECTURE.md](../ARCHITECTURE.md) - 系统架构
- [agent-protocol.md](./agent-protocol.md) - AI Agent 行为协议
