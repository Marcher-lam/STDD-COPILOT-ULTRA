---
description: Generate BDD specifications from requirements
version: "1.0"
---

# STDD Skill: /stdd:spec

## Purpose
Transform requirement proposals into structured BDD (Behavior-Driven Development) specifications using Given/When/Then format.

## When to Use
- After proposal is clarified and confirmed
- Need formal behavioral specs before implementation
- Defining system behavior as testable scenarios

## Workflow
1. Analyze proposal.md to extract feature points and domain boundaries
2. Select spec type: ADDED, MODIFIED, or REMOVED
3. Generate scenarios using Given/When/Then format
4. Use RFC 2119 keywords: MUST, SHALL, SHOULD, MAY
5. Output delta specs at stdd/changes/xxx/specs/{domain}/spec.md
6. Each boundary condition gets independent Scenario

## Rules
- Spec describes external observable behavior, NOT implementation
- Scenarios must be testable (Given/When/Then)
- Use Lite mode by default, Full mode for high-risk changes
- Every requirement must have at least one Scenario

## Output
- stdd/changes/xxx/specs/{domain}/spec.md - Delta specifications
- BDD scenarios with Given/When/Then format
