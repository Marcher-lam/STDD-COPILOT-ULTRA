---
description: Multi-round clarification for requirement drafts
version: "1.0"
---

# STDD Skill: /stdd:clarify

## Purpose
Conduct multi-round clarification sessions for requirement drafts. Resolve ambiguities, identify edge cases, and ensure the requirement is well-scoped before specification.

## When to Use
- After `/stdd:propose` to refine the requirement
- Need to resolve ambiguous requirements
- Identifying edge cases and non-functional requirements

## Workflow
1. Load current active change proposal
2. Identify ambiguous or incomplete areas
3. Ask clarifying questions about:
   - Boundary conditions
   - Edge cases
   - Implicit constraints
   - Non-functional requirements
4. Update proposal.md with clarified information
5. Repeat until clarification is complete

## Rules
- Use 78 structured reasoning methods for clarification
- Cover boundary conditions, edge cases, and NFRs
- Keep clarification focused and actionable

## Output
- Updated `proposal.md` with clarified requirements
- Refined scope and boundary definitions
