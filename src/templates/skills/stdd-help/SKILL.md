---
description: Context-aware help system
version: "1.0"
---

# STDD Skill: /stdd:help

## Purpose
Provide context-aware help based on current project state and user needs.

## When to Use
- User asks for help with any STDD command
- User needs guidance on next steps
- User wants documentation for specific topics (tdd, graph, etc.)

## Workflow
1. Detect current project state (init/new/spec/design/apply/archive)
2. Identify relevant commands and skills for current phase
3. Display contextual help with examples
4. If specific topic requested (tdd/graph/constitution), filter to that domain

## Rules
- Always show next recommended command based on current state
- Include command examples with options
- Link to relevant documentation files

## Output
- Contextual help display in terminal
- No files created or modified
