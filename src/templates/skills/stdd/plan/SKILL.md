---
description: Evaluate architecture changes and generate micro-task list
version: "1.0"
---

# STDD Skill: /stdd:plan

## Purpose
Evaluate architecture changes and generate a fine-grained micro-task checklist. Break down each change into 5-6 atomic tasks (~30 min each).

## When to Use
- After `/stdd:spec` to create implementation tasks
- Need to break down specifications into actionable work items
- Planning sprint or iteration scope

## Workflow
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

## Rules
- Each change should have 5-6 atomic tasks
- Each task should be completable in ~30 minutes
- Tasks are ordered by dependency

## Output
- `stdd/changes/<change>/tasks.md` with micro-task checklist
- `stdd/changes/<change>/design.md` with technical design (if not already present)
