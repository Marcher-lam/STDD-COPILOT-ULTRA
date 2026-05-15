---
description: Code complexity assessment and quality metrics
version: "1.0"
---

# STDD Skill: /stdd:complexity

## Purpose
Quantify code complexity using APP mass analysis, providing complexity metrics for refactoring decisions.

## When to Use
- Before refactoring to identify complexity hotspots
- During TDD refactor phase to measure improvement
- Code review to assess maintainability

## Workflow
1. Analyze codebase for cyclomatic complexity, cognitive complexity, and APP mass
2. Identify complexity hotspots (files/functions above threshold)
3. Generate complexity report with per-file and per-function scores
4. Provide refactoring recommendations for high-complexity areas
5. Track complexity trend across changes

## Rules
- Complexity threshold: functions should be < 10 cyclomatic complexity
- Identify top-10 most complex files for prioritized refactoring
- APP mass gives aggregate measure of overall codebase health
- Trend data shows whether complexity is improving or degrading

## Output
- Complexity report with per-file and per-function scores
- Top-10 complexity hotspots
- Refactoring recommendations
- Complexity trend data
