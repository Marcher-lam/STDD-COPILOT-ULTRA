---
description: Pure analysis mode - read-only brainstorming
version: "1.0"
---

# STDD Skill: /stdd:brainstorm

## Purpose
Enter read-only analysis mode for brainstorming, exploring ideas and approaches without modifying any project files.

## When to Use
- Need to explore ideas before committing to a direction
- Evaluating multiple approaches
- Want AI analysis without side effects

## Workflow
1. Accept analysis query or topic
2. Read relevant project files for context
3. Analyze and brainstorm options, tradeoffs, recommendations
4. Provide structured analysis output
5. NO files are created, modified, or deleted

## Rules
- STRICT read-only: never create, modify, or delete files
- Base analysis on actual project state, not assumptions
- Present multiple options with pros/cons
- Output is displayed in session, not persisted to files

## Output
- Analysis and recommendations displayed in session
- No files created or modified
