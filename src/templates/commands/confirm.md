---
description: User review and confirmation gate before specification phase
---

# Command: /stdd:confirm

## Usage
```
/stdd:confirm                  # Confirm current active change
/stdd:confirm --change=<name>  # Confirm specified change
```

## Description
User reviews and confirms the requirement, serving as the human-in-the-loop confirmation gate before entering the specification phase.

## Execution Flow
1. Display current proposal with all clarified requirements
2. Present summary of scope, approach, and success criteria
3. Request user confirmation (yes/no)

### Branching Results
- `yes` → Proceed to `/stdd:spec`
- `no` → Return to `/stdd:propose` for revision

## Referenced Skill
- `/stdd:confirm`

## Output
- Confirmation status recorded in `.status.yaml`
- Proceeds to specification phase or returns to proposal
