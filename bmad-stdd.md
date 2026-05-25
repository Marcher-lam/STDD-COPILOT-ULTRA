# BMAD-METHOD 与 STDD Copilot 全维度对比

> 基于 BMAD-METHOD 公开 README（V6.7.1、BMM/BMB/TEA 等模块体系）与当前 STDD Copilot 状态（v1.0.7，192 suites / 4164 tests，Round 34 + DESIGN.md 增强后）。

一句话结论：

**BMAD-METHOD 更像“AI 敏捷研发组织方法 + 多角色专家协作框架”，STDD Copilot 更像“规格驱动 + TDD + 质量门禁的本地工程控制系统”。**

BMAD 擅长 **规划、角色协作、敏捷流程、跨平台 Agent 生态、模块扩展**。

STDD 擅长 **落地到代码仓库的 CLI 自动化、BDD/TDD 产物、测试证据、Constitution 质量门、变异测试、验证归档**。

---

## 总体定位对比

| 维度 | BMAD-METHOD | STDD Copilot |
|------|-------------|--------------|
| 全称/定位 | Breakthrough Method for Agile AI Driven Development | Specification + Test-Driven Development Copilot CLI |
| 核心目标 | 用 AI 专家角色和敏捷工作流完成从构思到开发的全生命周期协作 | 用文件化规格、TDD、验证证据和质量门控制 AI 编码过程 |
| 本质 | AI 敏捷方法论 + Agent 团队 + 模块生态 | 本地 CLI 工程控制层 + Spec/TDD 执行框架 |
| 主要对象 | 产品经理、架构师、开发者、UX、团队协作用户 | 使用 AI 编码助手的工程项目、代码仓库、开发流程 |
| 强调重点 | Thinking with AI，专家协作，规划深度自适应 | Spec-first，TDD，验证，合规，防跑偏 |
| 使用体验 | 安装模块后，在 AI IDE 里调用 BMAD agents / workflows / skills | 使用 `stdd` CLI 或 `/stdd:*` 斜杠命令推进变更 |
| 典型价值 | 让 AI 像一个敏捷专家团队一样协作 | 让 AI 写代码前后都有可验证工程约束 |

---

## 核心哲学对比

| 维度 | BMAD-METHOD | STDD Copilot |
|------|-------------|--------------|
| 方法论基础 | Agile、产品/架构/开发/测试角色分工 | Spec-first + TDD + BDD + Constitution |
| AI 的角色 | 专家合作者，帮助用户思考、规划、拆解、执行 | 执行者，必须围绕文件化规格和测试证据工作 |
| 用户参与方式 | 与 PM、Architect、Developer、UX 等角色协作 | 在确认门参与，控制需求确认和归档 |
| 需求处理 | 更偏产品/PRD/架构/故事驱动 | 更偏 proposal → BDD spec → tasks → tests |
| 质量观 | 通过专业角色和流程降低风险 | 通过测试、变异、合规检查、证据链强约束 |
| 防跑偏方式 | Agent 流程、角色、工作流、bmad-help 指导 | 确认门、微任务、失败熔断、静态检查、变异审查 |
| 核心隐喻 | AI 敏捷团队 | AI 工程流水线 / 质量门禁系统 |

---

## 生命周期覆盖对比

| 阶段 | BMAD-METHOD | STDD Copilot |
|------|-------------|--------------|
| 构思 | 强，支持 brainstorming、product brief、角色讨论 | 有 `stdd brainstorm`，但更偏工程分析 |
| 产品定义 | 强，PM/PO 角色明显 | 有 `product-proposal`，但不是主轴 |
| UX/设计规划 | 强，含 UX/设计角色 | 中等，当前主打 DESIGN.md 规范生成 |
| 架构设计 | 强，Architect agent 是核心角色之一 | 有 `plan`、ADR、architecture evaluation |
| 敏捷拆分 | 强，story/workflow/epic 等敏捷语义更成熟 | 有 `tasks.md` 微任务拆分，更工程化 |
| 编码实现 | 依赖 AI IDE / Developer agent | `apply/execute` 驱动 Ralph Loop TDD |
| 测试策略 | 新增/增强 TEA Test Architect 模块，偏测试架构 | 内置 TDD、mutation、verify、guard、user-test |
| 验证归档 | 相对偏工作流完成 | 强，`verify` + `archive` 是核心闭环 |
| 后续维护 | 通过模块/agents/workflows 继续协作 | `continue`、`status`、`progress`、`fix-packet`、`archive` |

