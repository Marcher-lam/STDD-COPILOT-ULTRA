---
description: Create new change proposal
---

# Command: /stdd:new

## Usage
```
/stdd:new <requirement description>           # Create change
/stdd:new --bug <description>                 # Bug fix
/stdd:new --refactor <description>            # Refactoring task
/stdd:new --feature <description>             # New feature
```

## Description
Creates a new STDD change proposal. The system guides you through requirement collection and clarification. A new change directory is generated with proposal.md, .status.yaml, and skeleton for specs/design/tasks.

## Execution Flow
1. Create change directory: `stdd/changes/change-YYYYMMDD-HHMMSS/`
2. Generate proposal file with Intent, Scope, Approach, Success Criteria
3. Generate `.status.yaml` for status tracking
4. Create skeleton directories for specs, design, tasks
5. Enter requirement clarification phase
6. Set status to Draft

## Referenced Skill
- `/stdd:new`

## Output
- `stdd/changes/change-YYYYMMDD-HHMMSS/proposal.md`
- `stdd/changes/change-YYYYMMDD-HHMMSS/.status.yaml`
- `stdd/changes/change-YYYYMMDD-HHMMSS/specs/`
- `stdd/changes/change-YYYYMMDD-HHMMSS/design.md` (skeleton)
- `stdd/changes/change-YYYYMMDD-HHMMSS/tasks.md` (skeleton)

## Next Steps
| Command | Description |
|---------|-------------|
| `/stdd:ff` | Fast-forward generate all artifacts |
| `/stdd:continue` | Step-by-step generate next artifact |
| `/stdd:explore` | Explore existing code first |
