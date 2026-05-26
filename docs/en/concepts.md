# Core Concepts

## What is STDD Copilot Ultra?

STDD (Smart Team-Driven Development) Copilot Ultra v2.0.0 is a spec-driven, TDD-first engineering control system for AI coding assistants. It provides structured workflows, quality gates, and governance to ensure AI-generated code meets production standards.

The system ships with **88 command templates** and **57 skill templates**, covering the full lifecycle from requirements to delivery.

## Key Principles

### 1. Spec-Driven Development
Every change starts with a specification (`/stdd:spec`). Specs define WHAT to build before HOW to build it. This prevents AI assistants from jumping to implementation without clear requirements.

### 2. TDD-First (Ralph Loop)
The core testing cycle follows the Ralph Loop:
```
RED → CHECK → GREEN → MUTATION → REFACTOR
```
- **RED**: Write a failing test first
- **CHECK**: Verify the test fails for the right reason
- **GREEN**: Write minimal code to pass
- **MUTATION**: Run mutation tests to catch false greens
- **REFACTOR**: Clean up while keeping tests green

### 3. Evidence-Based Verification
No change is "done" until evidence is provided. The `/stdd:verify` command requires:
- All tests passing
- Coverage gates met
- Constitution compliance
- No regression in existing features

### 4. Constitution (9-Article Quality Governance)
A 9-article quality constitution acts as a programmable contract:
| # | Article | Severity | Purpose |
|---|---------|----------|---------|
| 1 | No untested code | Blocking | Every function must have tests |
| 2 | Evidence required | Blocking | Claims must be backed by data |
| 3 | Spec compliance | Blocking | Implementation matches spec |
| 4 | No premature abstraction | Warning | Don't over-engineer |
| 5 | Documentation currency | Warning | Docs must match code |
| 6 | Security baseline | Blocking | OWASP Top 10 compliance |
| 7 | Performance budget | Suggestion | Stay within performance limits |
| 8 | Accessibility | Suggestion | WCAG 2.1 AA compliance |
| 9 | Review protocol | Blocking | Changes require review |

### 5. Named Agent Personas (12 Specialists)
Instead of generic AI responses, STDD assigns named personas with distinct personalities:

| Persona | Role | Specialty |
|---------|------|-----------|
| Maya | Product Owner | Requirements, priorities |
| Alex | Developer | Implementation, architecture |
| Sam | Tester | Quality assurance, edge cases |
| Rex | Reviewer | Code review, standards |
| Wei | Architect | System design, scalability |
| Shield | Security | Threat modeling, compliance |
| Ops | DevOps | Deployment, monitoring |
| Luna | UX Designer | User experience, accessibility |
| Jordan | Business Analyst | Stakeholder alignment |
| Page | Tech Writer | Documentation, clarity |
| QC | QA Lead | Test strategy, coverage |
| Data | Data Analyst | Metrics, insights |

### 6. Planning Profiles
Adaptive planning based on complexity:
- **Quick**: Small bug fixes, hotfixes
- **Standard**: Regular features
- **Thorough**: Complex changes with security implications
- **Enterprise**: Multi-team, compliance-required changes

### 7. DAG-Based Workflow Orchestration
The Graph Engine routes tasks through a Directed Acyclic Graph:
```
stdd-propose → stdd-spec → stdd-plan → stdd-apply → stdd-verify
                                  ↓
                            stdd-outside-in
```
- Automatic intent detection (feature, repair, refactor)
- Parallel execution where possible
- Profile-adaptive routing

### 8. 3-Layer Skill Configuration
Skills can be customized at 3 levels with deep merge:
1. **Base**: SKILL.md frontmatter (defaults)
2. **Team**: `stdd/config/skill-overrides.yaml` (team conventions)
3. **User**: `~/.stdd/skill-overrides.yaml` (personal preferences)

### 9. Context Engineering
LLM-optimized context management:
- **Distillation**: Compress code to signatures, markdown to headings/tables
- **Sharding**: Split large documents at heading boundaries with breadcrumb navigation
- **Shard Map**: Machine-readable index for selective context loading

### 10. PRFAQ (Amazon Working Backwards)
Data-driven product validation through 5 stages:
1. **Ignition**: Raw idea capture
2. **Press Release**: Customer-facing announcement
3. **Customer FAQ**: External questions
4. **Internal FAQ**: Engineering/ops questions
5. **Verdict**: Quantitative go/no-go scoring (feasibility, value, risk, effort)

---

## Phase 2-4 New Concepts

### 11. Builder Engine
Platform capability for creating custom Agents, Workflows, and Skills:

```
/stdd:builder create agent    # Create a custom Agent
/stdd:builder create workflow # Create a custom Workflow
/stdd:builder create skill    # Create a custom Skill
```

The Builder engine provides a unified extension framework, enabling teams to create specialized AI agents and workflow templates tailored to their specific needs.

### 12. UI Generator
Automatic frontend page and component generation from DESIGN.md design tokens:

```
/stdd:design create    # Create design system
/stdd:design preview   # HTML preview of design tokens
/stdd:ui create        # Generate UI components from tokens
/stdd:turbo            # Accelerated multi-component generation
```

An automatic bridge from design tokens to code, ensuring all generated UI strictly adheres to the design specification.

### 13. Modules Marketplace
Community module marketplace with browse, search, and install capabilities:

```
/stdd:modules search <keyword>   # Search modules
/stdd:modules install <module>   # Install a module
/stdd:modules list               # List installed modules
```

Through modular architecture, teams can share and reuse validated workflows and skills.

### 14. Dashboard
Static HTML project health dashboard:

```
stdd dashboard open    # Open dashboard in browser
```

The dashboard displays:
- Project health overview with metrics
- Spec/change progress tracking
- Constitution compliance status
- 12 Persona roster with activation status
- 9 Official modules with capabilities
- Activity timeline of recent commands

### 15. Docs Site
Static documentation site generation from project docs:

```
/stdd:docs    # Generate documentation site
```

Automatically organizes project Markdown files into a navigable static site.

### 16. CodeGraph
Code knowledge graph for code relationship and dependency analysis:

```
/stdd:codegraph        # Build code knowledge graph
/stdd:codegraph query  # Query code relationships
```

Provides project-level code dependency analysis and relationship graphing.

### 17. Iterate Loop
Plan-Execute-Reflect iterative loop:

```
/stdd:iterate    # Start iterative loop
```

The system automatically executes "Plan → Execute → Reflect" cycles, continuously optimizing output quality.

### 18. Party Mode (Multi-Agent Collaboration)
Multi-agent collaboration triggered via the roles command:

```
/stdd:roles            # List 12 available personas
/stdd:party-mode       # Start multi-agent discussion
```

Party Mode orchestrates real sub-agent discussions:
- N rounds of cross-talk between agents
- Shared context builds across rounds
- Convergence detection identifies when consensus is reached
- Cross-talk analysis produces influence matrix

---

## Architecture

```
CLI (stdd) → Commands → Skills → Templates
                ↓
         Profile Engine → DAG Router → Execution
                ↓
    Constitution + Evidence + Verification
                ↓
         12 Agent Personas + Party Mode
                ↓
    Builder + UI Generator + Modules + Dashboard + Docs Site
```

## Documentation Navigation

- [Home](../../README.md) - Project overview
- [Getting Started](getting-started.md) - First-run guide
- [Commands](commands.md) - Full command reference
- [Workflows](workflows.md) - Common patterns
- [Chinese Docs](../concepts.md) - Chinese version
