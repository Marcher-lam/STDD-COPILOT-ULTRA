---
description: DAG parallel execution engine
---

# Command: /stdd:parallel

## Usage
```
stdd parallel run "<intent>"                 # Execute parallel DAG
stdd parallel dry-run "<intent>"             # Show execution plan
stdd parallel visualize "<intent>"           # Visualize DAG structure
stdd parallel layers "<intent>"              # Show execution layers
stdd parallel status                         # Show execution status
```

## Description
Identify and execute independent tasks in parallel using DAG analysis for maximum throughput.

## Execution Flow
1. Compile DAG from graph definitions
2. Analyze dependencies and create layers
3. Schedule parallel execution
4. Monitor progress across workers
5. Aggregate results

## Output
- Parallel execution results
- DAG visualization
- Layer breakdown
- Performance metrics
