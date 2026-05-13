---
description: Initialize STDD project structure
---

# Command: /stdd:init

## Usage
```
/stdd:init                    # Initialize project
/stdd:init --force            # Force re-initialization
/stdd:init --with-memory      # Enable vector database memory
```

## Description
Initializes the STDD project directory structure, creating the working directory with specs, changes, memory, graph, and configuration files.

## Execution Flow
1. Create `stdd/` working directory
2. Initialize subdirectories:
   - `specs/` - Source of Truth
   - `changes/` with `archive/` subdirectory
   - `memory/` (foundation.md, components.md, contracts.md)
   - `graph/` - Graph configuration
   - `config.yaml` - Project configuration
3. Optionally enable vector database memory
4. Register project in engine configuration

## Referenced Skill
- `/stdd-skills/1-proposal`

## Output
```
stdd/
├── specs/              # Source of Truth
├── changes/            # Change management
│   └── archive/        # Archive
├── memory/             # Memory bank
│   ├── foundation.md
│   ├── components.md
│   └── contracts.md
├── graph/              # Graph configuration
└── config.yaml         # Project configuration
```
