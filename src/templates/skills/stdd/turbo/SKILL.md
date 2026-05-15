---
description: One-shot full workflow - turbo mode for clear requirements
version: "1.0"
---

# STDD Skill: /stdd:turbo

## Purpose
One-shot execution of all pre-implementation phases (propose → spec → design → plan) for small, well-defined requirements, optionally continuing to implementation.

## When to Use
- Small, well-understood requirements
- Want to skip interactive steps and get artifacts fast
- Suitable for bug fixes, small features, utility functions

## Workflow
1. Auto-propose: generate proposal from requirement description
2. Auto-spec: generate BDD specs from proposal
3. Auto-design: generate technical design from specs
4. Auto-plan: generate tasks from design
5. Optionally run /stdd:apply to implement (flag-based)
6. All phases run without intermediate confirmation

## Rules
- Only for small, clear requirements - suggest /stdd:new for complex ones
- Each phase uses output of previous phase
- Review artifacts after turbo completes
- Can still use /stdd:apply, /stdd:verify, /stdd:archive after turbo

## Output
- All four artifacts: proposal.md, specs/, design.md, tasks.md
- Optional implementation results (if auto-apply enabled)
