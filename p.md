# STDD Copilot Ultra — 完整项目模拟测试文档

> 本文档模拟一个真实项目从零到交付的完整过程，覆盖 STDD Copilot Ultra 全部命令。
> 测试环境：Claude Code CLI + STDD Copilot Ultra v2.1.0
> 模拟项目：TaskFlow — 一个轻量级任务管理 Web 应用

---

## 0. 环境准备

```bash
# 安装 STDD Copilot Ultra
npm install -g @marcher-lam/stdd-copilot-ultra@latest

# 验证安装
stdd --version
# 预期输出: 2.1.0

# 创建项目目录
mkdir taskflow && cd taskflow
npm init -y
npm install express react react-dom
npm install -D jest
```

---

## Phase 0: 项目初始化与环境诊断

### `stdd doctor` — 环境健康检查

```
> stdd doctor
```

**预期行为：**
- 检查 Node.js 版本（≥20.0.0）
- 检查 npm/yarn/pnpm 可用性
- 检查 Playwright 浏览器依赖（可选）
- 输出每个检查项的 PASS/FAIL 状态

**验证点：** 全部 PASS 或仅有 Playwright 警告（可选依赖）。

### `stdd init` — 初始化 STDD 项目骨架

```
> stdd init
```

**预期行为：**
- 交互式询问项目类型（web）、语言（javascript）、框架（react）
- 创建 `stdd/` 目录结构：
  ```
  stdd/
  ├── config.yaml
  ├── config/
  ├── changes/
  ├── evidence/
  ├── graph/
  │   ├── config.json
  │   ├── conditions.json
  │   └── skills.yaml
  ├── memory/
  ├── specs/
  ├── templates/
  ├── presets/
  ├── runtime/
  ├── logs/
  ├── reports/
  └── progress.jsonl
  ```

**验证点：** `stdd/config.yaml` 存在且包含正确的项目类型和语言配置。

### `stdd update` — 更新配置（如有必要）

```
> stdd update
```

**预期行为：** 重新检测技术栈，同步更新 `stdd/config.yaml`。

### `stdd list` — 列出当前变更

```
> stdd list
```

**预期行为：** 输出空列表（尚未创建任何变更）。

### `stdd status` — 查看项目状态

```
> stdd status
```

**预期行为：** 显示项目初始化状态、当前无活跃变更。

### `stdd progress` — 查看进度日志

```
> stdd progress
```

**预期行为：** 显示最近的 progress.jsonl 条目。

---

## Phase 1: 探索与构思（上游智能）

### `stdd explore` — 深度阅读项目代码

```
> stdd explore src/
```

**预期行为：**
- 扫描 `src/` 目录下的所有源文件
- 生成项目理解报告：模块依赖、技术栈、入口文件
- 保存到 `stdd/memory/`

### `stdd explore full` — 全量探索

```
> stdd explore full
```

**预期行为：** 完整项目扫描，包括测试文件、配置文件。

### `stdd roles list` — 列出可用 AI 角色

```
> stdd roles list
```

**预期行为：** 输出所有预定义角色（PM、Architect、Developer、QA、UX 等）及其职责描述。

### `stdd roles party` — 启动多角色讨论

```
> stdd roles party --topic "TaskFlow 的核心功能范围" --roles po,arch,dev,qa
```

**预期行为：**
- 多个 AI 角色轮流发言
- 每轮生成结构化分析
- 最终收敛为产品方案摘要

### `stdd brainstorm` — 创意探索

```
> stdd brainstorm "任务管理应用的核心功能设计"
```

**预期行为：**
- 生成多维度创意方案
- 输出结构化的头脑风暴结果
- 保存到 `stdd/drafts/`

### `stdd vision create` — 创建产品愿景

```
> stdd vision create
```

**预期行为：** 生成产品愿景文档，包含目标用户、核心价值、差异化。

### `stdd profile assess` — 技术画像评估

```
> stdd profile assess
```

**预期行为：** 分析项目技术栈，生成技术画像报告。

### `stdd product-proposal` — 生成产品提案

```
> stdd product-proposal
```

**预期行为：**
- 生成结构化产品提案文档
- 包含市场分析、用户场景、功能清单
- 支持 `--json` 输出

---

## Phase 2: 需求与规格（Spec-First）

### `stdd new change add-task-crud` — 创建变更

```
> stdd new change add-task-crud
```

