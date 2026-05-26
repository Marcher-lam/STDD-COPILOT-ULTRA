# 工作流程

STDD Copilot Ultra v2.0.0 常见模式和使用场景。

## 快速启动工作流

```bash
stdd init                              # 初始化项目
stdd new change "添加用户认证"          # 开始一个变更
# 在 AI 助手中：
/stdd:propose                           # 写提案
/stdd:spec                              # 写规格
/stdd:plan                              # 创建实现计划
/stdd:apply                             # 应用变更（TDD 循环）
/stdd:verify                            # 验证所有证据
stdd status                             # 检查状态
```

### 交互式快速启动向导

```bash
stdd start                              # 交互式引导，自动推荐工作流
```

`stdd start` 提供交互式向导，根据项目类型和需求自动推荐合适的工作流路径。

---

## 标准功能开发（Standard Profile）

1. **Propose**：`/stdd:propose` — 描述功能、价值与范围
2. **Clarify**：`/stdd:clarify` — 提出和回答澄清问题（78 种方法）
3. **Spec**：`/stdd:spec` — 编写带验收标准的正式规格
4. **Plan**：`/stdd:plan` — 拆解任务及依赖关系
5. **TDD 循环**：`/stdd:apply` → `/stdd:verify` — Red-Green-Refactor 带证据
6. **Archive**：`/stdd:archive` — 标记完成并存储产物

---

## Bug 修复（Quick Profile）

```bash
stdd new change "修复登录超时"
/stdd:fix-packet          # 生成失败上下文（Golden Packet）
/stdd:apply               # 用 TDD 应用修复
/stdd:verify              # 验证修复且无回归
```

---

## Builder 工作流

创建自定义扩展的完整工作流：

```bash
/stdd:builder create agent      # 创建自定义 Agent
# → 定义角色、专长、行为模式
# → 测试 Agent 在场景中的表现
# → 在 Party Mode 或独立场景中使用

/stdd:builder create workflow   # 创建自定义工作流
# → 定义步骤、门禁、产物
# → 测试工作流端到端执行
# → 通过 /stdd:<name> 调用

/stdd:builder create skill      # 创建自定义 Skill
# → 定义触发条件、模板、配置
# → 测试 Skill 输出质量
# → 安装到团队或个人 Skill 库
```

---

## UI 生成工作流

从设计到代码的自动生成流水线：

```bash
# 1. 创建设计系统
/stdd:design create       # 生成 DESIGN.md，包含颜色、排版、间距等设计令牌

# 2. 预览设计系统
/stdd:design preview      # HTML 预览设计令牌效果

# 3. 生成 UI 组件
/stdd:ui create           # 基于设计令牌自动生成前端组件代码

# 4. 批量加速生成
/stdd:turbo               # 加速多组件批量生成
```

设计令牌确保所有生成的 UI 严格遵循统一的设计规范。

---

## PRFAQ 工作流

Amazon Working Backwards 产品验证方法，适用于重大功能决策：

```bash
# 阶段 1：原始想法
/stdd:prfaq ignition       # 捕获原始想法、核心假设

# 阶段 2：面向客户的发布公告
/stdd:prfaq press-release  # 撰写假设产品已发布的新闻稿

# 阶段 3：外部常见问题
/stdd:prfaq customer-faq   # 列出客户可能的问题和答案

# 阶段 4：内部工程/运维问题
/stdd:prfaq internal-faq   # 列出技术实现和运维相关问题

# 阶段 5：定量评分
/stdd:prfaq verdict        # 4 维度评分（可行性、价值、风险、工作量）

# 一键全流程
/stdd:prfaq full           # 执行完整 PRFAQ 流程
```

Verdict 阶段在 4 个维度（可行性、价值、风险、工作量）上进行评分，并交叉验证 Constitution 合规性。

---

## 模块安装工作流

通过 Modules Marketplace 扩展能力：

```bash
/stdd:modules search "auth"       # 搜索认证相关模块
/stdd:modules install stdd-auth   # 安装模块
/stdd:modules list                 # 查看已安装模块
# 安装后即可使用模块提供的命令和 Skill
```

