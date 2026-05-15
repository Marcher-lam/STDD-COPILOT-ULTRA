---
description: Verify change readiness - tasks, tests, constitution, and evidence
version: "1.0"
---

# STDD Skill: /stdd:verify

## Purpose
Validate that a change is ready for archival by checking task completion, test results, constitution compliance, and evidence collection.

## When to Use
- After `/stdd:apply` to confirm all tasks are done
- Before `/stdd:archive` to ensure readiness
- Running final quality gate on a change

## Workflow
1. **Tasks check**: Verify all tasks in tasks.md are completed
2. **Tests check**: Run test suite and confirm all pass
3. **Constitution check**: Run compliance check against 9 articles
4. **Mutation check**: Verify mutation evidence exists
5. **Evidence capture**: Record verification results in evidence/

## Verification Dimensions
| Dimension | Check |
|-----------|-------|
| Tasks | All checkboxes marked [x] in tasks.md |
| Tests | Test suite passes with 0 failures |
| Constitution | No blocking violations |
| Mutation | Mutation evidence file exists |
| Coverage | Test coverage meets threshold (default 80%) |

## Rules
- All 5 dimensions must pass for verify to succeed
- Evidence is captured to `stdd/changes/<change>/evidence/verify-*.json`
- `--lint` option adds static analysis check
- `--fix` option attempts auto-fix where possible

## Output
- Verification report with pass/fail per dimension
- Evidence file in `evidence/`
- Exit code 0 (pass) or 1 (fail)
