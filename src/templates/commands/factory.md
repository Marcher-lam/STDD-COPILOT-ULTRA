---
description: Test data factory generation (Builder/Faker/Nested Fixture)
---

# Command: /stdd:factory

## Usage
```
stdd factory generate <TypeName>             # Generate factory
stdd factory list                            # List existing factories
stdd factory scan                            # Scan for types
stdd factory init                            # Initialize factory directory
stdd factory scenarios                       # Generate scenarios file
```

## Description
Generate test data factories using Builder pattern, Faker.js, and nested fixtures for comprehensive test scenarios.

## Execution Flow
1. Detect type or accept name
2. Generate factory template
3. Add Faker.js integration
4. Create builder methods
5. Add preset scenarios

## Output
- Factory file in `src/__factories__/`
- Builder pattern implementation
- Faker.js integration
- Preset test scenarios
