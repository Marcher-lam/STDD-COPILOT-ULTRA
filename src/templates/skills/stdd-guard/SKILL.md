---
description: TDD guard system - enforce test-first development
version: "1.0"
---

# STDD Skill: /stdd:guard

## Purpose
Enforce TDD discipline through guard hooks that validate test-first behavior and prevent anti-TDD patterns.

## When to Use
- Enforcing test-first rule before any implementation
- Preventing over-implementation (green without red)
- Ensuring tests fail on first run
- Preventing skipping refactoring step

## Workflow
1. **on**: Enable all guard rules
2. **off**: Disable all guard rules (for legacy migration or emergencies)
3. **status**: Display which rules are active and their enforcement level
4. **disable rule:<name>**: Disable specific rule temporarily
5. Guard rules: test-first (Blocking), minimal-impl (Warning), test-must-fail (Warning), no-skip-refactor (Suggestion)

## Rules
- test-first: MUST pass before implementation allowed
- minimal-impl: Warning when code exceeds test requirements
- test-must-fail: Warning when new test passes on first run
- no-skip-refactor: Suggestion to refactor after green

## Output
- Guard on/off confirmation
- Guard status with rule states
- Rule enforcement blocks (when rules violated)
