---
description: DAG parallel execution engine
version: "1.0"
---

# STDD Skill: /stdd:parallel

## Purpose
Identify and execute independent tasks in parallel using DAG analysis for maximum throughput.

## When to Use
- Multiple independent tasks in tasks.md
- Need to speed up execution with parallel workers
- DAG analysis shows parallelizable nodes

## Workflow
1. Analyze task DAG to find independent nodes (no dependencies between them)
2. Group tasks into parallel execution waves
3. Spawn workers up to --max-workers limit
4. Execute tasks concurrently within each wave
5. Synchronize waves before proceeding to dependent tasks
6. Report combined results and any failures

## Rules
- Never parallelize tasks with dependencies
- Respect --max-workers limit
- Each worker gets isolated context
- Failures in one task don't block others in same wave
- All results merged in completion order

## Output
- Parallel execution plan with waves
- Worker assignment report
- Combined results display
