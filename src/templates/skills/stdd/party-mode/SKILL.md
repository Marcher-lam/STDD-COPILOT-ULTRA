---
id: stdd.party-mode
command: /stdd:party-mode
description: Real multi-agent party mode with independent subagent spawning and cross-talk analysis
version: "2.0"
category: collaboration
phase: explore
read_only: true
risk_level: low
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.init]
next: [stdd.propose, stdd.brainstorm]
on_failure: []
inputs:
  - topic: discussion topic
  - roles: comma-separated role IDs
  - rounds: number of cross-talk rounds (default: 2)
---

# Party Mode — Real Subagent Discussion

Spawn multiple agent personas as independent subagents for structured multi-perspective analysis.

## Features

- Real subagent spawning (not simulation) when AI CLI is available
- N-round cross-talk with shared context
- Convergence detection and influence matrix
- Fallback to prompt-only mode without executor

## Usage

```
/stdd:party-mode "auth system design" --roles po,architect,security,developer
/stdd:party-mode "database migration" --rounds 3
```

## Personas Available

12 named agents: Maya(PO), Alex(Developer), Sam(Tester), Rex(Reviewer), Wei(Architect), Shield(Security), Ops(DevOps), Luna(UX), Jordan(BA), Page(TechWriter), QC(QALead), Data(DataAnalyst)
