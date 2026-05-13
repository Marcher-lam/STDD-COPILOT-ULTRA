---
description: Read-only exploration mode for business code and architecture
---

# Command: /stdd:explore

## Usage
```
/stdd:explore <exploration target>       # Specify exploration target (required)
/stdd:explore --deep                     # Deep exploration
```

## Description
Enters read-only exploration mode to analyze business code and architecture. The exploration target is required - if not provided, the system will ask what you want to explore.

## Execution Flow
1. Identify exploration target from user input
2. Analyze business code in `src/` directory
3. Examine existing components, services, utilities
4. Review API interfaces and data models
5. Study test files and testing patterns
6. Generate exploration report

**Explore:**
- `src/` directory business code
- Existing components, services, utilities
- API interfaces and data models
- Test files and testing patterns

**Do NOT explore:**
- `.claude/` (STDD command configuration)
- `stdd/` (STDD working directory)
- `schemas/` (specification templates)
- `AGENTS.md` (AI instructions)

## Output
- `stdd/explorations/explore-YYYYMMDD-HHMMSS.md`

## Examples
```bash
/stdd:explore Understand the existing user authentication flow
/stdd:explore Analyze API error handling patterns
/stdd:explore Evaluate introducing Zustand to replace Redux
```