---

## 安装与运行方式

| 维度 | BMAD-METHOD | STDD Copilot |
|------|-------------|--------------|
| 安装方式 | `npx bmad-method install` | `npm install -g @marcher-lam/stdd-copilot` |
| 非交互安装 | 支持 `--directory`、`--modules`、`--tools`、`--set` | 目前主要是 CLI 使用，配置在 `stdd/config.yaml` |
| Node 要求 | Node.js v20.12+ | Node.js >=20.0.0 |
| Python/uv | 需要 Python 3.10+ 和 uv | 不要求 Python 作为框架运行依赖 |
| 安装目标 | 将 BMAD agents/workflows/skills 安装到项目/AI IDE | 安装 `stdd` CLI，并在项目中 `stdd init` |
| 工具适配 | 强调 Claude Code、Cursor 等跨平台 Agent Team | 支持 Claude Code/Cursor/Windsurf 等，但以 CLI 为稳定核心 |
| 使用入口 | Agent / skill / workflow 调用 | CLI + `/stdd:*` slash command |

---

## 模块化与扩展生态

| 维度 | BMAD-METHOD | STDD Copilot |
|------|-------------|--------------|
| 模块体系 | 很强，官方模块：BMM、BMB、TEA、BMGD、CIS 等 | 有 commands、skills、extensions、graph，但生态规模较小 |
| 自定义能力 | BMad Builder 用于创建自定义 agents/workflows | `stdd extensions`、templates、skills、commands，可扩展但尚未形成同等生态 |
| 领域模块 | 游戏开发、创意智能、测试架构等 | 更偏通用软件工程、TDD、质量治理 |
| 官方生态 | 多仓库、多模块、文档站成熟 | 单仓为主，正在逐步扩展 |
| 社区规模 | GitHub stars/forks 很高，Discord/YouTube/网站完整 | 当前更偏项目内自研框架 |
| 模块成熟度 | V6 已形成模块生态 | v1.0.7，CLI 和测试质量强，但生态层仍早期 |

---

## Agent 能力对比

| 维度 | BMAD-METHOD | STDD Copilot |
|------|-------------|--------------|
| Agent 数量/角色 | 12+ 专家角色，PM、Architect、Developer、UX 等 | 有 12-role simulation、supervisor、roles，但更偏模拟/辅助 |
| Agent 协作 | Party Mode 是核心亮点，多角色同场讨论 | `roles party/review`、`supervisor`、`parallel`，但主轴仍是 CLI 流程 |
| Agent 指导 | `bmad-help` 可询问下一步 | `stdd recommend` / `graph recommend` 推荐下一步 |
| 角色专业化 | 强，角色是 BMAD 核心组织单位 | 中等，角色存在，但工程命令和质量门更核心 |
| Agent 自主推进 | 通过 workflows + help + agents | 通过 `agent-protocol.md`，自然语言触发 Agent-driven flow |
| Human-in-the-loop | 协作式，高频交流 | 确认门式，关键节点暂停 |
| Sub-agent / Cross-platform | BMAD V6 强调增强 | STDD 目前通过 commands/skills/graph 适配，跨平台抽象较轻 |

---

## 工作流能力对比