**预期行为：**
- 创建 `stdd/changes/add-task-crud/` 目录
- 生成 `proposal.md`（提案模板）
- 生成 `.status.yaml`（状态追踪）

### `stdd propose` — 需求提案

```
> stdd propose "实现任务的增删改查功能，包括 RESTful API 和前端列表页"
```

**预期行为：**
- 生成结构化需求提案
- 自动检测是否为过大的 Epic，如果是则建议拆分
- 保存提案内容到变更目录

### `stdd clarify` — 需求澄清

```
> stdd clarify add-task-crud
```

**预期行为：**
- 启动 78 种结构化推理方法
- 多轮交互消除需求歧义
- 生成 `clarification.json`

### `stdd confirm` — 需求确认（确认门 ⚠️）

```
> stdd confirm add-task-crud
```

**预期行为：**
- 展示完整的需求理解摘要
- **等待用户确认**后才继续
- 确认通过后状态推进到 `confirmed`

### `stdd certainty assess` — 置信度评估

```
> stdd certainty assess --scores "req:4,tech:5,scope:4,test:3,perf:4"
```

**预期行为：**
- 5 维度置信度评分（需求/技术/范围/测试/性能）
- 输出总置信度和建议

### `stdd spec` — 生成 BDD 规格

```
> stdd spec add-task-crud
```

**预期行为：**
- 根据 proposal + clarification 生成 `.feature` BDD 文件
- Given/When/Then 格式的行为规格
- 保存到 `stdd/specs/features/` 和 `stdd/specs/scenarios/`

### `stdd api-spec` — API 规格先行

```
> stdd api-spec add-task-crud
```

**预期行为：**
- 生成 OpenAPI/Swagger 规范
- 保存到 `stdd/specs/openapi.yaml`
- 仅当项目配置了 `has_api: true` 时触发

### `stdd schema` — 类型/数据模型规格

```
> stdd schema
```

**预期行为：**
- 分析数据模型需求
- 生成类型定义文件

### `stdd contract create` — 契约测试定义

```
> stdd contract create --consumer web-frontend --provider task-api
```

**预期行为：**
- 创建消费者-提供者契约
- 保存到 `stdd/contracts/`

### `stdd plan` — 任务拆解

```
> stdd plan add-task-crud
```

**预期行为：**
- 将规格拆解为 5-6 个微任务（每个约 30 分钟）
- 生成 `tasks.md`（任务清单）
- 生成 `design.md`（设计文档）
- 生成 ADR（架构决策记录）

### `stdd prp` — 结构化规划

```
> stdd prp "Task CRUD with validation"
```

**预期行为：** 生成 PRP（Plan-Refine-Prototype）结构化规划文档。

---

## Phase 3: 设计系统与前端准备

### `stdd design create` — 创建设计系统

```
> stdd design create --preset modern
```

**预期行为：**
- 生成 `DESIGN.md`（完整设计系统文档）
- 生成 `preview.html` 和 `preview-dark.html`（设计预览页）
- 包含颜色、排版、间距、组件样式、响应式规则

### `stdd design list` — 列出设计预设

```
> stdd design list
```

**预期行为：** 输出 modern / dark / minimal 三种预设。

### `stdd design check` — 检查设计文档完整性

```
> stdd design check
```

**预期行为：** 9 项检查（Colors/Typography/Spacing/Radius/Components/Elevation/Responsive/Prompt Guide/CSS Variables），输出评分。

### `stdd design show` — 查看设计文档

```
> stdd design show
```

**预期行为：** 输出 DESIGN.md 完整内容。

### `stdd design update` — 更新设计预设

```
> stdd design update --preset dark
```

**预期行为：** 用 dark 预设覆盖 DESIGN.md。

### `stdd design reverse-scan` — 反向扫描项目样式

```
> stdd design reverse-scan --dir src/
```

**预期行为：**
- 扫描 `src/` 下所有 `.css`、`.scss` 文件
- 提取 CSS 变量、颜色、字体、border-radius、shadow
- 扫描 `tailwind.config.js`（如存在）
- 从提取的 token 重新生成 DESIGN.md

```
> stdd design reverse-scan --dry-run
```

**预期行为：** 预览输出但不写文件。

```
> stdd design reverse-scan --output stdd/CUSTOM_DESIGN.md
```

**预期行为：** 写入自定义路径。

