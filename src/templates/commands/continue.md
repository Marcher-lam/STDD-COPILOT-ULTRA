---
description: Continue generating the next artifact in the pipeline
---

# Command: /stdd:continue

## Usage
```
/stdd:continue                 # Auto-detect next step
/stdd:continue --proposal      # Generate proposal
/stdd:continue --specs         # Generate specs
/stdd:continue --design        # Generate design
/stdd:continue --tasks         # Generate tasks
```

## Description
Continues generating the next artifact in the pipeline. Automatically detects the current state and generates the appropriate next artifact. Can also force a specific artifact generation with flags.

## Execution Flow
State machine progression:
```
proposal → specs → design → tasks → ready
```

1. Read current change `.status.yaml`
2. Determine which artifacts exist
3. Generate the next missing artifact in sequence
4. Update status file
5. Report completion and next available steps

## Referenced Skills
- `/stdd-skills/1-proposal` (for --proposal)
- `/stdd-skills/2-specification` (for --specs)
- `/stdd-skills/3-design` (for --design)
- `/stdd-skills/4-implementation` (for --tasks)

## Output
Depends on current state:
- Generates the next artifact in the pipeline
- Updates change status
