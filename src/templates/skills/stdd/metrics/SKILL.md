---
description: Quality metrics dashboard - code quality, coverage, mutation score
version: "1.0"
---

# STDD Skill: /stdd:metrics

## Purpose
Display quality metrics dashboard including test coverage, mutation score, code complexity, and TDD compliance.

## When to Use
- Checking quality after code changes
- Before archiving a change (quality gate)
- Continuous quality monitoring during development

## Workflow
1. Collect metrics: test coverage, mutation score, lint warnings, type errors, complexity
2. Compare against quality thresholds (coverage >= 80%, mutation >= 70%)
3. Display dashboard with pass/fail indicators
4. Optionally export report for CI/CD integration

## Rules
- Metrics are collected from latest test run
- Failing metrics block archive unless --force used
- Export format: JSON/YAML for CI/CD integration
- Track trend across changes (improve or degrade)

## Output
- Quality metrics dashboard display
- Exported report (--export flag)
- Trend analysis across changes
