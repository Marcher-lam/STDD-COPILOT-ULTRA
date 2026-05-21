---
id: stdd.new
command: /stdd:new
description: 创建变更工作区并启动 Spec-First 需求流
version: "2.0"
category: lifecycle
phase: discovery
read_only: false
risk_level: medium
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.init]
next: [stdd.propose]
on_failure: []
inputs:
  - change-id 或需求描述
  - 项目状态
  - 可选 --title/--description
outputs:
  - stdd/changes/<change-id>/proposal.md
  - stdd/changes/<change-id>/.status.yaml
  - stdd/changes/<change-id>/evidence/
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: []
  warning: []
  suggestion: []
graph:
  node_id: stdd.new
  parallelizable: false
  resumable: true
  checkpoint: per-change
---

# STDD Skill: /stdd:new

## Purpose
创建变更工作区并启动 Spec-First 需求流。这是 STDD Copilot 的 Spec-First + TDD CLI skill，服务 Skill Graph 编排、Constitution gate、evidence 留痕和 workspace 作用域。

## When to Use
- 需要执行 /stdd:new 对应能力时。
- greenfield 项目用于建立或推进规范化工作流。
- brownfield 项目先读取现有代码、测试、README 和约定后再行动。
- monorepo 中使用 --workspace <path-or-package> 限定作用域。

## Preconditions
- 已在仓库根或目标 workspace 中运行 stdd init；只读技能例外但仍应识别项目状态。
- 明确 <change-id>、scope 或 topic；未明确时先询问或运行 stdd status / stdd recommend。
- 不得伪造 evidence；缺失测试、mutation 或 Constitution 结果必须显式标记。

## Inputs
- change-id 或需求描述
- 项目状态
- 可选 --title/--description

## Workflow
- 确认已初始化并解析 change-id；未给出时生成稳定 slug。
- 创建 stdd/changes/<change-id>/、specs/、evidence/ 与 .status.yaml。
- 写入 proposal.md 草稿，标注 greenfield 目标或 brownfield 影响范围。
- 检查重叠变更并推荐 propose 或 clarify。

## CLI Runtime
```bash
stdd new change <change-id> --title "..."
stdd ff "需求" --change-name <change-id>
```
支持 CLI 与 `/stdd:new` 双入口；在 monorepo 中优先传入 `--workspace <path-or-package>` 并把证据写入对应作用域。

## Graph Semantics
- 节点 ID 为 stdd.new，由 frontmatter 暴露给 Skill Graph。
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
- stdd/changes/<change-id>/.status.yaml
- stdd/changes/<change-id>/evidence/

## Related Skills
- stdd.init
- stdd.propose
