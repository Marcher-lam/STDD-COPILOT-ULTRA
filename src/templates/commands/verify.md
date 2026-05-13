---
description: Validate implementation consistency with specifications
---

# Command: /stdd:verify

## Usage
```
/stdd:verify                   # Verify current change
/stdd:verify --all             # Verify all changes
/stdd:verify --fix             # Auto-fix inconsistencies
```

## Description
Validates that the implementation is consistent with the specifications. Checks multiple dimensions including API signature consistency, BDD scenario coverage, TypeScript types, boundary/exception handling, and documentation consistency.

## Execution Flow
1. Read current change specs and implementation
2. Validate across multiple dimensions:

| Dimension | Checks |
|-----------|--------|
| Interface | API signature consistency |
| Behavior | BDD scenario coverage |
| Types | TypeScript type correctness |
| Boundary | Null/exception handling |
| Documentation | Comment consistency |

3. Generate verification report
4. Optionally auto-fix detected issues with `--fix`

## Output
- Verification report with pass/fail status per dimension
- List of inconsistencies (if any)
- Auto-fix diff (with `--fix` flag)
