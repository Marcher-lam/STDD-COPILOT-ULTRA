---
description: Vector database memory system
version: "1.0"
---

# STDD Skill: /stdd:memory

## Purpose
Semantic search and persistent memory storage using vector embeddings.

## When to Use
- Saving important context for future sessions
- Searching past decisions and patterns semantically
- Checking memory statistics and coverage

## Workflow
1. **save**: Embed content, store in vector DB with metadata (timestamp, topic, change-id)
2. **search**: Query by semantic similarity, return top-k results with relevance scores
3. **stats**: Display memory size, topics, last-updated, embedding model info
4. Memories are indexed by topic and associated with change IDs for contextual retrieval

## Rules
- Only save high-value information (decisions, patterns, insights)
- Never store secrets or credentials
- Use consistent topic tags for better retrieval
- Memory persists across sessions via stdd/memory/ directory

## Output
- Vector embeddings stored in stdd/memory/vectors/
- Search results with relevance scores
- Memory statistics report
