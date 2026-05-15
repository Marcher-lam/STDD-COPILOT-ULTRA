---
description: Execute the Ralph Loop TDD closed-loop
version: "1.0"
---

# STDD Skill: /stdd:execute

## Purpose
Start the strict Ralph Loop TDD execution closed-loop. Process tasks from `tasks.md` through the full TDD cycle (RED → CHECK → GREEN → MUTATION → REFACTOR).

## When to Use
- After `/stdd:plan` when tasks are ready for implementation
- Same as `/stdd:apply` (alias command)
- Need to run the full TDD cycle on pending tasks

## Workflow
### Loop Stages
```
RED → CHECK → GREEN → MUTATION → REFACTOR
```

1. **RED**: Write failing test for the next task
2. **CHECK**: Run static analysis (syntax, type, style checks)
3. **GREEN**: Implement minimal code to pass tests
4. **MUTATION**: Verify tests detect code mutations (anti-fake-green)
5. **REFACTOR**: Optimize code structure while keeping tests green

### Fuse Mechanism
If a task fails 3 consecutive times, the circuit breaker triggers and manual intervention is recommended.

## Rules
- MUST follow RED before GREEN (test-first)
- Each stage produces evidence artifacts
- Circuit breaker after 3 consecutive failures

## Output
- Implemented code files
- Test files
- Updated task status in `tasks.md`
- Execution evidence in `evidence/`
