---
id: stdd.propose
command: /stdd:propose
description: 把用户意图整理为边界清晰的变更 proposal
version: "2.0"
category: lifecycle
phase: proposal
read_only: false
risk_level: medium
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.new]
next: [stdd.clarify]
on_failure: []
inputs:
  - proposal 草稿
  - 用户需求
  - 探索报告
  - vision/specs
outputs:
  - stdd/changes/<change-id>/proposal.md
  - proposal evidence
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: []
  warning: [5]
  suggestion: []
graph:
  node_id: stdd.propose
  parallelizable: false
  resumable: true
  checkpoint: per-change
---

# STDD Skill: /stdd:propose

## Purpose
把用户意图整理为边界清晰的变更 proposal。这是 STDD Copilot 的 Spec-First + TDD CLI skill，服务 Skill Graph 编排、Constitution gate、evidence 留痕和 workspace 作用域。

## When to Use
- 需要执行 /stdd:propose 对应能力时。
- greenfield 项目用于建立或推进规范化工作流。
- brownfield 项目先读取现有代码、测试、README 和约定后再行动。
- monorepo 中使用 --workspace <path-or-package> 限定作用域。

## Preconditions
- 已在仓库根或目标 workspace 中运行 stdd init；只读技能例外但仍应识别项目状态。
- 明确 <change-id>、scope 或 topic；未明确时先询问或运行 stdd status / stdd recommend。
- 不得伪造 evidence；缺失测试、mutation 或 Constitution 结果必须显式标记。

## Inputs
- proposal 草稿
- 用户需求
- 探索报告
- vision/specs

## Workflow
- 读取用户意图、探索报告、vision 与现有 specs。
- 识别 In/Out of scope、用户价值、成功标准、风险和非目标。
- 检测 Epic；过大时建议拆分，不进入实现。
- 写入 stdd/changes/<change-id>/proposal.md 并记录 evidence。

## CLI Runtime
```bash
stdd new change <change-id> --description "..."
stdd continue <change-id>
```
支持 CLI 与 `/stdd:propose` 双入口；在 monorepo 中优先传入 `--workspace <path-or-package>` 并把证据写入对应作用域。

## Graph Semantics
- 节点 ID 为 stdd.propose，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-change；resumable=true；parallelizable=false。
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
- stdd/changes/<change-id>/proposal.md
- proposal evidence

## Related Skills
- stdd.clarify
- stdd.new
