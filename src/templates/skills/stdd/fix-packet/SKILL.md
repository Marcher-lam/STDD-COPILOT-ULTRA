# /stdd:fix-packet

> Generate a diagnostic fix packet from a failed task for AI-assisted repair.

## Purpose

When a TDD task fails during `stdd apply`, the fix-packet skill collects all relevant context — failed test output, current source code, task definition, specs, and design docs — into a structured evidence bundle that an AI agent can use to diagnose and repair the failure.

## When to Use

- After `stdd apply` fails on a task 2+ times
- When you need a comprehensive snapshot of the failure context
- Before escalating to manual intervention

## Instructions

1. Identify the active change or accept an explicit change name
2. Read the current task from `tasks.md` and its status
3. Collect evidence files:
   - Failed test output (from `.stdd/test-output/` or last run)
   - Current source files relevant to the task
   - The BDD spec for the current task
   - The design document excerpt for the task
   - The task definition from `tasks.md`
4. Bundle into a structured packet:
   - `fix-packet-{timestamp}.md` — human-readable markdown
   - `fix-packet-{timestamp}.json` — machine-readable JSON
5. Write to `stdd/changes/{change}/evidence/`
6. Report the packet location and summary

## Output

```
stdd/changes/{change}/evidence/
├── fix-packet-{timestamp}.md
└── fix-packet-{timestamp}.json
```

## Error Handling

- If STDD is not initialized: report error and suggest `stdd init`
- If no active change: report error and list available changes
- If no failed tasks found: report status and suggest continuing with `stdd apply`

## Related Skills

- `/stdd:apply` — the TDD cycle that may trigger fix-packet generation
- `/stdd:verify` — post-implementation verification
- `/stdd:guard` — TDD guard that may flag violations requiring fix-packet
