---
description: Execute the Ralph Loop TDD closed-loop
---

# Command: /stdd:execute

## Usage
```
/stdd:execute                  # Execute all pending tasks
/stdd:execute --task=TASK-001  # Execute specific task
/stdd:execute --next           # Execute next task
```

## Description
Starts the strict Ralph Loop TDD execution closed-loop. Processes tasks from `tasks.md` through the full TDD cycle.

## Execution Flow
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

## Referenced Skill
- `/stdd-skills/4-implementation`

## Output
- Implemented code files
- Test files
- Updated task status in `tasks.md`
- Execution log in `apply.log`