| 维度 | BMAD-METHOD | STDD Copilot |
|------|-------------|--------------|
| 工作流数量 | README 提到 Core BMM 34+ workflows | 80 command templates + 47 skill templates |
| 工作流类型 | 敏捷、产品、架构、开发、测试、模块化 | init/new/propose/clarify/spec/plan/apply/verify/archive |
| 自适应深度 | Scale-Domain-Adaptive，根据项目复杂度调节规划深度 | 有 complexity/certainty/graph recommend，但规划深度自适应还没 BMAD 成熟 |
| 快速路径 | 依赖对应 workflow / help 推荐 | `ff`、`turbo`、`issue`、`continue` |
| 断点续传 | 工作流上下文依赖 agent/tool 环境 | `progress.jsonl`、`status`、`continue`、`fix-packet` |
| 多项目/Monorepo | 通过模块/工具适配 | `workspace list/validate/repair`、`parallel` |
| DAG/图执行 | 可能通过 workflow orchestration | 明确有 `graph run/visualize/history/recommend/analyze` |

---

## 规格与需求管理

| 维度 | BMAD-METHOD | STDD Copilot |
|------|-------------|--------------|
| 需求表达 | 产品 brief、PRD、stories、architecture docs | proposal.md、BDD `.feature`、tasks.md、design.md |
| 规格格式 | 依赖 workflows/agents 输出 | 文件化规范，`stdd/changes/<name>/specs/` |
| BDD 支持 | 需要具体模块/流程实现 | 内置 `spec`、`pipeline`、`validate`、`user-test` |
| 需求确认 | Agent 协作中确认 | 明确 `confirm` 确认门 |
| 需求归档 | 通过项目文档演进 | `archive` 合并 Delta Spec |
| 漂移检测 | 依赖流程纪律 | Spec Guardian + verify + validate |
| 变更管理 | 敏捷 story/epic/workflow | `stdd/changes/` 文件化生命周期 |

---

## TDD / 测试能力对比

| 维度 | BMAD-METHOD | STDD Copilot |
|------|-------------|--------------|
| 测试战略 | TEA Test Architect 模块，偏风险测试策略和企业测试架构 | 内置 TDD 执行、变异测试、验证门 |
| TDD 闭环 | Dev Loop Automation 在路线中增强 | Ralph Loop: RED → CHECK → GREEN → MUTATION → REFACTOR |
| 测试脚手架 | 依赖模块/agent | `tdd-init`、`outside-in`、`pipeline` |
| BDD 到测试 | 需依赖具体 workflow | `pipeline` 从 specs 生成 IR + acceptance skeleton |
| 变异测试 | 不确定是否内置主流程 | 内置 `mutation`，支持 quick heuristic + Stryker |
| 用户测试 | 依赖产品/UX workflow | `user-test` 生成 human/agent 测试脚本 |
| 测试证据 | 依赖 agent 输出 | `evidence/`、verify reports、mutation evidence |
| 覆盖率治理 | 依赖模块/项目配置 | `guard`、`verify`、coverage parser、Constitution |

---

## 质量治理对比

| 维度 | BMAD-METHOD | STDD Copilot |
|------|-------------|--------------|
| 质量机制 | 专家角色、TEA、敏捷流程、review | 9-Article Constitution + guard + verify |
| 安全检查 | 依赖安全/测试架构模块 | Article 7：secrets、injection、path safety |
| CI/CD | 依赖项目/模块 | Article 9：CI/CD 自动检查 |
| 代码风格 | 角色/流程指导 | Article 4 + lint |
| 小提交 | 敏捷最佳实践 | Article 3 + commit/commit-msg/commit-tdd |
| 文档治理 | 文档是流程输出 | Article 5 + final-doc + docs tests |
| 自动修复 | 取决于 workflow | `constitution fix --dry-run` |
| 豁免机制 | 不确定 | `constitution waive --reason --days` |
| 健康评分 | 不一定统一 | `constitution status` 评分面板 |

---

## 前端 / UI / 设计能力对比

