---
description: Evaluate architecture changes and generate micro-task list
---

# Command: /stdd:plan

## Usage
```
/stdd:plan                     # Break down tasks for current active change
/stdd:plan --change=<name>     # Break down tasks for specified change
```

## Description
Evaluates architecture changes and generates a fine-grained micro-task checklist. Each change is broken down into 5-6 atomic tasks that can be completed in approximately 30 minutes each.

## Execution Flow
1. Read proposal.md and specifications
2. Analyze technical requirements:
   - Identify tech stack
   - Identify framework constraints
   - Identify dependencies
3. Design technical approach:
   - Architecture decisions
   - Data model
   - API design
   - File structure
4. Break down into atomic tasks (5-6 per change)
5. Generate `tasks.md` with task list

## Task Breakdown Principles
- Each change控制在 5-6 atomic tasks
- Each task should be completable in ~30 minutes
- Tasks are ordered by dependency

## Referenced Skill
- `/stdd-skills/3-design`

## Output
- `stdd/changes/<change>/tasks.md` with micro-task checklist

## Next Step
- After planning, proceed to `/stdd:apply`