### `stdd ui page` — 生成前端页面

```
> stdd ui page dashboard --framework react
```

**预期行为：**
- 基于 DESIGN.md 生成 React 页面组件
- 使用设计 token（颜色、间距、排版）

### `stdd ui component` — 生成 UI 组件

```
> stdd ui component TaskList --type list --framework react
```

**预期行为：** 生成 React 列表组件，遵循设计系统。

### `stdd ui scaffold` — 脚手架生成

```
> stdd ui scaffold
```

**预期行为：** 生成完整前端应用脚手架。

### `stdd ui preview` — 组件预览

```
> stdd ui preview
```

**预期行为：** 生成组件预览画廊 HTML。

### `stdd ui list` — 列出生成的 UI 产物

```
> stdd ui list
```

**预期行为：** 列出所有由 `stdd ui` 生成的文件。

---

## Phase 4: TDD 执行与实现

### `stdd tdd-init` — 初始化 TDD 配置

```
> stdd tdd-init
```

**预期行为：** 创建 TDD 配置文件，设置测试框架。

### `stdd apply` — 执行 TDD 循环

```
> stdd apply add-task-crud
```

**预期行为：**
- Ralph Loop 闭环：红灯 → 检查 → 绿灯 → 变异 → 重构
- 逐个执行 `tasks.md` 中的微任务
- 每个任务完成后自动运行测试验证

### `stdd apply --phase red` — 指定 TDD 阶段

```
> stdd apply add-task-crud --phase red
```

**预期行为：** 只执行红灯阶段（写失败测试）。

### `stdd outside-in` — 外向内 TDD

```
> stdd outside-in start add-task-crud
```

**预期行为：**
- 分层测试骨架（API → Service → Repository）
- 生成 `stdd/tdd-registry.yaml`

### `stdd mock create` — Mock 生成

```
> stdd mock create src/services/TaskService.js
```

**预期行为：** 自动生成 Mock 文件到 `src/__mocks__/`。

### `stdd mock-gen` — Mock 代码生成

```
> stdd mock-gen src/services/
```

**预期行为：** 批量生成服务层 Mock。

### `stdd factory create` — 测试数据工厂

```
> stdd factory create Task
```

**预期行为：** 生成测试数据工厂文件到 `src/__tests__/factories/`。

### `stdd commit` — 原子化提交

```
> stdd commit add-task-crud
```

**预期行为：**
- 将变更拆解为原子化 git commits
- 每个 commit 对应一个逻辑变更单元

### `stdd commit-msg` — 生成提交信息

```
> stdd commit-msg add-task-crud
```

**预期行为：** 根据 tasks.md 和实际变更生成规范的 commit message。

### `stdd commit-tdd` — TDD 模式提交

```
> stdd commit-tdd red add-task-crud
```

**预期行为：** 按 TDD 阶段提交（red/green/refactor）。

### `stdd continue` — 断点续传

```
> stdd continue add-task-crud
```

**预期行为：**
- 读取 progress.jsonl 找到最后未完成的步骤
- 从断点继续执行

### `stdd baby-steps` — 微步骤引导

```
> stdd baby-steps "实现 Task 模型的 CRUD API"
```

**预期行为：** 将任务拆解为更细粒度的微步骤，逐步引导实现。

### `stdd iterate` — 迭代执行

```
> stdd iterate start
```

**预期行为：** 启动自主迭代循环，自动推进直到完成或遇到确认门。

---

## Phase 5: 质量验证与门禁

### `stdd verify` — 全量验证

```
> stdd verify add-task-crud
```

**预期行为：**
- 1) Tasks 检查：所有 tasks.md 任务已完成
- 2) Tests 检查：运行测试套件（jest）
- 3) Constitution 检查：9 条宪法条例合规
- 4) Visual Constitution Gate：如配置了视觉检测路由，自动截图对比
- 5) Lint 检查（需 `--lint`）
- 输出结构化验证报告
- 保存证据到 `stdd/changes/add-task-crud/evidence/`

### `stdd verify --lint` — 含 Lint 检查

```
> stdd verify add-task-crud --lint
```

**预期行为：** 额外运行 `npm run lint`，lint 失败则 verify 整体失败。

### `stdd verify --no-constitution` — 跳过宪法检查

```
> stdd verify add-task-crud --no-constitution
```

**预期行为：** 跳过 Constitution 检查，只验 tasks 和 tests。