| 维度 | BMAD-METHOD | STDD Copilot |
|------|-------------|--------------|
| UX 角色 | 强，BMAD 有 UX/产品角色协作 | 有设计命令，但 UX 角色不是核心主线 |
| DESIGN.md | 不确定是否核心 | 已增强，参考 awesome-design-md / Stitch 结构 |
| 设计系统生成 | 依赖 agent/workflow | `stdd design create/update/check/list` |
| 设计预设 | 取决于模块/agent | `modern`、`dark`、`minimal` |
| 视觉预览 | BMAD 网站/文档生态强 | 新增 `preview.html`、`preview-dark.html` |
| UI 页面生成 | 依赖 Developer/UX agent | 尚无 `stdd ui/page/component` 命令 |
| 视觉回归 | 不确定 | 尚未完整实现，但有 `browser snapshot` 基础 |
| 浏览器驱动 | 不一定是主轴 | `stdd browser snapshot/inspect/doctor` |
| 前端测试 | TEA 可规划测试策略 | 尚未完整 RTL/Storybook/Playwright 自动闭环 |
| 现有 UI 反推设计系统 | 不确定 | 尚未实现，已列为 P2 |

结论：**BMAD 在 UX 协作角色层面更强，STDD 在 DESIGN.md 文件化规范和可验证 CLI 能力上更具体。**

---

## 文档与产物对比

| 维度 | BMAD-METHOD | STDD Copilot |
|------|-------------|--------------|
| 文档站 | 很强，有 docs.bmad-method.org | 有 docs/、README、ARCHITECTURE，但站点化较弱 |
| 教程 | Getting Started、upgrade、roadmap、模块文档 | getting-started、cli-guide、command-reference、workflows |
| 产物结构 | agents/workflows/modules 产物 | `proposal.md`、`.feature`、`tasks.md`、`design.md`、`evidence` |
| 产品文档 | 强，产品/PRD/brief 是核心 | 有 `product-proposal`、`final-doc` |
| 架构文档 | 强，Architect agent | `ARCHITECTURE.md` + plan/ADR |
| 测试文档 | TEA 模块强化 | `user-test-*`、verify reports、mutation evidence |
| 文档一致性测试 | 不确定 | 已有 docs consistency tests |
| 文档语言 | 英文、中文、越南语等 | 中文、英文，当前主文档为中英双 README |

---

## CLI 与工程实现对比

| 维度 | BMAD-METHOD | STDD Copilot |
|------|-------------|--------------|
| 包名 | `bmad-method` | `@marcher-lam/stdd-copilot` |
| CLI 成熟度 | 安装器/模块管理强 | 75 命令实现，CLI 面更广 |
| 命令数量 | workflow/agent/installer 为主 | 75 CLI commands + 80 slash templates |
| 测试数量 | 未从 README 中获取准确数量 | 192 suites / 4164 tests 当前全绿 |
| 代码覆盖率 | 未从 README 中获取准确数据 | ~97% stmts / ~93% branch |
| 本地文件结构 | 安装 agent/workflow 文件 | 明确 `stdd/` runtime directory |
| 命令注册 | BMAD 自身 CLI/installer | Commander.js + CommandLoader + registry |
| 运行证据 | 取决于 workflow | evidence、reports、progress.jsonl |
| 浏览器/Playwright | 不确定 | 有 browser command |
| SudoLang | 不确定 | 有 runtime sudo parser/executor |

---

## 可扩展性对比

| 维度 | BMAD-METHOD | STDD Copilot |
|------|-------------|--------------|
| 自定义 Agent | BMad Builder 专门支持 | `roles/supervisor` 支持模拟，但 builder 不如 BMAD 成熟 |
| 自定义 Workflow | 强，模块生态核心 | Skill Graph + templates 支持，但生态小 |
| 自定义 Command | 需要 BMAD 模块体系 | 代码层通过 command class + registry |
| 自定义 Skill | Skills Architecture | 47 skill templates 已存在 |
| 官方模块 | BMM/BMB/TEA/BMGD/CIS | 目前是单体 STDD capabilities |
| 外部工具适配 | 安装时选择 tools | AI engine registry + adapters |
| 社区贡献路径 | 成熟，CONTRIBUTING、Discord、网站 | 有 CONTRIBUTING，但社区规模较小 |

