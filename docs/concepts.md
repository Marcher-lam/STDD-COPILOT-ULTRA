# 核心理念

STDD Copilot Ultra v2.0.0 — 基于 Spec 驱动、TDD 优先的 AI 编码工程控制系统。

实践用法请参阅 [快速开始](getting-started.md) 和 [工作流程](workflows.md)。

## STDD = Smart Team-Driven Development

STDD（智能团队驱动开发）是一个为 AI 编码助手设计的工程治理框架。核心理念：用结构化的工作流、质量门禁和治理规则，确保 AI 生成的代码达到生产级标准。

当前版本提供 **88 个命令模板** 和 **57 个 Skill 模板**，覆盖从需求到交付的完整生命周期。

---

## 核心原则

### 1. Spec 驱动开发

每一个变更都从规格文档开始（`/stdd:spec`）。Spec 定义"做什么"而非"怎么做"，防止 AI 助手在需求不清晰时直接跳入实现。

### 2. TDD 优先（Ralph Loop）

核心测试循环遵循 Ralph Loop：

```
RED → CHECK → GREEN → MUTATION → REFACTOR
```

- **RED**：先写失败测试
- **CHECK**：验证测试因正确原因失败
- **GREEN**：写最少代码通过测试
- **MUTATION**：变异测试捕获假通过
- **REFACTOR**：在测试保持通过的前提下重构

### 3. 证据驱动验证

没有变更可以称为"完成"，除非提供证据。`/stdd:verify` 要求：
- 所有测试通过
- 覆盖率门禁达标
- Constitution 条例合规
- 现有功能无回退

### 4. Constitution（9 篇条例治理）

9 篇质量条例作为可编程的治理契约：

| # | 条例 | 严重度 | 用途 |
|---|------|--------|------|
| 1 | Library-First | Blocking | 优先使用成熟依赖 |
| 2 | TDD | Blocking | 测试先行 |
| 3 | Small Commits | Blocking | 小步提交 |
| 4 | Code Style | Warning | 代码风格一致 |
| 5 | Documentation | Warning | 文档与代码同步 |
| 6 | Error Handling | Blocking | 错误处理完备 |
| 7 | Security | Blocking | OWASP Top 10 合规 |
| 8 | Performance | Suggestion | 性能预算达标 |
| 9 | CI/CD | Blocking | CI 配置就绪 |

### 5. 命名 Agent 人格（12 位专家）

STDD 为 AI 助手分配具名人格，而非泛泛回应：

| 人格 | 角色 | 专长 |
|------|------|------|
| Maya | Product Owner | 需求、优先级 |
| Alex | Developer | 实现、架构 |
| Sam | Tester | 质量保障、边界条件 |
| Rex | Reviewer | 代码审查、标准 |
| Wei | Architect | 系统设计、可扩展性 |
| Shield | Security | 威胁建模、合规 |
| Ops | DevOps | 部署、监控 |
| Luna | UX Designer | 用户体验、无障碍 |
| Jordan | Business Analyst | 干系人对齐 |
| Page | Tech Writer | 文档、清晰表达 |
| QC | QA Lead | 测试策略、覆盖率 |
| Data | Data Analyst | 指标、洞察 |

### 6. Profile 自适应规划

根据项目复杂度自动调节规划深度：
- **Quick**：小 bug 修复、热修复
- **Standard**：常规功能
- **Thorough**：涉及安全影响的复杂变更
- **Enterprise**：多团队、需要合规的变更

### 7. DAG 工作流编排

Graph 引擎通过有向无环图（DAG）路由任务：

```
stdd-propose → stdd-spec → stdd-plan → stdd-apply → stdd-verify
                                ↓
                          stdd-outside-in
```

- 自动意图检测（feature / repair / refactor）
- 尽可能并行执行
- Profile 自适应路由

### 8. 3 层 Skill 配置

Skill 可在 3 个层级自定义，支持深度合并：
1. **Base**：SKILL.md frontmatter（默认值）
2. **Team**：`stdd/config/skill-overrides.yaml`（团队约定）
3. **User**：`~/.stdd/skill-overrides.yaml`（个人偏好）

