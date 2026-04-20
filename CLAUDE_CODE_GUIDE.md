# 在 Claude Code 中使用 STDD Copilot (最佳实践)

STDD Copilot 的核心本质是将**开发流程固化为基于 Markdown 的工作流指令（在 `.claude/skills/` 下）**，而 Claude Code 天生能够理解这些 Markdown 树形逻辑并完美执行。

两者结合的体验，无需复杂的代码插件编写，直接获得一个**不跑偏、懂测试约束**的超级 AI 结对编程专家。

## 1. 原理：为什么 Claude Code 能直接跑？

- **零成本解析**：STDD 将高级约束（如 `/stdd:turbo`、微任务拆解规则、多轮交互）变成声明式文档；Claude Code 则充当完美的"执行体"（操作文件系统、跑终端命令、修改代码）。
- **天然契合**：大模型最喜欢严谨的步骤拆解，你只需要要求 Claude 在当前工作区优先遵循特定的 SKILL.md 流程指令，它就会变得既有强执行力、又受系统安全网制约。

---

## 2. 基础交互步骤

### 第一步：在项目中引入 STDD 框架

进入你的业务开发目标目录，初始化 STDD 工作区：

```bash
# 使用 CLI (推荐)
stdd init

# 或在 Claude Code 中使用斜杠命令
/stdd:init
```

### 第二步：在项目根目录启动 Claude Code

```bash
claude
```

### 第三步：使用 `/stdd:*` 斜杠命令

所有 STDD 命令通过 `/stdd:` 前缀调用：

```text
> /stdd:new 实现一个支持 Markdown 导出的 Todo-List
```

```text
> /stdd:turbo 实现用户登录页组件
```

---

## 3. 高阶配置：无感植入 STDD

在对话伊始，可以注入身份约束：

> **[项目顶层纪律设定]：**
> 你的身份是受 STDD Copilot 监管的执行体。从现在起，一旦我输入任何以 `/stdd:` 开头的斜杠指令（例如 `/stdd:plan`, `/stdd:commit`），你必须先读取本项目根目录下 `.claude/commands/stdd/{指令名称}.md`。如果该命令文件进一步委派到某个 Skill，再继续读取对应的 `.claude/skills/stdd-{指令名称}/SKILL.md` 或命令文件中显式指向的 Skill 文档，并将其声明的具体步骤视作最高优先级的任务规则（System Prompt）进行运转。对于 `new`、`ff`、`continue`、`explore` 这类 command-only 快捷入口，不要假定存在同名 Skill 目录。如果流程需要与我确认交互，严禁自作主张。

之后直接使用斜杠命令即可：

```text
> /stdd:spec
> /stdd:apply
> /stdd:verify
```

---

## 4. 完整命令列表

### 核心流程

| 命令 | 说明 |
|------|------|
| `/stdd:init` | 初始化 STDD 工作区 |
| `/stdd:new` | 创建新变更提案 |
| `/stdd:propose` | 提出需求草案 |
| `/stdd:clarify` | 需求澄清问答 |
| `/stdd:confirm` | 需求确认 |
| `/stdd:spec` | 生成 BDD 规格 |
| `/stdd:plan` | 任务拆解 + ADR |
| `/stdd:apply` | 开始实现 |
| `/stdd:execute` | Ralph Loop TDD 循环 |
| `/stdd:verify` | 验证规范一致性 |
| `/stdd:archive` | 归档变更 |
| `/stdd:ff` | Fast-Forward 模式 |
| `/stdd:continue` | 继续生成下一产物 |
| `/stdd:turbo` | One-Shot 一键全流程 |
| `/stdd:explore` | 自由探索模式 (只读) |
| `/stdd:final-doc` | 生成最终文档 |
| `/stdd:commit` | 原子化提交 |

### 特殊模式

| 命令 | 说明 |
|------|------|
| `/stdd:brainstorm` | 纯分析建议模式 (无代码修改) |
| `/stdd:issue` | Bug TDD 修复流程 |

### Graph 引擎

| 命令 | 说明 |
|------|------|
| `/stdd:graph visualize` | 可视化 Skill 依赖图 |
| `/stdd:graph analyze` | 分析当前状态 |
| `/stdd:graph run <skill>` | 从指定 Skill 执行 |
| `/stdd:graph parallel` | 并行执行 |
| `/stdd:graph history` | 执行历史 |
| `/stdd:graph recommend` | 智能推荐 |

### SDD 增强

| 命令 | 说明 |
|------|------|
| `/stdd:api-spec` | API 规范先行 |
| `/stdd:schema` | 类型规范先行 |
| `/stdd:contract` | 契约测试 |
| `/stdd:validate` | 规范验证 + Spec Guardian |

### TDD 增强

| 命令 | 说明 |
|------|------|
| `/stdd:outside-in` | 外向内 TDD |
| `/stdd:mock` | 自动 Mock 生成 |
| `/stdd:factory` | 测试数据工厂 |
| `/stdd:mutation` | 变异测试 |

### 辅助功能

| 命令 | 说明 |
|------|------|
| `/stdd:guard` | TDD 守护钩子 |
| `/stdd:constitution` | Constitution 管理 |
| `/stdd:supervisor` | 多 Agent 协调 |
| `/stdd:context` | 三层文档架构 |
| `/stdd:iterate` | 自主迭代循环 |
| `/stdd:memory` | 向量数据库记忆 |
| `/stdd:parallel` | 并行执行 |
| `/stdd:roles` | 12 Agent 角色协作 |
| `/stdd:metrics` | 质量指标仪表板 |
| `/stdd:learn` | 自适应学习 |
| `/stdd:certainty` | 置信度评分 |
| `/stdd:complexity` | 代码质量计算 |
| `/stdd:vision` | 项目愿景管理 |
| `/stdd:user-test` | 用户测试脚本 |
| `/stdd:help` | 上下文感知帮助 |
| `/stdd:prp` | 结构化规划 |

---

## 5. 推荐工作流

### 简单需求

```text
> /stdd:ff 实现工具函数
```

### 中等需求

```text
> /stdd:new 添加用户认证
> /stdd:clarify
> /stdd:confirm
> /stdd:spec
> /stdd:plan
> /stdd:apply
> /stdd:verify
> /stdd:archive
```

### 复杂需求

```text
> /stdd:explore 理解现有架构
> /stdd:new 基于探索结果重构
> /stdd:continue  (逐步生成)
> /stdd:apply
> /stdd:verify
> /stdd:archive
```