---

## 多 Agent 审查（Party Mode）

```bash
/stdd:roles               # 列出 12 个可用 Persona
/stdd:party-mode          # 启动多 Agent 讨论
# 指定主题和角色：
# "讨论新 API 的安全影响"
# 参与者：Shield（安全）、Wei（架构）、Rex（审查）
```

Party Mode 编排真实的子 Agent 讨论：
- N 轮 Agent 间交叉对话
- 共享上下文在轮次间累积
- 收敛检测识别共识达成时机
- 交叉分析生成影响力矩阵

---

## 架构决策

```bash
/stdd:brainstorm          # 探索选项
/stdd:roles consult wei "我们应该用微服务吗？"
/stdd:prfaq               # Working Backwards 分析
/stdd:complexity          # 度量复杂度影响
```

---

## Iterate 循环

Plan-Execute-Reflect 迭代循环，自动优化输出：

```bash
/stdd:iterate             # 启动迭代循环
# 系统自动执行：
# Plan → 规划当前步骤
# Execute → 执行实现
# Reflect → 反思结果，识别改进点
# 循环直至质量达标
```

---

## CodeGraph 代码分析

代码知识图谱，用于代码关系和依赖分析：

```bash
/stdd:codegraph           # 构建代码知识图谱
/stdd:codegraph query     # 查询代码关系和依赖
```

---

## 上下文管理

对于超出上下文窗口的大型代码库：

```bash
/stdd:context-engine distill   # 压缩代码为签名
/stdd:context-engine shard     # 将文档分割为可导航的块
/stdd:context-engine status    # 查看蒸馏/分片状态
/stdd:context-engine estimate  # 估算 token 使用量
```

---

## 质量门禁

### Constitution 检查

```bash
stdd constitution check   # 运行全部 9 篇条例
stdd constitution show 1  # 查看特定条例详情
```

### 验证流水线

```bash
/stdd:verify              # 完整验证（测试 + 覆盖率 + Constitution）
/stdd:mutation            # 变异测试，检测假通过
/stdd:audit               # 合规审计，带豁免追踪
```

---

## Web Dashboard

```bash
stdd dashboard open       # 在浏览器中打开 HTML 仪表板
```

Dashboard 展示：
- 项目健康概览与指标
- Spec/Change 进度追踪
- Constitution 合规状态
- 12 Persona 名册与激活状态
- 9 个官方模块能力
- 最近命令活动时间线

---

## Story Board（敏捷）

```bash
stdd story board          # 查看敏捷看板
stdd story sprint         # Sprint 管理
```

---

## Graph 编排

```bash
/stdd:graph               # 查看 DAG 工作流
/stdd:graph-run           # 执行工作流
/stdd:graph-history       # 查看执行历史
```

---

## IDE 集成

STDD 支持 8 种 IDE，自动生成配置：

| IDE | 配置文件 | 生成内容 |
|-----|---------|---------|
| Claude Code | `.claude/CLAUDE.md` | 规则 + 命令 |
| Cursor | `.cursorrules` | 工作流规则 |
| Windsurf | `.windsurfrules` | 工作流规则 |
| VS Code | `.vscode/settings.json` | Copilot 指令 |
| Augment | `.augment/AUGMENT.md` | 项目规则 |
| Gemini CLI | `.gemini/GEMINI.md` | 项目规则 |
| Kiro | `.kiro/KIRO.md` | 项目 + 设计规则 |
| Codex CLI | `.codex/CODEX.md` | 项目 + TDD 规则 |

---

## 文档导航
- [项目首页](../README.md) - 项目概览和顶层示例
- [使用手册](../USAGE.md) - 完整使用指南
- [快速开始](getting-started.md) - 首次使用流程和 CLI 速查
- [CLI 使用指南](cli-guide.md) - CLI 完整文档
- [核心概念](concepts.md) - 深入理解 specs、changes 和 schemas
- [命令参考](commands.md) - 完整命令参考
- [能力清单](capabilities.md) - 工具能力边界说明
- [英文文档入口](en/README.md) - English docs index
