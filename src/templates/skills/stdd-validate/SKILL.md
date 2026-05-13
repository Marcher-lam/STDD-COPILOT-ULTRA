---
description: Spec validation and guardian
version: "1.0"
---

# STDD Skill: /stdd:validate

## Purpose
Validate all specifications for consistency, completeness, format compliance, and Spec Guardian implementation-leakage risks.

## When to Use
- After generating specs, before implementation
- Checking spec format compliance
- Validating spec consistency across changes

## Workflow
1. Check spec format: valid BDD Given/When/Then structure
2. Validate RFC 2119 keyword usage (MUST/SHALL/SHOULD/MAY)
3. Cross-reference with proposal for coverage gaps
4. Check for conflicts between ADDED/MODIFIED/REMOVED
5. Run Spec Guardian leakage checks for file paths, implementation types, database details, API transport details, and placeholders
6. Write rewrite suggestions when --fix flag used
7. Report validation results with line-level diagnostics and evidence

## CLI Runtime
```bash
stdd validate [change]
stdd validate add-auth --spec-guardian
stdd validate add-auth --spec-guardian --fix
stdd validate add-auth --json
```

The CLI writes evidence to `stdd/changes/<change>/evidence/` or `stdd/evidence/` and fails when blocking diagnostics are found.

## Rules
- All specs MUST have at least one Scenario
- Given/When/Then format is required
- No conflicting requirements across spec files
- Specs SHOULD avoid implementation terms such as file paths, class names, database tables, or HTTP transport details unless the feature is itself an API contract
- Validation fails when blocking diagnostics are found

## Output
- Validation report with pass/fail per dimension
- Auto-fixed spec files (--fix mode)
- Coverage gap analysis
- Spec Guardian evidence JSON
- `spec-guardian-suggestions.md` when `--fix` is used
