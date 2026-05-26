---
id: stdd.prfaq
command: /stdd:prfaq
description: Amazon Working Backwards PRFAQ 5-stage workflow with data-driven verdict scoring
version: "1.0"
category: planning
phase: explore
read_only: false
risk_level: low
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.init]
next: [stdd.propose, stdd.spec]
on_failure: []
inputs:
  - stage: ignition | press-release | customer-faq | internal-faq | verdict | full
  - idea: initial product idea
  - product: product name
---

# PRFAQ — Amazon Working Backwards

Execute the 5-stage PRFAQ workflow to validate product ideas before committing engineering resources.

## Stages

1. **Ignition** — Capture the initial spark, market timing, and hypothesis
2. **Press Release** — Write a customer-facing press release
3. **Customer FAQ** — Anticipated customer questions and answers
4. **Internal FAQ** — Engineering, security, and business questions
5. **Verdict** — Quantitative go/no-go with scoring matrix

## Usage

```
/stdd:prfaq full
/stdd:prfaq ignition --idea "Build an AI coding assistant"
/stdd:prfaq verdict
```

## Data Sources

- `package.json` for product name and description
- `stdd/vision.md` for project vision
- `stdd/changes/*/proposal.md` for active proposals
- `stdd/evidence/` for Constitution compliance data
