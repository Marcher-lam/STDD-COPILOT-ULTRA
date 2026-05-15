---
description: 5-dimension confidence scoring for critical decisions
version: "1.0"
---

# STDD Skill: /stdd:certainty

## Purpose
Assess decision confidence across 5 dimensions at critical decision points, pausing for human confirmation when confidence is low.

## When to Use
- Before making irreversible architectural decisions
- At critical transitions (spec → design → implementation)
- When user or AI has low confidence in the current direction

## Workflow
1. Evaluate 5 dimensions: requirement clarity, technical feasibility, risk level, test coverage, alignment with vision
2. Score each dimension 1-5, calculate overall confidence
3. If below threshold (default 3.5), pause and request human confirmation
4. Document confidence assessment and rationale
5. Continue only when confidence is sufficient or human approves

## Rules
- Always assess before high-impact decisions
- Low confidence triggers HITL (human in the loop) gate
- Confidence scores are recorded for learning
- Threshold is configurable per project

## Output
- Confidence assessment report with scores per dimension
- Pause and confirmation prompt if below threshold
- Recorded confidence for learning system
