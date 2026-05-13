---
description: Exploration mode - read-only analysis of existing system
version: "1.0"
---

# STDD Skill: /stdd:explore

## Purpose
Read-only exploration mode for analyzing existing codebase architecture, patterns, and constraints before making changes.

## When to Use
- Need to understand existing system before proposing changes
- Technical feasibility assessment
- Architecture analysis for refactoring
- Don't know the system well enough to start

## Workflow
1. Analyze project structure and tech stack
2. Identify constraints: framework limits, code conventions, dependencies
3. Explore multiple implementation approaches with pros/cons
4. Generate exploration report at stdd/explorations/explore-YYYYMMDD-HHMMSS.md
5. Report auto-feeds into /stdd:new as context

## Rules
- READ-ONLY: never modify, create, or delete project files
- Explore src/ business code, NOT .claude/ or stdd/ config
- Explore target is required - ask if not provided
- Exploration report becomes context for subsequent change proposal

## Output
- stdd/explorations/explore-YYYYMMDD-HHMMSS.md
- Analysis findings, constraints, options, recommendation
