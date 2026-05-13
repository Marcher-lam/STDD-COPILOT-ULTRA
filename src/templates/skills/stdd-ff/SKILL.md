---
description: Fast-Forward - one-shot generation of all artifacts
version: "1.0"
---

# STDD Skill: /stdd:ff

## Purpose
Generate all four core artifacts (proposal, specs, design, tasks) in one shot for clear, well-understood requirements.

## When to Use
- Requirement is clear and well-bounded
- Want to skip interactive clarification steps
- Simple features, API endpoints, utility functions, bug fixes

## Workflow
1. Create change directory and generate proposal.md
2. Generate BDD specs (Given/When/Then) in ADDED/MODIFIED/REMOVED format
3. Generate design.md with technical approach, architecture decisions, file changes
4. Generate tasks.md with atomic task breakdown (5-6 tasks max)
5. Transition state: Draft → Specified → Designed → Ready

## Rules
- Only for clear requirements - suggest /stdd:new for ambiguous ones
- Each artifact generated feeds the next
- Still supports manual editing after generation
- Ready for /stdd:apply after all four artifacts

## Output
- stdd/changes/xxx/proposal.md
- stdd/changes/xxx/specs/*.md
- stdd/changes/xxx/design.md
- stdd/changes/xxx/tasks.md