---

## 企业/团队适配对比

| 维度 | BMAD-METHOD | STDD Copilot |
|------|-------------|--------------|
| 企业复杂项目 | Scale-domain adaptive，强 | 能做，但更偏代码仓库级控制 |
| 团队角色协作 | 强，12+ domain experts | 有 roles/supervisor，但主线不是组织协作 |
| 流程治理 | 敏捷工作流治理 | 工程质量门治理 |
| 审计能力 | 不确定，依赖模块 | `audit`、`constitution audit`、evidence |
| CI/CD | 可通过 workflow/模块规划 | `ci` 命令 + Article 9 |
| 合规策略 | 角色/流程层 | Constitution 条文化 |
| 产物可追溯 | 有 docs/workflows | 更强，文件化 changes/specs/evidence/archive |

---

## 复杂度自适应对比

| 维度 | BMAD-METHOD | STDD Copilot |
|------|-------------|--------------|
| 自适应规划深度 | README 明确强调 Scale-Domain-Adaptive | 有 complexity/certainty，但不如 BMAD 作为核心卖点 |
| Bug fix vs Enterprise | 自动调整 planning depth | 通过 `issue`、`ff`、`turbo`、`graph intent` 区分 |
| 用户水平适配 | 安装配置支持 `user_skill_level` | 暂无明确用户水平配置 |
| 项目知识深度 | 安装配置支持 `project_knowledge` | 有 memory/context/explore，但配置语义不同 |
| 推荐下一步 | `bmad-help` | `stdd recommend` / `graph recommend` |
| 自动暂停策略 | workflows/agent 协作 | confirmation gate + certainty threshold |

---

## AI IDE 适配对比

| 维度 | BMAD-METHOD | STDD Copilot |
|------|-------------|--------------|
| Claude Code | 强支持 | 支持 |
| Cursor | 支持 | 支持 |
| Windsurf | 支持倾向 | 支持 |
| Augment | 仓库有 `.augment` | 配置里列为新兴/实验性 |
| Cross Platform Agent Team | V6 重点增强方向 | 尚不是核心成熟能力 |
| Slash Commands | 通过安装生成工具侧命令 | 80 `/stdd:*` templates |
| Skills | Skills Architecture | 47 skill templates |
| Help Agent | `bmad-help` | `stdd help` / `recommend` |
| Agent 文件布局 | 安装器生成 | `.claude/commands`、`.claude/skills`、AGENTS.md 生成 |

---

## 前端 Web Dashboard 对比

| 维度 | BMAD-METHOD | STDD Copilot |
|------|-------------|--------------|
| 官网/文档站 | 有成熟网站/文档站 | 暂无 STDD Web UI Dashboard |
| 项目内 Dashboard | 未从 README 确认 | 未实现，已列为 P1 |
| 指标可视化 | 可能在网站/模块层 | CLI `metrics`，尚无浏览器仪表盘 |
| 进度可视化 | workflows/agent 输出 | `progress.jsonl` + CLI summary |
| Graph 可视化 | 不确定 | `stdd graph visualize` |
| 质量面板 | 不确定 | `constitution status` CLI |

---

## 安全与合规对比

| 维度 | BMAD-METHOD | STDD Copilot |
|------|-------------|--------------|
| Security policy | 仓库有 SECURITY.md | 有 security utils + Article 7 |
| 密钥扫描 | 不确定 | 内置 secrets 检测 |
| 路径安全 | 不确定 | `security.js` + safe path |
| npm audit | 不确定 | `npm run premerge` 包含 `npm audit --audit-level=high` |
| 合规条款 | 不确定 | 9-Article Constitution |
| 豁免 | 不确定 | WaiverManager |
| 审计历史 | 不确定 | `audit` / `constitution audit` |

---

## 当前成熟度判断

