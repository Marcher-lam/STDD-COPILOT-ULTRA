---
description: Graph engine - visualize, analyze, run, parallel, history, replay, recommend
version: "1.0"
---

# STDD Skill: /stdd:graph

## Purpose
DAG-based skill orchestration engine for visualization, analysis, execution, parallelism, history, replay, and recommendations.

## When to Use
- Visualizing skill dependencies (graph visualize)
- Analyzing execution state and bottlenecks (graph analyze)
- Running skills from specific points (graph run)
- Showing TDD repair and outside-in nodes in the active DAG
- Detecting and executing parallel tasks (graph parallel)
- Viewing execution history (graph history)
- Replaying past executions (graph replay)
- Getting intelligent next-step recommendations (graph recommend)

## Workflow
1. **visualize**: Generate Mermaid/HTML/SVG dependency graphs
2. **analyze**: Detect current state, available paths, and bottlenecks
3. **run**: Execute skills respecting DAG dependencies, skip completed if requested
4. **parallel**: Detect independent nodes, spawn workers, coordinate execution
5. **history**: Query execution logs, filter by status/time/failure
6. **replay**: Restore past execution state, optionally re-execute
7. **recommend**: Analyze current state + goal to recommend next skills
8. **repair intent**: `stdd graph run --intent repair --change-name <change>` starts with `stdd-fix-packet`
9. **feature intent**: includes `stdd-outside-in` between plan and apply to generate layer registry/scaffolds

## Rules
- Always respect DAG dependency order
- Never execute a skill before its dependencies complete
- Skip completed skills unless --no-skip requested
- Parallel execution limited by --max-workers
- History stored in stdd/graph/execution-logs/

## Output
- Visual graphs (Mermaid/HTML/SVG)
- Execution state analysis
- Execution history records
- Next-step recommendations
- Dynamic DAG nodes for `stdd-outside-in` and `stdd-fix-packet`
