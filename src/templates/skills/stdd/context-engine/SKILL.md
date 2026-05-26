---
id: stdd.context-engine
command: /stdd:context-engine
description: LLM-optimized document distillation and context sharding for large codebases
version: "1.0"
category: engineering
phase: all
read_only: true
risk_level: low
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.init]
next: [stdd.party-mode, stdd.roles]
on_failure: []
inputs:
  - action: distill | shard | status | estimate
  - target: file path or directory
---

# Context Engine

Distill and shard project documents for LLM context optimization.

## Actions

- **distill** — Compress code to signatures, markdown to headings, specs to scenarios
- **shard** — Split documents into LLM-context-sized chunks with breadcrumb navigation
- **status** — Show current distillation/sharding state
- **estimate** — Token count estimation without writing files

## Usage

```
/stdd:context-engine distill .
/stdd:context-engine shard stdd/specs/
/stdd:context-engine estimate stdd/changes/
```

## Output

- `stdd/distilled/project-summary.md` — Distilled project skeleton
- `stdd/shards/shard-001.md` — Numbered shard files
- `stdd/shards/shard-map.json` — Machine-readable shard index
