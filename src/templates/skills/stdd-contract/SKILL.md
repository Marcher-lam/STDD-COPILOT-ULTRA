---
description: Consumer contract testing
version: "1.0"
---

# STDD Skill: /stdd:contract

## Purpose
Generate and manage consumer-driven contracts to ensure API provider and consumer compatibility.

## When to Use
- Testing API integration between services
- Ensuring provider changes don't break consumers
- Pact-based contract testing workflow

## Workflow
1. Extract consumer expectations from specs
2. Generate consumer contract: expected requests/responses, status codes, schema validation
3. Run provider verification against contract
4. Publish contract to broker for sharing
5. Validate provider responses match consumer expectations

## Rules
- Consumer drives the contract (consumer-first)
- Contract is source of truth for integration testing
- Provider verification must pass before deployment
- Contracts versioned and published to broker

## Output
- stdd/changes/xxx/contracts/{consumer}-{provider}.pact.json
- Contract verification report
- Published contract in broker
