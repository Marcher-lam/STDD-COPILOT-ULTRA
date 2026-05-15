---
description: Three-tier documentation context management
version: "1.0"
---

# STDD Skill: /stdd:context

## Purpose
Manage three-tier documentation context to keep AI sessions focused and token-efficient.

## When to Use
- AI needs project context for decision-making
- Session context needs refreshing after long breaks
- Context needs exporting for sharing between sessions

## Workflow
1. **Foundation tier**: Load tech stack, conventions, project structure (~500 tokens)
2. **Component tier**: Load component topology, module relationships (~1000 tokens)
3. **Feature tier**: Load current task, related specs, design decisions (~2000 tokens)
4. Assemble context in priority order (foundation → component → feature)
5. Cache for current session, refresh on demand

## Rules
- Foundation tier is always loaded first
- Component tier only loads relevant components for current task
- Feature tier is scoped to active change only
- Never exceed ~3500 total context tokens

## Output
- Context assembly display
- stdd/memory/context-cache/ (when refreshed)
- Exported context files (--export flag)
