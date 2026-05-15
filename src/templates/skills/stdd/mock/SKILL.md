---
description: Auto mock generation for dependencies
version: "1.0"
---

# STDD Skill: /stdd:mock

## Purpose
Automatically generate mock implementations for external dependencies to enable isolated unit testing.

## When to Use
- Unit tests need to isolate from external services (DB, HTTP, file system)
- Interface-based design requiring mock implementations
- Need fake implementations for integration tests

## Workflow
1. Analyze dependency interfaces (methods, return types)
2. Generate mock with configurable return values
3. For --all: scan project for all external dependencies and generate mocks
4. For --fake: generate working fake implementation (not just stub)
5. Inject mocks into tests as needed

## Rules
- Mocks match interface signatures exactly
- Default behavior returns safe defaults
- Mock history tracks call patterns for verification
- Fake implementations provide working data, not empty stubs

## Output
- src/__mocks__/{service}.mock.ts - Mock implementations
- src/__fakes__/{service}.fake.ts - Fake implementations (--fake mode)
- Mock configuration files
