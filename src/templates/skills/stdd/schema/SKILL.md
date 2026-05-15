---
description: JSON Schema / Zod type generation
version: "1.0"
---

# STDD Skill: /stdd:schema

## Purpose
Generate type schemas using JSON Schema and Zod, providing runtime validation and TypeScript type inference.

## When to Use
- Defining data types for domain models
- Need runtime validation alongside TypeScript types
- Creating validation schemas for API inputs/outputs

## Workflow
1. Parse type name and field definitions from specs
2. Generate JSON Schema with type, required, minLength, format constraints
3. Generate Zod schema from JSON Schema for runtime validation
4. Derive TypeScript types from Zod schema
5. Output schema files and types

## Rules
- Schema is source of truth for type definition
- All required fields marked explicitly
- Validation rules match BDD spec constraints
- TypeScript types inferred from Zod, not hand-written

## Output
- stdd/changes/xxx/specs/{type}.schema.json - JSON Schema
- src/schemas/{type}.ts - Zod schema
- Derived TypeScript types
