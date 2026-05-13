---
description: Adaptive learning from feedback
version: "1.0"
---

# STDD Skill: /stdd:learn

## Purpose
Adapt STDD behavior based on user feedback and Pattern Teaching scans that extract project-local code, test, naming, module, and error-handling conventions.

## When to Use
- User provides positive/negative feedback
- User suggests improvements to the process
- Checking current learning state and preferences

## Workflow
1. **scan / analyze-patterns**: Extract module style, test style, naming distribution, async style, error handling, comments, and common imports
2. **good "feedback"**: Record positive pattern, increase weight of related strategies
3. **bad "feedback"**: Record negative pattern, decrease weight, add to avoid list
4. **suggest "improvement"**: Record enhancement suggestion, add to improvement backlog
5. **status**: Display learning state, extracted pattern availability, and feedback count
6. Adapt templates, defaults, and suggestions based on learned patterns

## CLI Runtime
```bash
stdd learn scan
stdd learn analyze-patterns
stdd learn good "prefer explicit error objects"
stdd learn bad "avoid implicit any in tests"
stdd learn status --json
```

## Rules
- Learning is per-project (stored in stdd/)
- Never learn harmful patterns (security risks, anti-patterns)
- User can review and reset learned preferences
- Patterns are weighted by frequency and recency

## Output
- Stored feedback in `stdd/memory/learning/feedback.jsonl`
- Extracted patterns in `stdd/memory/learning/code-patterns.json`
- Human-readable guide in `stdd/memory/learning/styleguide.md`
- Learning status display
- Improvement suggestions
