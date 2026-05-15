---
description: API specification first - OpenAPI/TypeScript type generation
version: "1.0"
---

# STDD Skill: /stdd:api-spec

## Purpose
Generate API specifications using OpenAPI format with TypeScript type generation, enabling contract-first development.

## When to Use
- Defining API endpoints before implementation
- Need TypeScript types from API schema
- Ensuring frontend/backend contract alignment

## Workflow
1. Extract API requirements from current specs
2. Generate OpenAPI spec: paths, methods, parameters, request/response schemas
3. Generate TypeScript types from OpenAPI schema
4. Validate spec consistency with existing specs
5. Output API spec and types

## Rules
- Spec-first: define API before implementing
- Types must be consistent with BDD specs
- Validate against OpenAPI 3.0 schema
- Include error response definitions

## Output
- stdd/changes/xxx/specs/api-spec.yaml - OpenAPI specification
- src/types/api.ts - Generated TypeScript types
- Validation report
