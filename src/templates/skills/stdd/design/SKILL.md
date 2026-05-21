---
id: stdd.design
command: /stdd:design
description: 生成技术设计文档或根 DESIGN.md 视觉系统
version: "2.0"
category: spec-first
phase: planning
read_only: false
risk_level: medium
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.spec]
next: [stdd.plan]
on_failure: []
inputs:
  - specs/
  - proposal.md
  - DESIGN.md 现状
  - workspace
outputs:
  - design.md
  - 可选 DESIGN.md
  - ADR/risk/test strategy
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: []
  warning: [1, 4, 6]
  suggestion: []
graph:
  node_id: stdd.design
  parallelizable: false
  resumable: true
  checkpoint: per-change
---

# STDD Skill: /stdd:design

## Purpose
生成技术设计文档或根 DESIGN.md 视觉系统。这是 STDD Copilot 的 Spec-First + TDD CLI skill，服务 Skill Graph 编排、Constitution gate、evidence 留痕和 workspace 作用域。 本 skill 有两种子模式：technical design docs 与根目录 DESIGN.md visual design system。

## When to Use
- 需要执行 /stdd:design 对应能力时。
- greenfield 项目用于建立或推进规范化工作流。
- brownfield 项目先读取现有代码、测试、README 和约定后再行动。
- monorepo 中使用 --workspace <path-or-package> 限定作用域。

## Preconditions
- 已在仓库根或目标 workspace 中运行 stdd init；只读技能例外但仍应识别项目状态。
- 明确 <change-id>、scope 或 topic；未明确时先询问或运行 stdd status / stdd recommend。
- 不得伪造 evidence；缺失测试、mutation 或 Constitution 结果必须显式标记。

## Inputs
- specs/
- proposal.md
- DESIGN.md 现状
- workspace

## Workflow
- 技术设计模式：从 specs 生成 architecture、ADR、数据/API、风险和测试策略。
- 视觉系统模式：在前端项目根生成或更新 DESIGN.md，定义颜色、字体、间距、组件和响应式规则。
- greenfield 可按预设 modern/dark/minimal 生成；brownfield 先读取既有 UI 风格。
- 两种模式都必须说明与 specs、Constitution 和 workspace 的关系。

## CLI Runtime
```bash
stdd continue <change-id>
stdd design <change-id> --minimal
stdd design --visual --preset modern
```
支持 CLI 与 `/stdd:design` 双入口；在 monorepo 中优先传入 `--workspace <path-or-package>` 并把证据写入对应作用域。

## Graph Semantics
- 节点 ID 为 stdd.design，由 frontmatter 暴露给 Skill Graph。
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
- design.md
- 可选 DESIGN.md
- ADR/risk/test strategy

## Related Skills
- stdd.plan
- stdd.spec
