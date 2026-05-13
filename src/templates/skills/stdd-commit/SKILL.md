---
description: Atomic commit with red:/green:/refactor: prefix (Conventional Commits + TDD)
version: "1.0"
---

# STDD Skill: /stdd:commit

## Purpose
Perform atomic git commit with TDD phase prefix and conventional commits format after tasks are complete and tests pass.

## When to Use
- All tasks in tasks.md are completed
- All tests pass and quality gates met
- Ready to commit changes before archiving

## Workflow
1. Verify preconditions: tasks complete, tests pass, quality gates met
2. Determine commit prefix based on change type: red: (new test), green: (minimal impl), refactor: (code improvement)
3. Generate conventional commit message: prefix + scope + description
4. Stage changed files
5. Create atomic commit with generated message
6. Validate commit against Constitution rules

## Rules
- MUST use red:/green:/refactor: prefix for TDD commits
- Conventional commits format: type(scope): description
- Only stage files related to current change
- Commit is atomic - all related changes in single commit
- Constitution check must pass before commit

## Output
- Git commit with conventional + TDD prefix message
- Commit validation report
- Updated git log
