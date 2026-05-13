---
description: Generate BDD specifications from confirmed requirements
---

# Command: /stdd:spec

## Usage
```
/stdd:spec                     # Generate specs for current active change
/stdd:spec --change=<name>     # Generate specs for specified change
```

## Description
Translates confirmed requirements into structured BDD (Behavior-Driven Development) specifications using Given/When/Then format with ADDED, MODIFIED, and REMOVED sections.

## Execution Flow
1. Read confirmed proposal.md
2. Extract feature points and identify domain boundaries
3. Determine change type (ADDED, MODIFIED, or REMOVED)
4. Generate BDD scenarios:
   - Given (preconditions)
   - When (trigger actions)
   - Then (expected outcomes)
5. Output Delta Spec to `stdd/changes/xxx/specs/{domain}/spec.md`

## Red Line Rules
- Only describe externally observable behavior
- Never write implementation details
- Each boundary condition should have an independent Scenario

## RFC 2119 Keywords
| Keyword | Meaning |
|---------|---------|
| **MUST** | Absolute requirement |
| **SHALL** | Absolute requirement (same as MUST) |
| **SHOULD** | Recommended, exceptions possible |
| **MAY** | Optional |

## Referenced Skill
- `/stdd-skills/2-specification`

## Output
- `stdd/changes/<change>/specs/{domain}/spec.md` with BDD scenarios

## Next Steps
| Command | Description |
|---------|-------------|
| `/stdd:plan` | Generate task breakdown |
| `/stdd:continue` | Auto-execute next step |
| `/stdd:validate` | Validate spec format |
