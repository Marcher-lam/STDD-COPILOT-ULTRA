---
description: Constitution governance - manage 9 development articles with compliance checking
version: "1.0"
---

# STDD Skill: /stdd:constitution

## Purpose
Manage the STDD Constitution — 9 development articles that enforce code quality standards. Support check, status, fix, audit, and waiver operations.

## When to Use
- Checking compliance before commit or archive
- Viewing specific article details
- Managing temporary waivers for legacy code
- Running historical compliance audits

## Workflow
1. **show** (default): Display all 9 articles or a specific article
2. **check**: Run compliance check against all articles
3. **status**: Show constitution health status
4. **fix**: Auto-fix violations where possible
5. **audit**: Historical compliance trend analysis
6. **waive**: Create temporary waiver with reason and expiry

## Articles
| Priority | Article | Principle |
|----------|---------|-----------|
| Blocking | 2: TDD | Test-first + coverage gate + mutation evidence |
| Blocking | 7: Security | Security first |
| Blocking | 9: CI/CD | Automated pipeline |
| Warning | 1: Library-First | Prefer mature libraries |
| Warning | 3: Small Commits | Atomic commits |
| Warning | 4: Code Style | Unified style |
| Warning | 6: Error Handling | Explicit error handling |
| Suggestion | 5: Documentation | Docs as code |
| Suggestion | 8: Performance | Performance by default |

## Rules
- Blocking violations halt the pipeline
- Waivers require reason and expiry date
- Audit trail is maintained for all waiver decisions

## Output
- Compliance check results per article
- Constitution health status
- Waiver records with audit trail
