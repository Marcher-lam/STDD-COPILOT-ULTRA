---
id: /stdd:prfaq
description: Amazon Working Backwards PRFAQ workflow
---

# PRFAQ Workflow

Execute the Amazon Working Backwards PRFAQ method with data-driven scoring.

## Stages

- `ignition` — Capture the initial product spark
- `press-release` — Write customer-facing press release
- `customer-faq` — Customer questions and answers
- `internal-faq` — Engineering/business questions
- `verdict` — Quantitative go/no-go scoring
- `full` — Run all 5 stages

## Usage

```bash
stdd prfaq full
stdd prfaq ignition --idea "Build an AI assistant"
stdd prfaq verdict
stdd prfaq press-release --product "MyApp"
```
