---
description: Plan-Execute-Reflect iteration loop
---

# Command: /stdd:iterate

## Usage
```
stdd iterate start "<title>"                 # Start iteration cycle
stdd iterate complete <cycle>                # Complete current cycle
stdd iterate reflect <cycle>                 # Add reflection
stdd iterate status                          # Show cycle status
stdd iterate history                         # Show iteration history
stdd iterate continue                        # Continue next cycle
stdd iterate retrospective                   # Generate retrospective
```

## Description
Autonomous iterative loop that plans, executes, and reflects on results to progressively improve implementation quality.

## Execution Flow
1. Create cycle with plan
2. Execute and record actions
3. Reflect on outcomes
4. Define next steps
5. Track in `stdd/iterations/index.jsonl`

## Output
- Iteration cycle document
- Reflection notes
- Improvement suggestions
- Historical trends
