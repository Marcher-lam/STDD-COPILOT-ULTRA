# 三方对比：STDD Copilot Ultra vs STDD Copilot vs BMAD-METHOD

> 基于公开信息 + 源码实测。STDD Copilot = v1.0.7，STDD Copilot Ultra = v2.1.0，BMAD-METHOD = V6.7.x。
> 生成日期：2026-05-26

---

## 一句话结论

| 项目 | 一句话定位 |
|------|-----------|
| **BMAD-METHOD** | AI 敏捷研发组织方法论 + 多角色专家协作框架 + 模块生态 |
| **STDD Copilot** | 规格驱动 + TDD + 质量门禁的本地 CLI 工程控制层 |
| **STDD Copilot Ultra** | 在 STDD 基础上吸收 BMAD 上游优势，形成从构思到交付的全生命周期 AI 开发操作系统 |

---

## 定位与核心理念

| 维度 | BMAD-METHOD | STDD Copilot | STDD Copilot Ultra |
|------|-------------|--------------|---------------------|
| 全称 | Breakthrough Method for Agile AI-Driven Development | Specification + Test-Driven Development Copilot | Smart Team-Driven Development Copilot Ultra |
| 核心目标 | AI 专家角色 + 敏捷工作流驱动全生命周期 | 文件化规格 + TDD + 质量门控制 AI 编码 | 上游探索 + 规格驱动 + TDD 执行 + 视觉验证 全链路 |
| 本质 | AI 敏捷方法论 + Agent 团队 + 模块生态 | 本地 CLI 工程控制 + Spec/TDD 执行框架 | AI 全生命周期开发平台（操作系统级） |
| AI 的角色 | 专家合作者，帮助思考/规划/拆解/执行 | 执行者，围绕规格和测试证据工作 | 既是上游探索的协作者，也是下游执行的被约束者 |
| 核心隐喻 | AI 敏捷团队 | AI 工程流水线 | AI 软件工程操作系统 |

---

## 生命周期覆盖

| 阶段 | BMAD-METHOD | STDD Copilot | STDD Copilot Ultra |
|------|:-----------:|:------------:|:-------------------:|
| 产品构思 | ★★★★★ | ★★☆☆☆ | ★★★★☆ |
| 需求管理 | ★★★★★ | ★★★☆☆ | ★★★★☆ |
| UX/设计 | ★★★★★ | ★★☆☆☆ | ★★★★☆ |
| 架构设计 | ★★★★★ | ★★★☆☆ | ★★★★☆ |
| 敏捷拆分 | ★★★★★ | ★★★☆☆ | ★★★★☆ |
| 编码实现 | ★★★☆☆ | ★★★★★ | ★★★★★ |
| 测试策略 | ★★★☆☆ | ★★★★★ | ★★★★★ |
| 视觉验证 | ★★☆☆☆ | ★☆☆☆☆ | ★★★★★ |
| 质量门禁 | ★★★☆☆ | ★★★★★ | ★★★★★ |
| 验证归档 | ★★☆☆☆ | ★★★★★ | ★★★★★ |
| 断点续传 | ★★★☆☆ | ★★★★☆ | ★★★★★ |
| 可追溯性 | ★★★☆☆ | ★★★★★ | ★★★★★ |

---

## 核心能力矩阵

| 能力 | BMAD V6 | STDD Copilot | STDD Ultra |
|------|---------|--------------|------------|
| **命令数量** | Workflow/Agent 为主 | 75 CLI | 88 CLI + 57 Skill = 91 去重入口 |
| **Agent 角色** | 12+ 专家角色（PM/Arch/Dev/UX/QA/SM） | 12-role simulation | 多角色 Party Mode + AI 辩论收敛 |
| **TDD 闭环** | Dev Loop Automation（路线中） | Ralph Loop 完整 | Ralph Loop + 变异 + 假绿灯 |
| **BDD 规格** | 需模块支持 | 内置 spec/pipeline | 内置 + user-test 骨架生成 |
| **变异测试** | 不确定 | 内置 mutation | 内置 + 证据归档 |
| **Constitution** | 无 | 9 条宪法 | 9 条 + 审计 + 豁免 |
| **设计系统** | UX Agent 协作 | DESIGN.md 生成 | DESIGN.md + reverse-scan + UI 生成 |
| **视觉回归** | 无 | browser snapshot | compare + baseline + Constitution Gate |
| **工作流 DSL** | 模块体系 | Skill Graph | YAML Workflow + Kahn DAG 编译 |
| **沙盒安全** | 无 | 基础危险命令拦截 | 沙盒模式 + 二进制黑名单 + 路径限制 |
| **链路追踪** | 无 | progress.jsonl | TraceID/SpanID + evidence 关联 |
| **CI/CD** | 模块支持 | ci 命令 | ci + ci-generator + starters |
| **模块生态** | BMM/BMB/TEA/BMGD/CIS 等 | 单体 | extensions + modules marketplace |
| **文档站** | docs.bmad-method.org | 本地 docs/ | docs site 生成器 + en/ 双语 |
| **Dashboard** | 成熟网站 | 无 | dashboard generate/open |