### `stdd mutation` — 变异测试

```
> stdd mutation add-task-crud
```

**预期行为：**
- 运行变异测试（Quick Heuristic 或 Stryker）
- 计算变异得分
- 检测假绿灯
- 保存报告到 `stdd/reports/mutation.html`

### `stdd validate` — 规格验证

```
> stdd validate add-task-crud
```

**预期行为：**
- 验证实现代码是否与 BDD 规格（`.feature` 文件）一致
- 输出验证结果

### `stdd guard` — TDD 守护钩子

```
> stdd guard
```

**预期行为：** 检查最近的代码变更是否遵循 TDD 流程（先有测试）。

### `stdd metrics` — 质量指标

```
> stdd metrics add-task-crud
```

**预期行为：**
- 输出变更维度指标（复杂度、覆盖率、规格对齐度等）
- 生成质量仪表板数据

### `stdd audit` — 项目审计

```
> stdd audit
```

**预期行为：**
- 全项目范围的质量审计
- 检查：测试覆盖率、代码质量、依赖安全性、文档一致性
- 输出结构化审计报告

### `stdd depcheck` — 依赖检查

```
> stdd depcheck src/
```

**预期行为：**
- 扫描未使用依赖
- 检查过时依赖
- 检测安全漏洞

### `stdd complexity` — 代码复杂度分析

```
> stdd complexity analyze src/
```

**预期行为：**
- 计算圈复杂度
- 标记高复杂度函数
- 建议重构点

### `stdd constitution` — 宪法检查

```
> stdd constitution check
```

**预期行为：**
- 逐条检查 9 条 Constitution 条例
- 输出 blocking / warning / info 分级

```
> stdd constitution show 1
```

**预期行为：** 显示第 1 条宪法（Library First）的详细内容。

### `stdd constitution-status` — 宪法状态

```
> stdd constitution-status
```

**预期行为：** 输出每条宪法的当前合规状态。

### `stdd waiver-manager` — 豁免管理

```
> stdd waiver-manager list
```

**预期行为：** 列出所有已批准的豁免。

```
> stdd waiver-manager create --article 3 --reason "Legacy code, scheduled for Q3 refactor"
```

**预期行为：** 为第 3 条宪法创建豁免。

### `stdd fix-packet` — 失败修复上下文

```
> stdd fix-packet add-task-crud
```

**预期行为：**
- 收集失败上下文（tasks、specs、evidence）
- 生成修复建议包
- 保存到 `stdd/changes/add-task-crud/evidence/fix-packet-*.md`

---

## Phase 6: 视觉回归测试（Phase 1 新增）

### `stdd browser snapshot` — 页面截图

```
> stdd browser snapshot http://localhost:3000
```

**预期行为：**
- 启动 Playwright headless 浏览器
- 截取 1280×800 视口截图
- 保存到 `stdd/evidence/browser-snapshot-*.png`

### `stdd browser inspect` — 页面检查

```
> stdd browser inspect http://localhost:3000
```

**预期行为：** 输出页面标题和 HTTP 状态码，不截图。

### `stdd browser compare` — 视觉回归比对

```
> stdd browser compare http://localhost:3000 --name homepage --threshold 0.01
```

**预期行为：**
- 首次运行：无 baseline，自动保存当前截图为 baseline
- 后续运行：与 baseline 像素级对比，计算 diff ratio
- diff > 1% 则 FAIL，输出 diff 图像到 `stdd/evidence/visual/diffs/`

### `stdd browser update-baseline` — 更新基线

```
> stdd browser update-baseline http://localhost:3000 --name homepage
```

**预期行为：** 重新截图并覆盖 `stdd/evidence/visual/baselines/homepage-baseline.png`。

### `stdd browser doctor` — 浏览器依赖诊断

```
> stdd browser doctor --json
```

**预期行为：** JSON 格式输出 Playwright 和 Chromium 的安装状态。

### Visual Constitution Gate 配置

在 `stdd/config.yaml` 中启用：

```yaml
defense:
  visual_regression:
    enabled: true
    threshold: 0.01
    routes:
      - url: http://localhost:3000
        name: homepage
      - url: http://localhost:3000/tasks
        name: task-list
    auto_baseline: true
```

启用后 `stdd verify` 会自动触发视觉检测。

---

## Phase 7: 上下文与工作流

