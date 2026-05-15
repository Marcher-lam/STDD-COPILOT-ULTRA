---
description: Plan-Execute-Reflect iteration loop
version: "1.0"
---

# STDD Skill: /stdd:iterate

## Purpose
Autonomous iterative loop that plans, executes, and reflects on results to progressively improve implementation quality.

## When to Use
- Need to iteratively refine an approach
- Complex problems requiring multiple passes
- Quality improvement cycles beyond baseline TDD

## Workflow
1. Plan: Define iteration goal, scope, and success criteria
2. Execute: Implement changes according to plan
3. Reflect: Evaluate results against success criteria
4. Decide: Continue, adjust approach, or complete
5. Repeat up to --max iterations (default 10)
6. Pause/stop on request at any time

## Rules
- Each iteration must have a clear goal
- Reflection must produce actionable insight
- Stop if quality is degrading across iterations
- Status checkable at any time during iteration

## Output
- Iteration log with plan/execute/reflect per cycle
- Quality trend across iterations
- Final iteration report
