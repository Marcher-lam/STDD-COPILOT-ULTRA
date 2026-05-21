---
id: stdd.apply
command: /stdd:apply
description: 按 Ralph Loop 执行任务级 TDD 实现
version: "2.0"
category: lifecycle
phase: implementation
read_only: false
risk_level: high
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.plan]
next: [stdd.mutation, stdd.verify]
on_failure: [stdd.fix-packet]
inputs:
  - tasks.md
  - specs/
  - design.md
  - 测试命令
  - workspace
outputs:
  - 测试文件
  - 实现代码
  - tasks.md 更新
  - apply evidence
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: [2, 7, 9]
  warning: []
  suggestion: []
graph:
  node_id: stdd.apply
  parallelizable: false
  resumable: true
  checkpoint: per-task
---

# STDD Skill: /stdd:apply

## Purpose
按 Ralph Loop 执行任务级 TDD 实现。这是 STDD Copilot 的 Spec-First + TDD CLI skill，服务 Skill Graph 编排、Constitution gate、evidence 留痕和 workspace 作用域。

## When to Use
- 需要执行 /stdd:apply 对应能力时。
- greenfield 项目用于建立或推进规范化工作流。
- brownfield 项目先读取现有代码、测试、README 和约定后再行动。
- monorepo 中使用 --workspace <path-or-package> 限定作用域。

## Preconditions
- 已在仓库根或目标 workspace 中运行 stdd init；只读技能例外但仍应识别项目状态。
- 明确 <change-id>、scope 或 topic；未明确时先询问或运行 stdd status / stdd recommend。
- 不得伪造 evidence；缺失测试、mutation 或 Constitution 结果必须显式标记。

## Inputs
- tasks.md
- specs/
- design.md
- 测试命令
- workspace

## Workflow
- 选择下一个未完成任务或 --task 指定任务。
- RED：先写失败测试并保存 test output。
- CHECK：运行 lint/type/static checks。
- GREEN：写最小实现，仅满足当前测试。
- MUTATION：运行 quick 或 stryker 证据，检测 fake-green。
- REFACTOR：保持测试全绿后更新 tasks.md。

## CLI Runtime
```bash
stdd apply <change-id> --task TASK-001 --test-command "npm test"
stdd apply <change-id> --workspace packages/api
stdd apply <change-id> --delegate --e2e-command "npm run e2e"
```
支持 CLI 与 `/stdd:apply` 双入口；在 monorepo 中优先传入 `--workspace <path-or-package>` 并把证据写入对应作用域。

## Graph Semantics
- 节点 ID 为 stdd.apply，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-task；resumable=true；parallelizable=false。
- Graph 必须尊重 depends_on/next，不得越过 confirm、verify、archive 等 gate。

## Constitution Gates
- Blocking 条例失败时停止并返回修复建议。
- Warning 条例必须在报告中列出，可由用户决定是否继续。
- Suggestion 条例用于改进可维护性和文档质量，不应伪装成已完成工作。

## Evidence Contract
- 默认证据路径：stdd/changes/<change-id>/evidence/
- 变更级 evidence 使用 stdd/changes/<change-id>/evidence/；全局 guard/audit 使用 stdd/evidence/。
- 证据文件应包含 command、timestamp、workspace、input summary、result、exit code 和关键 stdout/stderr 摘要。

## Error Handling
- 缺少 STDD 初始化时提示 stdd init。
- 缺少 change-id 时列出 stdd list / stdd status 的下一步。
- 连续失败 3 次触发熔断，生成或建议 stdd fix-packet <change-id>。
- workspace 不存在时提示 stdd workspace validate / repair。

## Outputs
- 测试文件
- 实现代码
- tasks.md 更新
- apply evidence

## Related Skills
- stdd.fix-packet
- stdd.mutation
- stdd.plan
- stdd.verify
