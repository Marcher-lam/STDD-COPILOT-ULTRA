---
description: Multi-agent coordinator (Supervisor pattern)
---

# Command: /stdd:supervisor

## Usage
```
stdd supervisor start "<topic>"              # Start supervisor session
stdd supervisor consult                      # Get recommendations
stdd supervisor review [change]              # Review work
stdd supervisor debate "<topic>"             # Agent debate
stdd supervisor roles                        # List available roles
stdd supervisor status                       # Show session status
stdd supervisor history                      # Show session history
```

## Description
Coordinate multiple AI agents working on different tasks, managing delegation, status, and synchronization.

## Execution Flow
1. Select participating agent roles
2. Define topic or task
3. Run discussion rounds
4. Collect recommendations
5. Record session for history

## Output
- Multi-agent recommendations
- Discussion summary
- Session history in `stdd/supervisor/sessions.jsonl`
