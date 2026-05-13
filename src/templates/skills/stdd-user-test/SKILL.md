---
description: User test script generation
version: "1.0"
---

# STDD Skill: /stdd:user-test

## Purpose
Generate user acceptance test scripts from BDD specifications, enabling non-technical validation of implemented features.

## When to Use
- Need to validate implemented features from user perspective
- Generating acceptance test scripts for QA or stakeholders
- Creating demo/test scripts for stakeholders

## Workflow
1. Parse BDD scenarios from current specs
2. Generate step-by-step user test scripts in plain language
3. Include expected outcomes and screenshots/recordings placeholders
4. Generate test data needed for script execution
5. Output test script for manual or automated execution

## Rules
- Scripts must be understandable by non-technical users
- Each BDD scenario maps to a user test script
- Include setup/teardown steps
- Expected results must be verifiable

## Output
- stdd/changes/xxx/user-test.md - User test scripts
- Test data files for script execution
- Expected results documentation
