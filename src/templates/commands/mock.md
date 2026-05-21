---
description: Auto mock generation for dependencies
---

# Command: /stdd:mock

## Usage
```
stdd mock generate <target>                  # Generate mock
stdd mock module <module-name>               # Generate module mock
stdd mock function <function-name>           # Generate function mock
stdd mock api <api-name>                     # Generate API mock
stdd mock list                               # List existing mocks
stdd mock scan                               # Scan for dependencies
stdd mock init                               # Initialize mocks directory
```

## Description
Automatically generate mock implementations for external dependencies to enable isolated unit testing.

## Execution Flow
1. Detect target type (module/function/api)
2. Scan source for usage patterns
3. Generate appropriate mock template
4. Save to `src/__mocks__/` directory
5. Update index if needed

## Output
- Mock file in `src/__mocks__/`
- Jest-compatible mocks
- API handlers with MSW support