### `stdd context` — 三层文档架构

```
> stdd context foundation
```

**预期行为：** 输出基础层上下文（项目结构、技术栈）。

```
> stdd context specification
```

**预期行为：** 输出规格层上下文（BDD features、API specs）。

```
> stdd context implementation
```

**预期行为：** 输出实现层上下文（源代码、测试）。

### `stdd context distill` — 上下文蒸馏

压缩长上下文为精炼摘要。

### `stdd context shard` — 上下文分片

将大文件拆分为可管理的小片段。

### `stdd graph` — Skill Graph 可视化

```
> stdd graph
```

**预期行为：** 输出 Mermaid 格式的 Skill Graph DAG。

### `stdd graph run` — 执行 Graph 意图

```
> stdd graph run feature
```

**预期行为：**
- 编译 `feature` 意图的 Skill Graph
- 按 DAG 拓扑顺序执行节点
- 在确认门暂停等待用户

### `stdd graph-history` — Graph 执行历史

```
> stdd graph-history list
```

**预期行为：** 列出历史 Graph 运行记录。

```
> stdd graph-history show <id>
```

**预期行为：** 显示特定运行的详细结果。

### `stdd recommend` — 智能推荐

```
> stdd recommend
```

**预期行为：** 根据当前项目状态推荐下一步操作。

### `stdd pipeline` — 流水线

```
> stdd pipeline add-task-crud
```

**预期行为：** 将多个步骤组合为流水线执行。

### `stdd user-test` — 前端测试生成

```
> stdd user-test add-task-crud --framework react
```

**预期行为：** 根据 BDD `.feature` 文件自动生成 React Testing Library 测试桩。

### `stdd story` — Story 驱动开发

```
> stdd story create TaskList
```

**预期行为：** 创建 UI Story 文件。

```
> stdd story list
```

**预期行为：** 列出所有 Story。

### `stdd codegraph` — 代码图谱

```
> stdd codegraph scan
```

**预期行为：** 扫描源码生成调用关系图谱。

```
> stdd codegraph visualize
```

**预期行为：** 输出可视化 HTML。

---

## Phase 8: 运行时与 Agent 系统

### `stdd runtime` — 运行时信息

```
> stdd runtime
```

**预期行为：** 显示 STDD 运行时状态（Agent 模拟器、Graph 引擎等）。

### `stdd agent` — Agent 模拟器

```
> stdd agent start "讨论 TaskFlow 的认证方案"
```

**预期行为：** 启动多 Agent 模拟讨论，多个角色轮流发言。

```
> stdd agent next
```

**预期行为：** 推进到下一个 Agent 发言。

```
> stdd agent status
```

**预期行为：** 显示当前模拟器状态（active/completed）。

```
> stdd agent stop
```

**预期行为：** 终止模拟。

### Agent 辩论模式（Phase 3 新增）

```
> stdd agent debate "是否使用 GraphQL 替代 REST" --rounds 2
```

**预期行为：**
- 启动 AI 驱动的多角色辩论
- PM/Architect/Dev/QA 从各自视角分析
- 自动收敛为产品方案
- 输出 convergence score 和 action items

### `stdd roles party` — Party Mode

```
> stdd roles party --topic "微服务拆分策略"
```

**预期行为：** 类似 agent，但使用 PartyOrchestrator 编排，支持收敛检测。

### `stdd supervisor` — 多 Agent 协调器

```
> stdd supervisor start --agents 3
```

**预期行为：** 启动 Supervisor 模式协调多个 Agent 并行工作。

### `stdd sudo run` — SudoLang 执行

```
> stdd sudo run workflow.sudo
```

**预期行为：** 解析并执行 SudoLang 工作流文件。

---

## Phase 9: 工作流 DSL（Phase 3 新增）

### Workflow YAML 定义

在 `stdd/workflows/` 目录下创建自定义工作流：

```yaml
# stdd/workflows/deploy.yaml
name: deploy-pipeline
steps:
  - id: test
    description: Run full test suite
    phase: verify
    timeout: 300
  - id: lint
    description: Lint check
    phase: verify
    depends_on: [test]
  - id: build
    description: Production build
    phase: execute
    depends_on: [lint]
    outputs: ["dist/"]
  - id: deploy
    description: Deploy to staging
    phase: deploy
    depends_on: [build]
    gate: human_approval
```

### Workflow 解析与编译

