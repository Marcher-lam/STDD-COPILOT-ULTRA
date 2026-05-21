---
id: stdd.execute
command: /stdd:execute
description: 围绕 Ralph Loop 与 apply 的编排型执行包装器
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
next: [stdd.verify]
on_failure: [stdd.fix-packet]
inputs:
  - tasks.md
  - Skill Graph
  - apply 参数
  - progress 状态
outputs:
  - apply 编排记录
  - progress 记录
  - execution evidence
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: [2, 7, 9]
  warning: []
  suggestion: []
graph:
  node_id: stdd.execute
  parallelizable: false
  resumable: true
  checkpoint: per-task
---

# STDD Skill: /stdd:execute

## Purpose
围绕 Ralph Loop 与 apply 的编排型执行包装器。这是 STDD Copilot 的 Spec-First + TDD CLI skill，服务 Skill Graph 编排、Constitution gate、evidence 留痕和 workspace 作用域。 apply 是 canonical task-level TDD runner；execute 只做 Ralph Loop/apply 的编排包装。

## When to Use
- 需要执行 /stdd:execute 对应能力时。
- greenfield 项目用于建立或推进规范化工作流。
- brownfield 项目先读取现有代码、测试、README 和约定后再行动。
- monorepo 中使用 --workspace <path-or-package> 限定作用域。

## Preconditions
- 已在仓库根或目标 workspace 中运行 stdd init；只读技能例外但仍应识别项目状态。
- 明确 <change-id>、scope 或 topic；未明确时先询问或运行 stdd status / stdd recommend。
- 不得伪造 evidence；缺失测试、mutation 或 Constitution 结果必须显式标记。

## Inputs
- tasks.md
- Skill Graph
- apply 参数
- progress 状态

## Workflow
- 读取 Skill Graph、tasks.md 和当前失败状态。
- 把 Ralph Loop 分派给 canonical runner：stdd apply。
- 在需要时串联 outside-in、mutation、fix-packet、verify。
- 记录 orchestration evidence；execute 不替代 apply 的任务语义。

## CLI Runtime
```bash
stdd apply <change-id>
stdd continue <change-id> --test-command "npm test"
stdd graph run feature --change-name <change-id>
```
支持 CLI 与 `/stdd:execute` 双入口；在 monorepo 中优先传入 `--workspace <path-or-package>` 并把证据写入对应作用域。

## Graph Semantics
- 节点 ID 为 stdd.execute，由 frontmatter 暴露给 Skill Graph。
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
- apply 编排记录
- progress 记录
- execution evidence

## Related Skills
- stdd.fix-packet
- stdd.plan
- stdd.verify
