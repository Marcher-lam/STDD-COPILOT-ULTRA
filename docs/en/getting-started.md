# Getting Started

STDD Copilot Ultra v2.0.0 — First-run guide.

## Interactive Start Wizard

```bash
stdd start                    # Interactive wizard, auto-recommends workflows
```

`stdd start` provides a one-stop interactive wizard that automatically recommends appropriate workflow paths based on project type and requirements.

## CLI Quick Reference

```bash
# Initialize
stdd init                     # Initialize project
stdd init /path/to/project    # Initialize in a specific directory
stdd init --force             # Force re-initialization

# Change Management
stdd list                     # List all changes
stdd list --specs             # List specs only
stdd list --archived          # List archived changes
stdd list --json              # JSON output
stdd status                   # Show project status
stdd status add-dark-mode     # Show specific change status
stdd new change add-dark-mode # Start a new change

# View Available Capabilities
stdd skills                   # List 57 available skills
stdd commands                 # List 88 available commands

# Fix & Scaffold
stdd fix-packet add-dark-mode # Generate Golden Packet fix context
stdd outside-in init          # Initialize outside-in TDD
stdd outside-in scaffold add-dark-mode  # Generate layered test skeleton

# Quality Governance
stdd constitution             # Show all 9 articles
stdd constitution show 2      # Show specific article
stdd constitution check       # Run compliance check

# Git Hooks
stdd hooks install            # Install git hooks
stdd hooks verify             # Verify hooks status
stdd hooks status             # Show hooks status
stdd hooks disable            # Disable hooks
stdd hooks enable             # Enable hooks

# Dashboard
stdd dashboard open           # Open HTML project health dashboard

# Diagnostics
stdd doctor                   # Health check
stdd doctor --deep            # Deep diagnosis

# Progress Tracking
stdd progress                 # View progress timeline
stdd progress --summary       # Summary view
stdd progress --resume        # Resume progress
stdd progress --json          # JSON output

# Apply Changes
stdd apply <name> --allow-no-tests   # Apply change
```

## Docker Quick Start

```bash
docker run --rm -v "$PWD:/workspace" marcher-lam/stdd-copilot:latest --help
```

## Documentation
- [English Docs Index](README.md) — English documentation hub
- [CLI Guide](cli-guide.md) — Full CLI command reference
- [Concepts](concepts.md) — Core concepts explained
- [Workflows](workflows.md) — Common patterns and usage scenarios
- [Commands](commands.md) — Full slash command reference
- [Project README](../../README_EN.md) — Project overview and top-level examples
