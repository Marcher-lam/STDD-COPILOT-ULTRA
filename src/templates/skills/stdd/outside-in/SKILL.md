---
description: Outside-in TDD (E2E → Integration → Unit)
version: "1.0"
---

# STDD Skill: /stdd:outside-in

## Purpose
Implement features using outside-in TDD approach: start with E2E tests, then integration tests, then unit tests.

## When to Use
- Building user-facing features
- Want tests to drive design from user perspective
- Ensuring end-to-end behavior is specified first

## Workflow
1. E2E: Write end-to-end test simulating user interaction (failing)
2. Integration: Write integration test for component/service boundary (failing)
3. Unit: Write unit tests for internal logic (failing)
4. Implement from inside out: unit → integration → E2E
5. All tests passing confirms feature works end-to-end

## Rules
- E2E test is outer shell - defines user-visible behavior
- Integration test wires components together
- Unit tests drive internal design
- Each layer's test drives the next layer's implementation

## Output
- E2E test files (Playwright/Cypress/etc.)
- Integration test files
- Unit test files
- Implementation code
