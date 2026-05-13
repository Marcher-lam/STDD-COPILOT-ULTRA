---
description: Generate technical design document from specifications
version: "1.0"
---

# STDD Skill: /stdd:design

## Purpose
Transform specifications into technical design documents with architecture decisions, implementation plans, and risk assessment.

## When to Use
- After specs are generated and validated
- Need technical implementation plan
- Complex changes requiring architecture decisions

## Workflow
1. Analyze specs to identify technical requirements, dependencies
2. Design technical approach: architecture, data model, API, file structure
3. Document architecture decisions with Context/Decision/Rationale/Consequences
4. Plan file-level changes: CREATE, MODIFY, DELETE
5. Assess risks with likelihood, impact, mitigation
6. Define testing strategy (Unit, Integration, E2E)
7. Output design.md

## Rules
- Design explains "how", not repeats "what" from specs
- Each architecture decision must be traceable
- File changes listed at file level precision
- Risks must have mitigation strategies
- Use --minimal for simple tasks, --full for complex ones

## Output
- stdd/changes/xxx/design.md
- Architecture decisions, data models, API design, file changes, risk assessment
