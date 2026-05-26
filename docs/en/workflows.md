# Workflows

Common patterns and usage scenarios for STDD Copilot Ultra v2.0.0.

## Quick Start Wizard

```bash
stdd start                    # Interactive wizard, auto-recommends workflows
```

`stdd start` provides a one-stop interactive wizard that automatically recommends appropriate workflow paths based on project type and requirements. This is the recommended way to get started.

## Quick Start Workflow

```bash
stdd init                              # Initialize project
stdd new change "add user auth"        # Start a change
# In AI assistant:
/stdd:propose                           # Write a proposal
/stdd:spec                              # Write specification
/stdd:plan                              # Create implementation plan
/stdd:apply                             # Apply changes (TDD cycle)
/stdd:verify                            # Verify all evidence
stdd status                             # Check status
```

## Feature Development (Standard Profile)

1. **Propose**: `/stdd:propose` — Describe the feature, its value, and scope
2. **Clarify**: `/stdd:clarify` — Ask and answer clarifying questions
3. **Spec**: `/stdd:spec` — Write a formal specification with acceptance criteria
4. **Plan**: `/stdd:plan` — Break down into tasks with dependencies
5. **TDD Cycle**: `/stdd:apply` → `/stdd:verify` — Red-Green-Refactor with evidence
6. **Archive**: `/stdd:archive` — Mark complete and store artifacts

## Bug Fix (Quick Profile)

```bash
stdd new change "fix login timeout"
/stdd:fix-packet          # Generate failure context (Golden Packet)
/stdd:apply               # Apply fix with TDD
/stdd:verify              # Verify fix and no regression
```

## Multi-Agent Review (Party Mode)

```bash
/stdd:roles               # List 12 available personas
/stdd:party-mode          # Start multi-agent discussion
# Specify topic and roles:
# "Discuss security implications of the new API"
# Participants: Shield (Security), Wei (Architect), Rex (Reviewer)
```

The Party Mode orchestrates real sub-agent discussions:
- N rounds of cross-talk between agents
- Shared context builds across rounds
- Convergence detection identifies when consensus is reached
- Cross-talk analysis produces influence matrix

## Architecture Decision

```bash
/stdd:brainstorm          # Explore options
/stdd:roles consult wei "Should we use microservices?"
/stdd:prfaq               # Working Backwards analysis
/stdd:complexity          # Measure complexity impact
```

## PRFAQ (Product Validation)

The Amazon Working Backwards workflow for data-driven decisions:

```
/stdd:prfaq ignition      # Stage 1: Raw idea
/stdd:prfaq press-release # Stage 2: Customer announcement
/stdd:prfaq customer-faq  # Stage 3: External questions
/stdd:prfaq internal-faq  # Stage 4: Internal questions
/stdd:prfaq verdict       # Stage 5: Quantitative scoring
```

The Verdict stage scores across 4 dimensions (feasibility, value, risk, effort) and cross-references Constitution compliance.

## Context Management

For large codebases that exceed context windows:

```bash
/stdd:context-engine distill   # Compress code to signatures
/stdd:context-engine shard     # Split docs into navigable chunks
/stdd:context-engine status    # View distillation/sharding status
/stdd:context-engine estimate  # Estimate token usage
```

## Design System

```bash
/stdd:design              # Generate DESIGN.md with tokens
/stdd:design preview      # HTML preview of design system
/stdd:ui                  # Generate UI components
/stdd:turbo               # Accelerated multi-component generation
```

## Builder Workflow

Create custom extensions with the Builder engine:

```bash
# Create a custom Agent
/stdd:builder create agent
# → Define role, specialty, behavior patterns
# → Test agent in scenarios
# → Use in Party Mode or standalone

# Create a custom Workflow
/stdd:builder create workflow
# → Define steps, gates, artifacts
# → Test end-to-end execution
# → Invoke via /stdd:<name>

# Create a custom Skill
/stdd:builder create skill
# → Define triggers, templates, configuration
# → Test skill output quality
# → Install to team or personal skill library
```

## UI Generation Workflow

Automated pipeline from design to code:

