---
description: STDD Constitution management - 9 development articles enforcement and waivers
---

# Command: /stdd:constitution

## Usage
```
/stdd:constitution                                       # View all articles
/stdd:constitution show 2                                # View specific article details
/stdd:constitution check                                 # Check code compliance
/stdd:constitution check --changed                       # Check only modified files
/stdd:constitution waivers                               # View current waivers
/stdd:constitution waiver --article=2 --reason="Legacy migration" --days=30  # Request waiver
```

## Description
STDD Constitution management for the 9 development articles enforcement and waiver system. Provides commands to view articles, check code compliance, and manage waivers.

## 9 Articles by Priority

| Priority | Article | Name | Enforcement |
|----------|---------|------|-------------|
| **Blocking** | 2 | TDD | Hook blocking |
| **Blocking** | 7 | Security | Hook blocking |
| **Blocking** | 9 | CI/CD | CI gate |
| Warning | 1 | Library-First | Warning prompt |
| Warning | 3 | Small Commits | Warning prompt |
| Warning | 4 | Code Style | Hook check |
| Warning | 6 | Error Handling | Suggestion prompt |
| Suggestion | 5 | Documentation | Suggestion prompt |
| Suggestion | 8 | Performance | Suggestion prompt |

## Waiver Management
```yaml
# stdd/constitution/waivers.yaml
waivers:
  - id: waiver-2024-001
    article: 2
    reason: "Legacy migration phase 1"
    scope: "src/legacy/**"
    expires: 2024-06-01
    approved_by: team-lead
```

## Execution Flow
1. **View Articles**: Display all 9 articles or specific article details
2. **Check Compliance**: Run constitution checks against codebase
3. **Manage Waivers**: View, create, or review waivers
4. **Audit Trail**: Track all constitution-related decisions

## Output
- Article details and status
- Compliance check results
- Waiver list and status
- Audit log of constitution actions