| 维度 | BMAD-METHOD | STDD Copilot |
|------|-------------|--------------|
| 社区成熟度 | 更高，47.9k stars，5.6k forks，Discord/YouTube/网站完整 | 较早期，工程测试成熟但社区生态较小 |
| 产品完整度 | 方法论生态完整 | CLI 工程闭环完整 |
| 文档成熟度 | 更成熟，有 docs site | 本地文档完整，站点化弱 |
| 测试透明度 | README 未显示详细覆盖率 | 当前 192 suites / 4164 tests |
| 模块生态 | 更成熟 | 正在形成 |
| 本地工程强约束 | 中等 | 强 |
| Agent 协作体验 | 强 | 中等 |
| TDD/验证闭环 | 中等到强，取决于 TEA/Dev Loop | 强 |
| UI/设计能力 | UX agent 方向强 | DESIGN.md 方向已增强，但 UI 生成未完成 |

---

## 哪些场景更适合 BMAD

| 场景 | 原因 |
|------|------|
| 从产品想法开始，需要 PM/UX/Architect 多角色协作 | BMAD 的专家角色和 facilitated workflows 更自然 |
| 团队希望 AI 像敏捷团队一样参与规划 | BMAD 的角色协作和 Party Mode 更强 |
| 项目规模不确定，需要自适应规划深度 | BMAD 明确强调 Scale-Domain-Adaptive |
| 希望扩展自定义 Agent 和 workflow | BMad Builder 是明确的官方模块 |
| 需要加入已有成熟社区和教程体系 | BMAD 社区、网站、文档更强 |
| 游戏开发、创意智能、测试架构等垂直模块 | BMAD 有官方模块生态 |

---

## 哪些场景更适合 STDD

| 场景 | 原因 |
|------|------|
| 已经有代码仓库，需要强约束 AI 不跑偏 | STDD 的文件化 changes/specs/tasks/evidence 更适合 |
| 团队强调 TDD、BDD、变异测试 | STDD 是 Spec + TDD 原生设计 |
| 需要明确质量门和合规检查 | Constitution、guard、verify、waiver、audit 更具体 |
| 需要可追溯的变更生命周期 | `new → spec → plan → apply → verify → archive` 文件链路完整 |
| 需要本地 CLI 自动化 | 75 个 CLI commands 覆盖面大 |
| 需要证据链和断点续传 | evidence、progress.jsonl、fix-packet |
| 想用 DESIGN.md 规范 AI 生成前端 UI | STDD 已增强 DESIGN.md + preview 生成 |
| Monorepo 需要 workspace/parallel 支撑 | `workspace`、`parallel` 已有 |

---

## 两者可以如何结合

最佳组合不是二选一，而是分层：

| 层级 | 推荐工具 | 作用 |
|------|----------|------|
| 产品构思 / 多角色讨论 | BMAD | 用 PM/UX/Architect/Developer 等 Agent 充分探索方案 |
| PRD / Architecture / Story 初稿 | BMAD | 形成高质量产品和架构输入 |
| 进入代码仓库后的执行闭环 | STDD | 将方案转为 proposal/spec/tasks/tests/evidence |
| TDD 实现 | STDD | `apply/execute` 驱动 Ralph Loop |
| 质量门禁 | STDD | `guard/verify/constitution/mutation` |
| 归档与追溯 | STDD | `archive/final-doc/audit` |
| 前端视觉规范 | STDD + awesome-design-md | `stdd design create` 生成 DESIGN.md 与 preview |
| 专项测试架构 | BMAD TEA + STDD verify | TEA 制定策略，STDD 执行验证与证据归档 |

推荐流程：

```text
BMAD: brainstorm / PM / Architect / UX
  ↓
输出产品 brief、架构方案、故事/任务候选
  ↓
STDD: new/propose/clarify/confirm
  ↓
STDD: spec/plan
  ↓
STDD: apply/verify/mutation/constitution
  ↓
STDD: archive/final-doc/audit
```

---

## STDD 相对 BMAD 的短板

