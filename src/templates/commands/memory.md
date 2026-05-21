---
description: Vector database memory system
---

# Command: /stdd:memory

## Usage
```
stdd memory scan                             # Scan and index memory
stdd memory search "<query>"                 # Semantic search
stdd memory add "<content>"                  # Add to memory
stdd memory list                             # List memory entries
stdd memory status                           # Show memory statistics
stdd memory clear                            # Clear memory
stdd memory export                           # Export memory
stdd memory import                           # Import memory
```

## Description
Semantic search and persistent memory storage using vector embeddings for cross-session context retention.

## Execution Flow
1. Scan project for artifacts
2. Generate vector embeddings
3. Store in vector database
4. Enable semantic search
5. Maintain statistics

## Output
- Memory index in `stdd/memory/`
- Search results with relevance scores
- Memory statistics and coverage
