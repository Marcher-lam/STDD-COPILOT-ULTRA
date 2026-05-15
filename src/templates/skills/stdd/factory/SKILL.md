---
description: Test data factory generation (Builder/Faker/Nested Fixture)
version: "1.0"
---

# STDD Skill: /stdd:factory

## Purpose
Generate test data factories using Builder pattern, Faker.js, and nested fixtures for comprehensive test scenarios.

## When to Use
- Tests need realistic test data
- Creating variations of domain objects for different scenarios
- Need complex nested object graphs for integration tests

## Workflow
1. Analyze target type structure and required fields
2. Generate Builder class with fluent API for object construction
3. Integrate Faker.js for realistic random data generation
4. Generate preset scenarios (valid, edge case, invalid)
5. Support nested fixtures for complex object relationships

## Rules
- Factories produce valid objects by default
- Override methods allow test-specific customization
- Faker generates locale-aware data
- Nested fixtures auto-fill child relationships

## Output
- src/__factories__/{Type}Factory.ts - Builder factory
- src/__factories__/scenarios.ts - Preset scenario data
- Faker configuration and seed management