---

## 工程质量数据

| 指标 | BMAD-METHOD | STDD Copilot | STDD Copilot Ultra |
|------|-------------|--------------|---------------------|
| 测试套件 | 未公开 | 192 | **206** |
| 测试用例 | 未公开 | 4,164 | **4,378** |
| 通过率 | 未公开 | ~97% | **100%** |
| 语句覆盖率 | 未公开 | ~97% | **~97.7%** |
| 分支覆盖率 | 未公开 | ~93% | **~93.2%** |
| 支持 AI 引擎 | Claude Code/Cursor 等 4 层 | 24 种 | **24 种** |
| Node 要求 | v20.12+ | ≥20.0.0 | **≥20.0.0** |
| Python 要求 | 3.10+ + uv | 不要求 | **不要求** |

---

## Ultra 相对 Copilot 的增量升级

| 维度 | STDD Copilot → Ultra 升级点 |
|------|---------------------------|
| **上游探索** | 新增 `brainstorm`、`roles party`、`explore`、`vision`、`product-proposal` — 从纯工程工具到产品构思平台 |
| **Agent 协作** | 从 12-role simulation 升级为 Party Mode + AI 辩论 + 收敛提案 |
| **设计系统** | 从预设 DESIGN.md → reverse-scan 反向挖掘 + UI 页面/组件生成 |
| **视觉回归** | 全新：pixelmatch 截图对比 + baseline 管理 + Visual Constitution Gate |
| **工作流** | 从 Skill Graph → YAML Workflow DSL + Kahn DAG 编译 |
| **安全** | 从基础拦截 → 沙盒模式（二进制黑名单 + 路径限制） |
| **可观测性** | 从 progress.jsonl → TraceID/SpanID 全链路追踪 |
| **模块生态** | 从单体 → extensions registry + modules marketplace + builder |
| **命令规模** | 75 → 88 CLI + 57 Skill = 91 去重入口 |
| **测试规模** | 192 suites / 4,164 tests → 206 suites / 4,378 tests |
| **品牌升级** | Spec-Driven → **Smart Team-Driven** Development |

---

## Ultra 相对 BMAD 的对比

| Ultra 优势 | BMAD 劣势 |
|------------|-----------|
| 88 CLI 命令 + 91 能力入口，工程覆盖面远超 BMAD | BMAD 更偏 workflow/agent 调用，CLI 面窄 |
| TDD Ralph Loop + 变异测试 + 假绿灯防护是原生闭环 | BMAD 测试依赖 TEA 模块，非核心闭环 |
| 9-Article Constitution + 豁免 + 审计体系 | BMAD 无工程宪法概念 |
| 证据链 + fix-packet + archive 可追溯归档 | BMAD 产物可追溯性依赖 workflow 纪律 |
| 视觉回归 + Visual Constitution Gate | BMAD 无内置视觉回归 |
| reverse-scan 从代码反向生成设计规范 | BMAD 无此能力 |
| Workflow DSL + DAG 编译 + cycle 检测 | BMAD 工作流偏配置驱动，无拓扑排序 |
| 沙盒模式 + TraceID/SpanID | BMAD 无工程沙盒和链路追踪 |
| 206 套件 / 4378 测试 / 97.7% 覆盖率 | BMAD 工程质量数据不透明 |

| BMAD 优势 | Ultra 劣势 |
|------------|-----------|
| 47.9k stars，成熟社区 + Discord + YouTube | 社区生态早期 |
| 多模块官方生态（BMM/BMB/TEA/BMGD/CIS） | 模块生态刚起步 |
| Web Bundle 90% token 节省 | 无 token 优化机制 |
| docs.bmad-method.org 成熟文档站 | 文档站刚有生成器 |
| Scale-Domain-Adaptive 自适应规划深度 | 规划深度自适应不如 BMAD 产品化 |
| 视觉 Agent 选择 + 拖拽管理 | Agent 管理仍以 CLI 为主 |
| Stateful Workflows 状态驱动 | Workflow DSL 刚实现基础版 |

