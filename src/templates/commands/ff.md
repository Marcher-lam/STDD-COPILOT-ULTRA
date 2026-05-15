---
description: Fast-forward generation of all artifacts in one step
---

# Command: /stdd:ff

## Usage
```
/stdd:ff <requirement description>            # Fast-fast generate
/stdd:ff --dry-run                            # Preview without executing
```

## Description
One-click generation of all artifacts (proposal, specs, design, tasks) in a single fast-forward pass. Suitable for requirements with clear boundaries.

## Execution Flow
1. Parse requirement description
2. Generate `proposal.md` - Requirement proposal
3. Generate `specs/*.md` - Delta specifications
4. Generate `design.md` - Design document
5. Generate `tasks.md` - Task list
6. Mark change as ready for implementation

## Referenced Skills
- `/stdd:propose`
- `/stdd:spec`
- `/stdd:plan`

## Output
1. `proposal.md` - Requirement proposal
2. `specs/*.md` - Delta specifications
3. `design.md` - Design document
4. `tasks.md` - Task list
