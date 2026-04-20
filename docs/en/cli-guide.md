# STDD Copilot CLI Guide

## Installation

```bash
# Clone and install
git clone <repo-url>
cd stdd-copilot
npm install

# Make CLI available globally (optional)
npm link
```

## CLI Quick Reference

The `stdd` CLI handles project bootstrap, status reporting, and hook / constitution management.

```bash
stdd init                    # Initialize the project
stdd init /path/to/project   # Initialize a specific directory
stdd init --force            # Overwrite existing STDD files

stdd list                    # List active changes
stdd list --specs            # List specs
stdd list --archived         # Include archived changes
stdd list --json             # JSON output

stdd status                  # Overall project status
stdd status add-dark-mode    # Status for a specific change
stdd status --json           # Machine-readable status output

stdd new change add-dark-mode      # Create a new change
stdd new spec auth                 # Create a new spec

stdd skills                  # List all skills
stdd skills --phase 4        # Filter skills by phase

stdd commands                # List Claude Code slash commands
stdd constitution            # Show all constitution articles
stdd constitution show 2     # Show Article 2 details
stdd constitution check      # Trigger the CLI-side compliance entry point

stdd hooks install           # Install hooks
stdd hooks verify            # Verify hooks
stdd hooks status            # Show hooks status
stdd hooks disable           # Disable hooks
stdd hooks enable            # Re-enable hooks
```

### Info and Maintenance Commands

| Command | Description |
|---------|-------------|
| `stdd skills` | List all available STDD skills |
| `stdd skills --phase 4` | Filter skills by phase |
| `stdd commands` | List Claude Code slash commands |
| `stdd constitution` | Show all constitution articles |
| `stdd constitution show 2` | Show details for a specific article |
| `stdd constitution check` | Trigger the CLI-side compliance entry point |
| `stdd hooks install` | Install hooks |
| `stdd hooks verify` | Verify hooks |
| `stdd hooks status` | Show hooks status |
| `stdd hooks disable` | Disable hooks |
| `stdd hooks enable` | Re-enable hooks |

## Command Reference

### Initialization

| Command | Description |
|---------|-------------|
| `/stdd:init` | Initialize STDD project, detect project type, generate config |

### Proposal Phase

| Command | Description |
|---------|-------------|
| `/stdd:propose` | Propose a new feature with clarification QA |
| `/stdd:clarify` | Refine and clarify requirements |
| `/stdd:confirm` | User review and confirm requirements |
| `/stdd:brainstorm` | Pure analysis mode, no code changes |

### Specification Phase

| Command | Description |
|---------|-------------|
| `/stdd:spec` | Generate BDD (Given/When/Then) specifications |
| `/stdd:api-spec` | Generate OpenAPI/TypeScript API specifications |
| `/stdd:schema` | Generate JSON Schema/Zod/TypeScript types |
| `/stdd:final-doc` | Aggregate all phase outputs into final document |

### Planning Phase

| Command | Description |
|---------|-------------|
| `/stdd:plan` | Architecture assessment and micro-task decomposition |
| `/stdd:prp` | Structured planning (What/Why/How/Success) |

### Implementation Phase

| Command | Description |
|---------|-------------|
| `/stdd:apply` | Start implementation based on final requirements |
| `/stdd:execute` | Launch Ralph Loop (Red → Green → Refactor cycle) |
| `/stdd:ff` | Fast-Forward mode (skip intermediate steps) |
| `/stdd:iterate` | Autonomous iteration loop with smart fixing |
| `/stdd:turbo` | One-shot pipeline from proposal to commit |

### Verification Phase

| Command | Description |
|---------|-------------|
| `/stdd:verify` | Validate spec-to-implementation consistency |
| `/stdd:validate` | Full validation (behavior, API, types, code style) |
| `/stdd:mutation` | Mutation testing (Quick pseudo + Deep Stryker) |
| `/stdd:metrics` | Quality metrics dashboard |

### Management

| Command | Description |
|---------|-------------|
| `/stdd:commit` | Archive feature with scope-creep review |
| `/stdd:archive` | Archive a change |
| `/stdd:new` | Create new change proposal |
| `/stdd:continue` | Continue generating next artifact |
| `/stdd:explore` | Free exploration mode |
| `/stdd:constitution` | Manage Constitution rules and waivers |
| `/stdd:graph` | Skill Graph visualization and orchestration |
| `/stdd:issue` | Bug/Issue resolution via TDD |
| `/stdd:help` | Context-aware help |

## Workflow Modes

### Standard Mode (Full Pipeline)
```
/stdd:propose → /stdd:clarify → /stdd:confirm → /stdd:spec → /stdd:plan → /stdd:apply → /stdd:execute → /stdd:commit
```

### Fast-Forward Mode
```
/stdd:propose → /stdd:ff → (auto) → /stdd:commit
```

### Turbo Mode (One-shot)
```
/stdd:turbo → (all phases merged) → /stdd:commit
```

### Issue Resolution Mode
```
/stdd:issue → (bug classification → reproduction → root cause → failing test → minimal fix → regression)
```

### Brainstorm Mode
```
/stdd:brainstorm → (analysis only, no code changes) → /stdd:propose
```

## Configuration

All settings in `stdd/config.yaml`:

```yaml
project:
  language: typescript
  framework: react
  test_framework: vitest

tdd:
  ralph_loop:
    max_iterations: 10
    failure_threshold: 3
  hitl:
    mode: end-of-cycle  # every-phase / end-of-cycle / off
  certainty:
    confirm_threshold: 0.7
  mutation:
    mode: auto  # auto / quick / deep
```

---

> Language: English | [English Docs Index](README.md) | [中文版本](../cli-guide.md)