```javascript
const { WorkflowDslInterpreter } = require('./src/utils/workflow-dsl-interpreter');
const interp = new WorkflowDslInterpreter(process.cwd());
const workflow = interp.loadWorkflow('deploy');
const dag = interp.compileDAG(workflow);

console.log(dag.sorted);     // ['test', 'lint', 'build', 'deploy']
console.log(dag.layers);     // [['test'], ['lint'], ['build'], ['deploy']]
console.log(dag.hasCycle);   // false
```

### Workflow 验证

```javascript
const result = interp.validate(workflow);
console.log(result.valid);   // true
console.log(result.errors);  // []
```

---

## Phase 10: 沙盒与 Trace（Phase 4 新增）

### Sandbox 模式

```javascript
const { runCommand } = require('./src/utils/command-runner');

// 正常运行
runCommand('node test.js');  // ✓ 允许

// 沙盒模式
runCommand('node test.js', { sandbox: true });  // ✓ node 不在黑名单

runCommand('rm -rf /', { sandbox: true });      // ✗ 先被 isDangerous 拦截
runCommand('curl http://evil.com', { sandbox: true }); // ✗ curl 在黑名单
runCommand('npm install evil', { sandbox: true });     // ✗ npm 在黑名单
```

### TraceID 追踪

每条 `progress.jsonl` 条目自动包含 `traceId` 和 `spanId`：

```jsonl
{"id":"1716712345-a1b2c3d4","ts":"2026-05-26T08:30:00.000Z","ev":"start","cmd":"verify","traceId":"trace-e5f6a7b8c9d0e1f2","spanId":"span-12345678","args":{},"pid":12345}
```

Evidence 报告同样包含 traceId：

```json
{
  "type": "verify",
  "traceId": "trace-e5f6a7b8c9d0e1f2",
  "spanId": "span-87654321",
  "results": { ... }
}
```

---

## Phase 11: CI/CD 集成

### `stdd ci` — CI 配置生成

```
> stdd ci github
```

**预期行为：** 生成 `.github/workflows/stdd.yml` CI 配置。

```
> stdd ci gitlab
```

**预期行为：** 生成 `.gitlab-ci.yml`。

### `stdd ci-generator` — 高级 CI 生成

```
> stdd ci-generator github --with-mutation
```

**预期行为：** 生成包含变异测试的 CI 配置。

### `stdd starters` — 项目启动模板

```
> stdd starters list
```

**预期行为：** 列出可用模板（javascript/typescript/python/go/rust）。

```
> stdd starters create typescript --name taskflow
```

**预期行为：** 从模板创建新项目。

---

## Phase 12: 模块与扩展

### `stdd extensions` — 扩展管理

```
> stdd extensions list
```

**预期行为：** 列出已安装和可用的扩展。

```
> stdd extensions search "code review"
```

**预期行为：** 搜索扩展目录。

### `stdd modules` — 模块市场

```
> stdd modules list
```

**预期行为：** 列出可用模块。

```
> stdd modules install security-scanner
```

**预期行为：** 安装模块到项目。

### `stdd builder` — 构建自定义 Agent/Skill

```
> stdd builder agent security-reviewer
```

**预期行为：** 启动交互式 Agent 构建向导。

```
> stdd builder skill data-validator
```

**预期行为：** 创建新的 Skill 模板。

```
> stdd builder workflow custom-pipeline --phases stdd-propose,stdd-spec,stdd-plan
```

**预期行为：** 组合自定义工作流。

```
> stdd builder list
```

**预期行为：** 列出已构建的自定义组件。

```
> stdd builder validate stdd/builders/agents/my-agent.json
```

**预期行为：** 验证自定义 Agent 配置。

---

## Phase 13: 文档与报告

### `stdd final-doc` — 生成最终需求文档

```
> stdd final-doc add-task-crud
```

**预期行为：**
- 聚合 proposal + clarification + spec + plan + evidence
- 生成 `FINAL_REQUIREMENT.md`

### `stdd docs` — 生成文档站

```
> stdd docs
```

**预期行为：** 生成静态 HTML 文档站到 `stdd/docs-site/`。

```
> stdd docs open
```

**预期行为：** 生成并在浏览器中打开文档站。

```
> stdd docs sources
```

**预期行为：** 列出文档源文件。

### `stdd dashboard` — 仪表板