| 短板 | 当前状态 | 建议 |
|------|----------|------|
| Agent 角色生态不如 BMAD 成熟 | 有 roles/supervisor，但不是核心体验 | 增强 PM/Architect/UX/QA agent templates |
| 模块市场/官方模块生态较弱 | 单体能力多，模块生态小 | 建立 `stdd modules` 或 extensions registry |
| 文档站和教程不如 BMAD 成熟 | README/docs 完整，但站点化弱 | 建 Web docs site |
| 复杂度自适应不够产品化 | 有 complexity/certainty，但未形成统一体验 | 引入 planning depth profiles |
| 自定义 agent/workflow builder 缺失 | 只能通过模板/代码扩展 | 做 `stdd builder` |
| Web UI Dashboard 未实现 | 已列 P1 | 做 Dashboard 展示 changes/tasks/evidence |
| UI 页面生成器缺失 | 只有 DESIGN.md | 增加 `stdd ui/page/component` |

---

## BMAD 相对 STDD 的短板

| 短板 | 当前状态 | STDD 优势 |
|------|----------|-----------|
| 文件化工程闭环不如 STDD 明确 | BMAD 更偏工作流/Agent 协作 | STDD `stdd/changes` 是明确事实源 |
| TDD 强约束不如 STDD 原生 | 有测试架构模块，但不是核心 CLI 闭环 | STDD 内置 Ralph Loop |
| 变异测试与假绿灯防护不如 STDD 明确 | 未从 README 看到类似 mutation gate | STDD 有 mutation + anti-fake-green |
| Constitution 质量条款不如 STDD 明确 | 更偏方法论和角色 | STDD 有 9 条工程宪法 |
| 本地 CLI 工程命令面不如 STDD 宽 | BMAD 更偏安装/模块/workflows | STDD 75 CLI commands |
| 证据归档不如 STDD 强 | 取决于 workflow | STDD evidence/fix-packet/final-doc |
| Brownfield 代码仓库治理不如 STDD 文件化 | BMAD 可做，但主轴不同 | STDD 明确 Brownfield 读取/报告/初始化流程 |

---

## 总评分（主观工程视角）

| 维度 | BMAD-METHOD | STDD Copilot |
|------|-------------|--------------|
| 产品/需求探索 | 9/10 | 7/10 |
| 多 Agent 协作 | 9/10 | 7/10 |
| 敏捷方法论完整度 | 9/10 | 7/10 |
| 代码仓库级执行控制 | 7/10 | 9/10 |
| Spec-first 强度 | 8/10 | 9/10 |
| TDD 强度 | 7/10 | 10/10 |
| 测试证据链 | 7/10 | 9/10 |
| 质量门禁 | 7/10 | 10/10 |
| 模块生态 | 9/10 | 6/10 |
| 文档/社区 | 9/10 | 7/10 |
| CLI 命令覆盖面 | 7/10 | 9/10 |
| 前端设计规范 | 7/10 | 8/10 |
| Web Dashboard | 8/10（网站/文档强） | 4/10（项目 Dashboard 未实现） |
| 企业治理 | 8/10 | 8/10 |
| 可验证工程落地 | 7/10 | 9/10 |

---

## 最终结论

**BMAD-METHOD 是更成熟的 AI Agile Method 生态。**

它的强项是角色协作、敏捷流程、模块生态、社区、文档站、自适应规划。它适合在需求、产品、架构、团队协作层面把 AI 当成专家团队使用。

**STDD Copilot 是更工程化的 Spec/TDD 控制系统。**

它的强项是本地 CLI、文件化产物、BDD、TDD、变异测试、Constitution、证据链、验证归档。它适合把 AI 的输出落到真实代码仓库，并用测试和质量门约束交付。

**最佳路线：BMAD 做上游思考，STDD 做下游落地。**

BMAD 负责“想清楚要做什么、怎么做、谁来做”。

STDD 负责“把它变成规格、测试、代码、证据、归档”。
