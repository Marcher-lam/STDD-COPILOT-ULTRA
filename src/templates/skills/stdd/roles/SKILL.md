---
description: 12 Agent roles for multi-role collaboration
version: "1.0"
---

# STDD Skill: /stdd:roles

## Purpose
Enable multi-role collaboration with 12 specialized agent personas, plus executable Party Mode briefs and adversarial review scans.

## When to Use
- Switching perspectives between development phases
- Need specialized expertise (security review, UX design, etc.)
- Conducting role-based meetings or reviews

## Workflow
1. **start**: Initialize role system, display available roles
2. **switch <role>**: Switch to specific agent role with its expertise and constraints
3. **meeting**: Coordinate cross-role discussion for complex decisions
4. **party <topic>**: Generate a multi-role debate brief for a topic
5. **adversarial <path>**: Scan files for risk patterns and produce findings-first review output
6. Roles available: po, developer, tester, reviewer, architect, security, devops, ux, ba, techwriter, qalead, dataanalyst

## CLI Runtime
```bash
stdd roles list
stdd roles party "choose auth session strategy" --roles po,architect,security,tester
stdd roles adversarial src
stdd roles adversarial stdd/changes/add-auth --json
```

## Rules
- Each role has specific responsibilities and expertise areas
- PO writes requirements, Developer implements, Tester validates, Reviewer audits
- Role context persists until switched
- Security role enforces Article 7 compliance
- Adversarial review must report risks first; high-severity findings fail the command

## Output
- Role-switching display
- Role-specific output based on current persona
- Meeting minutes (meeting mode)
- Party Mode brief in `stdd/reports/party-mode-*.json`
- Adversarial findings in `stdd/reports/adversarial-review-*.json`