```
> stdd dashboard open
```

**预期行为：** 生成并打开项目质量仪表板 HTML。

```
> stdd dashboard generate
```

**预期行为：** 仅生成仪表板，不打开。

### `stdd prfaq` — PR/FAQ 文档

```
> stdd prfaq propose
```

**预期行为：** 生成 Press Release / FAQ 文档。

---

## Phase 14: 记忆与学习

### `stdd memory` — 记忆管理

```
> stdd memory list
```

**预期行为：** 列出所有记忆文件。

```
> stdd memory search "authentication"
```

**预期行为：** 搜索记忆内容。

```
> stdd memory show foundation
```

**预期行为：** 显示基础记忆文件内容。

### `stdd memory-scan` — 记忆扫描

```
> stdd memory-scan scan
```

**预期行为：** 扫描项目，更新记忆文件。

```
> stdd memory-scan stale
```

**预期行为：** 检测过时的记忆条目。

### `stdd learn` — 自适应学习

```
> stdd learn start
```

**预期行为：** 启动学习模式，记录项目模式和偏好。

---

## Phase 15: 归档与交付（最终确认门 ⚠️）

### `stdd archive` — 归档变更

```
> stdd archive add-task-crud
```

**预期行为：**
- **最终确认门**：展示完整变更摘要
- 等待用户确认后：
  - 合并 Delta Spec 到主规格目录
  - 归档变更文件到 `stdd/changes/archive/`
  - 更新 `stdd/progress.jsonl`
  - 清理工作区

---

## 快速通道命令

### `stdd ff` — 快速通道

```
> stdd ff "添加任务优先级排序功能"
```

**预期行为：** 一键完成 propose → spec → plan，跳过澄清直接生成。

### `stdd issue` — Bug 修复通道

```
> stdd issue "任务列表排序不正确"
```

**预期行为：** 快速创建 bug fix 变更，跳过上游探索。

### `stdd turbo` — 一键全流程

```
> stdd turbo "实现用户登录功能"
```

**预期行为：** 自动执行全流程，仅在确认门和归档门暂停。

### `stdd start` — 交互式启动向导

```
> stdd start
```

**预期行为：** 启动交互式向导，引导用户选择工作流。

---

## 辅助命令

### `stdd help` — 帮助系统

```
> stdd help
> stdd help verify
> stdd help design
```

**预期行为：** 输出命令帮助信息，含示例。

### `stdd commands` — 列出所有命令

```
> stdd commands
```

**预期行为：** 列出所有 88 个可用命令。

### `stdd skills` — 列出所有 Skill

```
> stdd skills
```

**预期行为：** 列出所有 57 个 Skill 模板。

---

## AI 编码助手中的斜杠命令

所有 CLI 命令都对应等价的斜杠命令，在 Claude Code / Cursor / Windsurf 等 AI 编码助手中使用：

```
/stdd:init                          # 初始化
/stdd:new add-task-crud             # 创建变更
/stdd:propose "需求描述"            # 需求提案
/stdd:clarify add-task-crud         # 澄清
/stdd:confirm add-task-crud         # 确认
/stdd:spec add-task-crud            # 生成规格
/stdd:plan add-task-crud            # 任务拆解
/stdd:apply add-task-crud           # TDD 执行
/stdd:verify add-task-crud          # 验证
/stdd:archive add-task-crud         # 归档
/stdd:ff "快速需求描述"             # 快速通道
/stdd:turbo "一键全流程"            # Turbo 模式
/stdd:brainstorm "头脑风暴"         # 创意探索
/stdd:design create                 # 设计系统
/stdd:design reverse-scan           # 反向扫描
/stdd:browser compare <url>         # 视觉回归
/stdd:agent start "讨论主题"        # Agent 模拟
/stdd:graph run feature             # Graph 执行
```

---

## 测试验收标准

运行以下命令验证所有功能：

```bash
# 1. 全量测试
npm run test:all
# 预期: 206 suites, 4378 tests, 0 failures

# 2. Lint 检查
npm run lint
# 预期: 0 errors, 0 warnings

# 3. 文档一致性
npm run test:docs
# 预期: 全部通过

# 4. Smoke 测试
npm run test:smoke
# 预期: 全部通过
```

---

*文档版本: 2.1.0 | 生成日期: 2026-05-26 | 覆盖命令: 88 个 CLI + 57 个 Skill*
