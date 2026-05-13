---
description: Draft a new feature requirement with boundary clarification
---

# Command: /stdd:propose

## Usage
```
/stdd:propose <requirement description>        # Draft requirement proposal
```

## Description
Proposes a new feature requirement draft with boundary clarification. Detects if the requirement is too large (Epic) and requests splitting if necessary. Automatically supplements boundary questions and implicit constraints.

## Execution Flow
1. Parse requirement description
2. Check if requirement is too large (Epic detection)
   - If too large, request splitting into smaller changes
3. Analyze requirement boundaries and identify implicit constraints
4. Generate clarifying questions for edge cases
5. Write result to `stdd/changes/<change>/proposal.md`

## Key Principles
- Detect oversized Epics and request splitting
- Auto-supplement boundary questions and implicit constraints
- Focus on external observable behavior, not implementation details

## Output
- `stdd/changes/<change>/proposal.md` with clarified requirement

## Next Step
- After proposal, proceed to `/stdd:clarify`
