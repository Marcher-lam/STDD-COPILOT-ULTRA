---
id: stdd.verify
command: /stdd:verify
description: 验证任务、测试、Constitution 与 evidence 完整性
version: "2.0"
category: lifecycle
phase: verification
read_only: true
risk_level: low
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.apply]
next: [stdd.archive, stdd.final-doc]
on_failure: [stdd.fix-packet]
inputs:
  - tasks.md
  - 测试输出
  - mutation evidence
  - Constitution 状态
outputs:
  - verify report
  - stdd/changes/<change-id>/evidence/verify-*.json
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: [2, 7, 9]
  warning: []
  suggestion: []
graph:
  node_id: stdd.verify
  parallelizable: false
  resumable: true
  checkpoint: per-change
---

# STDD Skill: /stdd:verify

## Purpose
验证任务、测试、Constitution 与 evidence 完整性。这是 STDD Copilot 的 Spec-First + TDD CLI skill，服务 Skill Graph 编排、Constitution gate、evidence 留痕和 workspace 作用域。

## When to Use
- 需要执行 /stdd:verify 对应能力时。
- greenfield 项目用于建立或推进规范化工作流。
- brownfield 项目先读取现有代码、测试、README 和约定后再行动。
- monorepo 中使用 --workspace <path-or-package> 限定作用域。

## Preconditions
- 已在仓库根或目标 workspace 中运行 stdd init；只读技能例外但仍应识别项目状态。
- 明确 <change-id>、scope 或 topic；未明确时先询问或运行 stdd status / stdd recommend。
- 不得伪造 evidence；缺失测试、mutation 或 Constitution 结果必须显式标记。

## Inputs
- tasks.md
- 测试输出
- mutation evidence
- Constitution 状态

## Workflow
- 检查 tasks.md 全部完成且没有 pending/failing task。
- 运行测试、lint、Constitution、mutation evidence 与 spec traceability 检查。
- 在 workspace 中按 --workspace 切换测试目录和证据作用域。
- 写入 verify report，失败时给出 fix-packet 或 apply 建议。

## CLI Runtime
```bash
stdd verify <change-id> --lint
stdd verify <change-id> --workspace packages/api
stdd verify <change-id> --no-constitution
```
支持 CLI 与 `/stdd:verify` 双入口；在 monorepo 中优先传入 `--workspace <path-or-package>` 并把证据写入对应作用域。

## Graph Semantics
- 节点 ID 为 stdd.verify，由 frontmatter 暴露给 Skill Graph。
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
- verify report
- stdd/changes/<change-id>/evidence/verify-*.json

## Related Skills
- stdd.apply
- stdd.archive
- stdd.final-doc
- stdd.fix-packet
