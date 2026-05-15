---
description: Draft a new feature requirement with boundary clarification
version: "1.0"
---

# STDD Skill: /stdd:propose

## Purpose
Propose a new feature requirement draft with boundary clarification. Detects if the requirement is too large (Epic) and requests splitting if necessary.

## When to Use
- Starting a new feature after `/stdd:new`
- Need to draft or refine a requirement proposal
- Detecting oversized Epics that need splitting

## Workflow
1. Parse requirement description
2. Check if requirement is too large (Epic detection)
   - If too large, request splitting into smaller changes
3. Analyze requirement boundaries and identify implicit constraints
4. Generate clarifying questions for edge cases
5. Write result to `stdd/changes/<change>/proposal.md`

## Rules
- Detect oversized Epics and request splitting
- Auto-supplement boundary questions and implicit constraints
- Focus on external observable behavior, not implementation details

## Output
- `stdd/changes/<change>/proposal.md` with clarified requirement
