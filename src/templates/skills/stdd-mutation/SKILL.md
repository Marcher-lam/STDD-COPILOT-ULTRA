---
description: Mutation testing (Quick AI + Deep Stryker)
version: "1.0"
---

# STDD Skill: /stdd:mutation

## Purpose
Run mutation testing to detect weak test assertions, using Quick AI for fast feedback and Deep Stryker for thorough analysis.

## When to Use
- After TDD green phase to verify test quality
- Detecting tests that pass despite incorrect implementation
- Before archiving to ensure test robustness

## Workflow
1. Quick AI mutation: Pseudo-modify implementation, run tests to detect fake-green
2. Deep Stryker mutation: Systematically mutate code operators, check test failures
3. Calculate mutation score: mutants killed / total mutants
4. Generate mutation report: surviving mutants indicate test gaps
5. Set threshold (default 80%) - fail if below

## Rules
- Mutation test required after each green phase
- Surviving mutants must be addressed (improve tests)
- Quick AI runs first for fast feedback, Deep Stryker for thorough check
- Mutation score threshold enforced before archive

## Output
- Mutation test report (quick + deep)
- Surviving mutants list with recommendations
- Mutation score with pass/fail status