```bash
# 1. Create design system
/stdd:design create       # Generate DESIGN.md with color, typography, spacing tokens

# 2. Preview design system
/stdd:design preview      # HTML preview of design token effects

# 3. Generate UI components
/stdd:ui create           # Auto-generate frontend component code from design tokens

# 4. Batch accelerated generation
/stdd:turbo               # Accelerated multi-component batch generation
```

Design tokens ensure all generated UI strictly follows a unified design specification.

## PRFAQ Workflow (Full)

Amazon Working Backwards for major feature decisions:

```bash
# Stage 1: Raw idea
/stdd:prfaq ignition       # Capture raw idea, core assumptions

# Stage 2: Customer-facing announcement
/stdd:prfaq press-release  # Write a press release as if the product is already launched

# Stage 3: External FAQ
/stdd:prfaq customer-faq   # List questions customers might ask

# Stage 4: Internal FAQ
/stdd:prfaq internal-faq   # List technical implementation and ops questions

# Stage 5: Quantitative scoring
/stdd:prfaq verdict        # Score across 4 dimensions (feasibility, value, risk, effort)

# All stages at once
/stdd:prfaq full           # Execute full PRFAQ pipeline
```

The Verdict stage scores across 4 dimensions (feasibility, value, risk, effort) and cross-references Constitution compliance.

## Module Installation Workflow

Extend capabilities via the Modules Marketplace:

```bash
/stdd:modules search "auth"       # Search for auth-related modules
/stdd:modules install stdd-auth   # Install module
/stdd:modules list                # View installed modules
# After installation, use the commands and skills provided by the module
```

## Iterate Loop

Plan-Execute-Reflect iterative loop for continuous optimization:

```bash
/stdd:iterate             # Start iterative loop
# System automatically executes:
# Plan → Plan the current step
# Execute → Implement
# Reflect → Analyze results, identify improvements
# Loop until quality threshold is met
```

## CodeGraph Analysis

Code knowledge graph for code relationships and dependency analysis:

```bash
/stdd:codegraph           # Build code knowledge graph
/stdd:codegraph query     # Query code relationships and dependencies
```

## Quality Gates

### Constitution Check
```bash
stdd constitution check   # Run all 9 articles
stdd constitution show 1  # Show specific article details
```

### Verification Pipeline
```bash
/stdd:verify              # Full verification (tests + coverage + constitution)
/stdd:mutation            # Mutation testing for false-green detection
/stdd:audit               # Compliance audit with waiver tracking
```

## Web Dashboard

```bash
stdd dashboard open       # Open HTML dashboard in browser
```

The dashboard shows:
- Project health overview with metrics
- Spec/change progress tracking
- Constitution compliance status
- 12 Persona roster with activation status
- 9 Official modules with capabilities
- Activity timeline of recent commands

## Story Board (Agile)

```bash
stdd story board          # View agile board
stdd story sprint         # Sprint management
```

## Graph Orchestration

```bash
/stdd:graph               # View DAG workflow
/stdd:graph-run           # Execute workflow
/stdd:graph-history       # View execution history
```

## IDE Integration

STDD supports 8 IDEs with auto-generated configuration:

| IDE | Config File | Generated |
|-----|------------|-----------|
| Claude Code | `.claude/CLAUDE.md` | Rules + commands |
| Cursor | `.cursorrules` | Workflow rules |
| Windsurf | `.windsurfrules` | Workflow rules |
| VS Code | `.vscode/settings.json` | Copilot instructions |
| Augment | `.augment/AUGMENT.md` | Project rules |
| Gemini CLI | `.gemini/GEMINI.md` | Project rules |
| Kiro | `.kiro/KIRO.md` | Project + design rules |
| Codex CLI | `.codex/CODEX.md` | Project + TDD rules |

## Documentation Navigation

- [Home](../../README.md) - Project overview
- [Getting Started](getting-started.md) - First-run guide
- [Commands](commands.md) - Full command reference
- [Concepts](concepts.md) - Core concepts explained
- [Chinese Docs](../workflows.md) - Chinese version
