---
description: Generate final documentation from all phase artifacts
version: "1.0"
---

# STDD Skill: /stdd:final-doc

## Purpose
Aggregate all phase outputs (proposal, specs, design, tasks, implementation) into comprehensive final documentation.

## When to Use
- After implementation is complete
- Need complete documentation for review or handoff
- Before archiving the change

## Workflow
1. Collect all phase artifacts: proposal, specs, design, tasks, implementation results
2. Aggregate into unified document structure
3. Include quality metrics, test results, and coverage data
4. Generate FINAL_REQUIREMENT.md as the definitive record
5. Link final doc to the change record

## Rules
- Final doc includes ALL phase outputs for completeness
- Quality metrics must be included (coverage, mutation score)
- File change summary with added/modified/deleted files
- Final doc is the source of truth for the completed change

## Output
- FINAL_REQUIREMENT.md - Comprehensive final document
- Aggregated quality metrics and test results
- File change summary