---

## Phase 2-4 新增概念

### 9. Builder 引擎

创建自定义 Agent、Workflow、Skill 的平台能力：

```
/stdd:builder create agent    # 创建自定义 Agent
/stdd:builder create workflow # 创建自定义工作流
/stdd:builder create skill    # 创建自定义 Skill
```

Builder 引擎提供统一的自定义扩展框架，让团队可以根据自身需求创建专属的 AI Agent 和工作流模板。

### 10. UI Generator

基于 DESIGN.md 设计令牌自动生成前端页面和组件：

```
/stdd:design create    # 创建设计系统
/stdd:design preview   # HTML 预览设计令牌
/stdd:ui create        # 基于设计令牌生成 UI 组件
/stdd:turbo            # 加速多组件批量生成
```

设计令牌到代码的自动桥梁，确保生成的 UI 严格遵循设计规范。

### 11. Modules Marketplace

社区模块市场，支持浏览、搜索、安装扩展模块：

```
/stdd:modules search <keyword>   # 搜索模块
/stdd:modules install <module>   # 安装模块
/stdd:modules list               # 列出已安装模块
```

通过模块化架构，团队可以共享和复用经过验证的工作流和 Skill。

### 12. Dashboard

静态 HTML 项目健康仪表板：

```
stdd dashboard open    # 在浏览器中打开仪表板
```

Dashboard 展示：
- 项目健康概览与指标
- Spec/Change 进度追踪
- Constitution 合规状态
- 12 Persona 名册与激活状态
- 9 个官方模块能力
- 最近命令活动时间线

### 13. Docs Site

从项目文档生成静态文档站点：

```
/stdd:docs    # 生成文档站点
```

自动将项目中的 Markdown 文档组织为可导航的静态站点。

### 14. PRFAQ 工作流

Amazon Working Backwards 产品验证方法，通过 5 个阶段进行数据驱动决策：

1. **Ignition**：原始想法捕获
2. **Press Release**：面向客户的发布公告
3. **Customer FAQ**：外部常见问题
4. **Internal FAQ**：内部工程/运维问题
5. **Verdict**：定量评分（可行性、价值、风险、工作量）

### 15. CodeGraph

代码知识图谱，分析代码关系和依赖：

```
/stdd:codegraph        # 构建代码知识图谱
/stdd:codegraph query  # 查询代码关系
```

提供项目级别的代码依赖分析和关系图谱。

### 16. Iterate 循环

Plan-Execute-Reflect 迭代循环：

```
/stdd:iterate    # 启动迭代循环
```

系统自动执行"规划 → 执行 → 反思"循环，持续优化输出质量。

### 17. Party Mode（多 Agent 协作）

通过 roles 命令触发的多 Agent 协作模式：

```
/stdd:roles            # 列出 12 个可用 Persona
/stdd:party-mode       # 启动多 Agent 讨论
```

Party Mode 编排真实的子 Agent 讨论：
- N 轮 Agent 间交叉对话
- 共享上下文在轮次间累积
- 收敛检测识别共识达成时机
- 交叉分析生成影响力矩阵

---

## 架构概览

```
CLI (stdd) → Commands → Skills → Templates
                ↓
         Profile Engine → DAG Router → Execution
                ↓
    Constitution + Evidence + Verification
                ↓
         12 Agent Personas + Party Mode
                ↓
    Builder + UI Generator + Modules + Dashboard + Docs Site
```

---

## 文档导航
- [项目首页](../README.md) - 项目概览和顶层示例
- [快速开始](getting-started.md) - 实践第一步
- [快速开始](getting-started.md) - 首次使用流程和 CLI 速查
- [使用手册](../USAGE.md) - 完整使用指南
- [CLI 使用指南](cli-guide.md) - CLI 完整文档
- [工作流程](workflows.md) - 常见模式和使用场景
- [命令参考](commands.md) - 完整命令参考
- [能力清单](capabilities.md) - 工具能力边界说明
- [英文文档入口](en/README.md) - English docs index
