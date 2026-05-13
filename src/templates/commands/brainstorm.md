---
description: Read-only analysis mode for suggestions and exploration
---

# Command: /stdd:brainstorm

## Usage
```
/stdd:brainstorm                # Enter read-only analysis mode
```

## Description
Pure analysis suggestion mode. Provides read-only analysis of the codebase, architecture, or specific problems without modifying any project files.

## Constraints
- **Read-only analysis** - Does not create, modify, or delete any project files
- Provides suggestions, insights, and architectural analysis
- Safe to run at any time without affecting project state

## Execution Flow
1. Analyze the specified topic or current codebase
2. Provide insights, suggestions, and observations
3. Output analysis as chat response (no file modifications)

## Use Cases
- Architectural review
- Code quality assessment
- Technology evaluation
- Refactoring suggestions
- Risk identification

## Output
- Analysis report in chat (no files created or modified)
