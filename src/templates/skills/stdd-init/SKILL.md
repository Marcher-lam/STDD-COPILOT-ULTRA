---
description: Initialize STDD project structure
version: "1.0"
---

# STDD Skill: /stdd:init

## Purpose
Initialize the STDD project directory structure, creating specs/, changes/, memory/, graph/, and config.yaml.

## When to Use
- Starting a new STDD project
- Re-initializing existing project (--force)
- Enabling vector database memory (--with-memory)

## Workflow
1. Create stdd/ directory structure:
   - stdd/specs/ - Source of Truth (BDD specs)
   - stdd/changes/ - Change management (with archive/)
   - stdd/memory/ - Memory store (foundation.md, components.md, contracts.md)
   - stdd/graph/ - Graph engine configuration
   - stdd/config.yaml - Project configuration
2. Initialize config.yaml with project metadata
3. Optionally enable vector database memory
4. Verify structure integrity

## Rules
- Never overwrite existing specs unless --force is used
- Always preserve changes/ archive directory
- Validate config.yaml schema after creation

## Output
- stdd/specs/ directory
- stdd/changes/ directory (with archive/)
- stdd/memory/ directory
- stdd/graph/ directory
- stdd/config.yaml
