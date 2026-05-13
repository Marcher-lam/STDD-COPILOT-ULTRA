---
description: TDD implementation loop - Ralph Loop (RED-CHECK-GREEN-MUTATION-REFACTOR)
version: "1.0"
---

# STDD Skill: /stdd:apply

## Purpose
Execute tasks from tasks.md following the Ralph Loop TDD cycle: RED → CHECK → GREEN → MUTATION → REFACTOR.

## When to Use
- tasks.md is ready with atomic tasks
- Starting TDD implementation
- Executing individual or all pending tasks

## Workflow
1. RED: Read next task, generate failing test, confirm test fails
2. CHECK: Static analysis (ESLint, tsc --noEmit), fix any issues
3. GREEN: Write minimal implementation, confirm tests pass
4. MUTATION: Pseudo-modify code, confirm tests fail (detect fake-green)
5. REFACTOR: Optimize code quality, confirm tests still pass
6. Update task status: [ ] → [🔄] → [x]
7. If 3 consecutive failures → FUSE: rollback and request intervention

## Rules
- Test MUST be written before implementation (test-first guarding)
- Minimal implementation only - no over-engineering
- Mutation test required unless --no-mutation
- Refactoring required unless --no-refactor
- 3 consecutive failures triggers circuit breaker

## Output
- Updated test files
- Implementation code
- Updated task status in tasks.md
- apply.log with execution records
