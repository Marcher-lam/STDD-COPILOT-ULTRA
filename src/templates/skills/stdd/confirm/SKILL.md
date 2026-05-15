---
description: User review and confirmation gate before specification phase
version: "1.0"
---

# STDD Skill: /stdd:confirm

## Purpose
Human-in-the-loop confirmation gate. Display proposal summary and request user approval before entering the specification phase.

## When to Use
- After `/stdd:clarify` to get user sign-off
- Need explicit user approval before proceeding
- Final check before generating BDD specifications

## Workflow
1. Display current proposal with all clarified requirements
2. Present summary of scope, approach, and success criteria
3. Request user confirmation (yes/no)

### Branching Results
- `yes` → Proceed to `/stdd:spec`
- `no` → Return to `/stdd:propose` for revision

## Rules
- MUST pause and wait for user input
- Display full scope summary before asking
- Never auto-confirm without human approval

## Output
- Confirmation status recorded in `.status.yaml`
- Proceeds to specification phase or returns to proposal
