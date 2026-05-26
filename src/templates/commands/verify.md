---
description: Validate implementation consistency with specifications
---

# Command: /stdd:verify

## Usage
```
/stdd:verify                   # Verify current change
/stdd:verify --all             # Verify all changes
/stdd:verify --fix             # Auto-fix inconsistencies
```

## Description
Validates that the implementation is consistent with the specifications. Checks multiple dimensions including API signature consistency, BDD scenario coverage, TypeScript types, boundary/exception handling, and documentation consistency.

## Execution Flow
1. Read current change specs and implementation
2. Validate across multiple dimensions:

| Dimension | Checks |
|-----------|--------|
| Interface | API signature consistency |
| Behavior | BDD scenario coverage |
| Types | TypeScript type correctness |
| Boundary | Null/exception handling |
| Documentation | Comment consistency |

3. Generate verification report
4. Optionally auto-fix detected issues with `--fix`

## Visual Constitution Gate

When `defense.visual_regression.enabled: true` is set in `stdd/config.yaml`, the verify command automatically triggers Playwright screenshot comparison for the configured routes before completing verification.

```yaml
# stdd/config.yaml
defense:
  visual_regression:
    enabled: true
    routes:
      - "/"
      - "/dashboard"
      - "/settings"
    threshold: 0.01   # max 1% pixel diff
    viewport:
      width: 1280
      height: 720
```

**Behavior:**
- For each configured route, a screenshot is captured via Playwright and compared against the stored visual baseline
- If the pixel diff ratio exceeds the configured threshold (default `0.01` = 1%), verification is **blocked** and the route is marked as failed
- Visual diff images are saved alongside the verification report for manual review
- Requires Playwright installation: `npm install playwright`

**Prerequisites:**
- Playwright browsers must be installed (`npx playwright install`)
- Baseline screenshots must exist (use `stdd browser update-baseline` to create them)

## Output
- Verification report with pass/fail status per dimension
- List of inconsistencies (if any)
- Auto-fix diff (with `--fix` flag)
- Visual regression diff images and pass/fail per route (when enabled)
