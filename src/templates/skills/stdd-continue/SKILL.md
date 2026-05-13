---
description: Continue to next artifact in the workflow
version: "1.0"
---

# STDD Skill: /stdd:continue

## Purpose
Automatically detect and generate the next artifact in the workflow state machine, with optional override to generate a specific artifact.

## When to Use
- Want step-by-step artifact generation
- After manual review/adjustment of current artifact
- Need to resume workflow from any point

## Workflow
1. Detect current change state from .status.yaml
2. Follow state machine: proposal → specs → design → tasks → ready
3. Generate next artifact in sequence
4. Allow override flags: --proposal, --specs, --design, --tasks
5. Update status after each artifact
6. Recommend next step after completion

## Rules
- Auto-detect next step based on current state
- Skip completed artifacts when resuming
- Allow manual override to any artifact type
- Each step can be reviewed/edited before continuing

## Output
- Next artifact in workflow sequence
- Updated .status.yaml
- Recommendation for next command
