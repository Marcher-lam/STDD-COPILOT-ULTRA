---
description: Generate final aggregated requirement document
---

# Command: /stdd:final-doc

## Usage
```
/stdd:final-doc                  # Generate document for current active change
/stdd:final-doc --change=<name>  # Generate document for specified change
```

## Description
Aggregates all artifacts from every phase (proposal, specs, design, tasks, implementation) and generates a comprehensive final requirement document.

## Execution Flow
1. Read all artifacts from the change directory:
   - proposal.md
   - specs/
   - design.md
   - tasks.md
   - apply.log
2. Aggregate and synthesize information
3. Generate final requirement document with:
   - Background and intent
   - Requirements summary
   - Design decisions
   - Implementation details
   - Test coverage
   - Quality metrics
4. Output as `FINAL_REQUIREMENT.md`

## Output
- `FINAL_REQUIREMENT.md` - Comprehensive requirement document containing all phase outputs
