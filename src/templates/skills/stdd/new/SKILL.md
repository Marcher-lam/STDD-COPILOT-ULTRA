---
description: Create change proposal - start STDD workflow
version: "1.0"
---

# STDD Skill: /stdd:new

## Purpose
Create a new STDD change proposal, guiding through requirement collection and clarification.

## When to Use
- Starting a new feature, bug fix, or refactor
- Need to formalize a requirement before implementation
- Beginning the STDD workflow cycle

## Workflow
1. Create change directory: stdd/changes/change-YYYYMMDD-HHMMSS/
2. Generate proposal.md with Intent, Scope (In/Out), Approach, Success Criteria
3. Generate .status.yaml for state tracking
4. Create placeholder directories: specs/, design.md, tasks.md
5. Set initial status: Draft
6. Optionally begin clarification phase

## Rules
- Check for duplicate/overlapping changes
- Keep scope focused - suggest splitting if Epic-sized
- Proposal is requirement-focused, not implementation details
- Use conventional type prefix: --bug, --refactor, --feature

## Output
- stdd/changes/change-YYYYMMDD-HHMMSS/proposal.md
- stdd/changes/change-YYYYMMDD-HHMMSS/.status.yaml
- stdd/changes/change-YYYYMMDD-HHMMSS/specs/ directory
