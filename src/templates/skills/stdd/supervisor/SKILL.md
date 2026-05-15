---
description: Multi-agent coordinator (Supervisor pattern)
version: "1.0"
---

# STDD Skill: /stdd:supervisor

## Purpose
Coordinate multiple AI agents working on different tasks, managing delegation, status, and synchronization.

## When to Use
- Complex changes requiring parallel work across domains
- Need to delegate specific tasks to specialized agents
- Managing status of multiple concurrent workflows

## Workflow
1. **start**: Initialize supervisor with task queue, assign agents to tasks, set up communication channels
2. **status**: Display agent states, task progress, bottlenecks, and completion percentage
3. **stop**: Gracefully halt all agents, save intermediate state, generate completion report
4. Supervisor routes tasks to appropriate agents based on expertise
5. Agents report progress back to supervisor for coordination

## Rules
- Each agent works on isolated task scope
- Supervisor enforces dependency ordering
- Failed tasks are retried or escalated to human
- State is persisted for cross-session recovery

## Output
- Agent assignment plan
- Status dashboard display
- Completion/failure reports
