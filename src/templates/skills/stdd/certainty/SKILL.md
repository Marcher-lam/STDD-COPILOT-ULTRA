---
id: stdd.certainty
command: /stdd:certainty
description: 对关键决策进行五维置信度评分和 HITL 判断
version: "2.0"
category: evidence
phase: governance
read_only: true
risk_level: low
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: []
next: []
on_failure: []
inputs:
  - 决策点
  - 风险
  - 证据
  - 用户偏好
outputs:
  - confidence report
  - HITL decision
evidence:
  required: false
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: []
  warning: []
  suggestion: [8]
graph:
  node_id: stdd.certainty
  parallelizable: false
  resumable: true
  checkpoint: per-change
---

# STDD Skill: /stdd:certainty

## Purpose
对关键决策进行五维置信度评分和 HITL 判断。这是 STDD Copilot 的 Spec-First + TDD CLI skill，服务 Skill Graph 编排、Constitution gate、evidence 留痕和 workspace 作用域。

## When to Use
- 需要执行 /stdd:certainty 对应能力时。
- greenfield 项目用于建立或推进规范化工作流。
- brownfield 项目先读取现有代码、测试、README 和约定后再行动。
- monorepo 中使用 --workspace <path-or-package> 限定作用域。

## Preconditions
- 已在仓库根或目标 workspace 中运行 stdd init；只读技能例外但仍应识别项目状态。
- 明确 <change-id>、scope 或 topic；未明确时先询问或运行 stdd status / stdd recommend。
- 不得伪造 evidence；缺失测试、mutation 或 Constitution 结果必须显式标记。

## Inputs
- 决策点
- 风险
- 证据
- 用户偏好

## Workflow
- 按需求清晰度、可行性、风险、测试信心、愿景一致性评分。
- 低于阈值时触发 HITL，要求用户确认或补充信息。
- 把评分写入决策 evidence，用于 learn 和 graph recommend。

## CLI Runtime
```bash
stdd recommend <change-id>
stdd graph recommend --workspace packages/api
```
支持 CLI 与 `/stdd:certainty` 双入口；在 monorepo 中优先传入 `--workspace <path-or-package>` 并把证据写入对应作用域。

## Graph Semantics
- 节点 ID 为 stdd.certainty，由 frontmatter 暴露给 Skill Graph。
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
- confidence report
- HITL decision

## Related Skills
- 无
