---
description: Generate a comprehensive product proposal report from all project artifacts
version: "1.0"
---

# STDD Skill: /stdd:product-proposal

## Purpose
Aggregate all project artifacts (vision, proposals, specs, design, tasks, evidence, metrics) into a comprehensive product proposal report following a standard product proposal format.

## When to Use
- After completing multiple changes and needing a product-level summary
- Before presenting to stakeholders or investors
- When onboarding new team members with a comprehensive product overview
- At project milestones or release planning
- When the product manager needs a structured product document

## Workflow
1. Scan `stdd/` directory for all available artifacts:
   - `stdd/vision.md` — Project vision
   - `stdd/changes/*/proposal.md` — Change proposals
   - `stdd/changes/*/specs/*.feature` — BDD specifications
   - `stdd/changes/*/design.md` — Technical design documents
   - `stdd/changes/*/tasks.md` — Task breakdowns
   - `stdd/changes/*/evidence/` — Implementation evidence
   - `stdd/changes/archive/` — Archived changes
   - `stdd/config.yaml` — Project configuration
   - `stdd/progress.jsonl` — Progress history
2. Read and parse all found artifacts
3. Structure the data into a standard product proposal format with 15 sections
4. Generate `PRODUCT-PROPOSAL.md` in the project root or specified output path
5. Print summary to console

## Report Sections (15)
1. **Product Overview** — One-line description, product nature, core metrics
2. **Market Analysis** — Industry background, market size, trends
3. **User Personas & Scenarios** — User types, use cases, workflow scenarios
4. **Product Positioning & Value Proposition** — Positioning, value per user, USPs
5. **Core Feature List** — Feature inventory with priority and maturity
6. **Product Architecture** — System architecture diagram, directory structure
7. **Workflow Design** — Standard workflows, dual-mode, dual-scenario
8. **PM Capability Matrix** — Covered capabilities, gaps
9. **Quality Assurance** — Constitution articles, gates, testing, audit
10. **Tech Stack & Dependencies** — Technology choices, design principles
11. **Competitive Analysis** — Feature comparison with alternatives
12. **Product Roadmap** — Completed, near-term, mid-term, long-term
13. **Success Metrics & KPIs** — Product, quality, user value metrics
14. **Risk Analysis** — Product, technical, market risks with mitigation
15. **Appendix** — Command lists, roles, artifacts, file index

## Rules
- Report MUST follow the 15-section structure strictly
- When artifacts are missing, generate placeholder sections with TODO markers
- Extract real data from artifacts where available (proposal descriptions, task counts, spec coverage)
- Include actual Constitution articles from the project
- Use Chinese (简体中文) for section headers and body text by default; `--lang en` for English
- Output file is `PRODUCT-PROPOSAL.md` by default; `--output` to customize
- `--json` outputs structured data instead of Markdown

## Output
- `PRODUCT-PROPOSAL.md` — Comprehensive product proposal report
- Console summary with section count and artifact coverage stats
