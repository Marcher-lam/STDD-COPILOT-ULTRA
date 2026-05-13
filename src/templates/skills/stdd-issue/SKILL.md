---
description: Bug TDD fix - issue resolution mode
version: "1.0"
---

# STDD Skill: /stdd:issue

## Purpose
Handle bug resolution using TDD workflow: classify bug, write failing test first, implement minimal fix, verify no regression.

## When to Use
- Fixing reported bugs or regressions
- Need systematic approach to bug resolution
- Want to prevent future regressions with tests

## Workflow
1. Classify bug: severity, component, reproduction steps
2. Write failing test that reproduces the bug first
3. Confirm test fails (verifies bug exists)
4. Implement minimal fix to make test pass
5. Run full test suite to verify no regression
6. Document bug and fix for future reference

## Rules
- Bug fix MUST start with a failing test (test-first)
- Fix must be minimal - only change what's needed
- Full regression suite must pass
- Bug reproduction steps captured in test

## Output
- Bug reproduction test file
- Minimal fix implementation
- Bug report with fix documentation
- Regression test results
