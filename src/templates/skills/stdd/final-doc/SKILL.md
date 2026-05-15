---
description: Generate final aggregated requirement document from all phase artifacts
version: "1.0"
---

# STDD Skill: /stdd:final-doc

## Purpose
Aggregate all artifacts from every phase (proposal, specs, design, tasks, implementation) and generate a comprehensive final requirement document.

## When to Use
- After implementation is complete
- Need complete documentation for review or handoff
- Before archiving the change (`/stdd:archive`)

## Workflow
1. Read all artifacts from the change directory:
   - proposal.md
   - specs/
   - design.md
   - tasks.md
   - evidence/
2. Aggregate and synthesize information
3. Generate final document with:
   - Background and intent
   - Requirements summary
   - Design decisions
   - Implementation details
   - Test coverage
   - Quality metrics
4. Output as `FINAL_REQUIREMENT.md`

## Rules
- Include ALL phase outputs for completeness
- Quality metrics must be included
- File change summary with added/modified/deleted files

## Output
- `FINAL_REQUIREMENT.md` - Comprehensive requirement document containing all phase outputs