---

## 适用场景推荐

### 选 BMAD-METHOD 的场景

- 从零开始构思产品，需要 PM/UX/Architect 多角色深度协作
- 团队习惯敏捷流程，希望 AI 像专家团队一样参与规划
- 项目规模不确定，需要自适应规划深度
- 需要成熟社区、教程、模块生态支持
- 游戏开发、创意智能等垂直领域

### 选 STDD Copilot 的场景

- 已有代码仓库，只需要纯工程 TDD 闭环
- 不需要上游产品探索，只关注"AI 写代码后的质量控制"
- 团队规模小，不需要多角色协作
- 对 CLI 命令数量要求不高（75 个够用）

### 选 STDD Copilot Ultra 的场景

- 需要从产品构思到可验证交付的**完整链路**
- 既要 BMAD 式的上游探索，又要 STDD 式的下游质量门禁
- 团队需要视觉回归、设计系统反推、工作流编排等高级能力
- 需要沙盒安全和全链路追踪
- 希望一个工具覆盖全生命周期，而不是 BMAD + STDD 两套

---

## 三方总评

```
┌──────────────────┬──────────┬──────────────┬──────────────────┐
│ 维度              │ BMAD V6  │ STDD Copilot │ STDD Copilot Ultra│
├──────────────────┼──────────┼──────────────┼──────────────────┤
│ 产品/需求探索     │ 9/10     │ 4/10         │ 8/10             │
│ 多 Agent 协作     │ 9/10     │ 5/10         │ 8/10             │
│ 敏捷方法论完整度   │ 9/10     │ 5/10         │ 8/10             │
│ 代码仓库执行控制   │ 6/10     │ 9/10         │ 9/10             │
│ Spec-first 强度   │ 7/10     │ 9/10         │ 9/10             │
│ TDD 强度         │ 6/10     │ 10/10        │ 10/10            │
│ 测试证据链        │ 5/10     │ 9/10         │ 10/10            │
│ 质量门禁         │ 6/10     │ 10/10        │ 10/10            │
│ 视觉回归         │ 3/10     │ 2/10         │ 9/10             │
│ 设计系统         │ 7/10     │ 6/10         │ 9/10             │
│ 模块生态         │ 9/10     │ 4/10         │ 7/10             │
│ 文档/社区         │ 9/10     │ 6/10         │ 7/10             │
│ CLI 命令覆盖      │ 5/10     │ 9/10         │ 10/10            │
│ 安全与沙盒       │ 5/10     │ 7/10         │ 9/10             │
│ 可观测性         │ 4/10     │ 6/10         │ 9/10             │
│ 全生命周期覆盖    │ 8/10     │ 6/10         │ 9/10             │
│ 综合工程落地      │ 6/10     │ 8/10         │ 9/10             │
└──────────────────┴──────────┴──────────────┴──────────────────┘
```

---

## 最终结论

**BMAD-METHOD** — AI 敏捷方法论生态最成熟，上游探索和多角色协作最强。适合"想清楚做什么"。

**STDD Copilot** — 纯工程 TDD 控制系统，Spec-first + 质量门禁最强。适合"让 AI 别写烂代码"。

**STDD Copilot Ultra** — 全生命周期 AI 开发操作系统，从构思到交付全覆盖。吸收了 BMAD 的上游智能（角色协作、产品探索），保留了 STDD 的工程质量闭环（TDD、宪法、证据链），并新增了视觉回归、设计反推、工作流 DSL、沙盒安全和链路追踪。

**最佳路线不是三选一，而是：**

```
BMAD 做上游思考 → STDD Ultra 做全链路落地
      或
直接用 STDD Ultra 一站式覆盖
```

---

*Sources:*
- [BMAD-METHOD GitHub](https://github.com/bmad-code-org/bmad-method)
- [BMAD v6 Token Savings](https://medium.com/@hieutrantrung.it/from-token-hell-to-90-savings-how-bmad-v6-revolutionized-ai-assisted-development-09c175013085)
- [BMAD v6 Architecture Discussion](https://github.com/bmad-code-org/BMAD-METHOD/discussions/979)
- [BMAD Guide - ReDreamality](https://redreamality.com/garden/notes/bmad-method-guide/)
- [Three Spec-Driven AI Tools Comparison](https://ranthebuilder.cloud/blog/i-tested-three-spec-driven-ai-tools-here-s-my-honest-take/)
