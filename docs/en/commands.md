# Commands Reference

## CLI Quick Reference

```
stdd init                              # Initialize STDD in current directory
stdd init /path/to/project             # Initialize in a specific directory
stdd init --force                      # Force re-initialization
stdd list                              # List all changes
stdd list --specs                      # List specs only
stdd list --archived                   # List archived changes
stdd list --json                       # JSON output
stdd status                            # Show project status
stdd status <change>                   # Show specific change status
stdd new change <description>          # Start a new change
stdd skills                            # List available skills
stdd commands                          # List available commands
stdd constitution                      # Show all 9 articles
stdd constitution show <n>             # Show specific article
stdd constitution check                # Run compliance check
stdd hooks install                     # Install git hooks
stdd hooks verify                      # Verify hooks status
stdd hooks status                      # Show hooks status
stdd progress                          # Show progress timeline
stdd progress --summary                # Summary view
stdd progress --json                   # JSON output
stdd builder create / list             # Create/list custom Agents, Workflows, Skills
stdd ui create / list                  # Generate UI pages from DESIGN.md tokens
stdd modules search / install / list   # Modules marketplace
stdd dashboard generate / open         # Static HTML project health dashboard
stdd docs build / serve                # Static documentation site
stdd profile detect / set              # Adaptive planning depth
stdd prfaq ignition / press-release / full  # Amazon Working Backwards PRFAQ
stdd codegraph inspect / query / update     # Code knowledge graph
stdd iterate plan / execute / reflect  # Plan-Execute-Reflect iterative loop
stdd parallel execute <intent>         # DAG intent parallel execution
stdd start                             # Interactive quick start wizard
stdd recommend                         # Recommend next steps
```

## Slash Commands (88 Command Templates + 57 Skill Templates)

### Lifecycle

| Command | Description |
|---------|-------------|
| `/stdd:init` | Initialize STDD project |
| `/stdd:new` | Start a new change |
| `/stdd:propose` | Write a proposal |
| `/stdd:clarify` | Ask clarifying questions |
| `/stdd:spec` | Write a specification |
| `/stdd:plan` | Create implementation plan |
| `/stdd:apply` | Apply code changes |
| `/stdd:verify` | Verify changes pass tests |
| `/stdd:archive` | Archive a completed change |

### Quality & Testing

| Command | Description |
|---------|-------------|
| `/stdd:tdd-init` | Initialize TDD configuration |
| `/stdd:baby-steps` | Incremental TDD steps |
| `/stdd:mutation` | Mutation testing |
| `/stdd:outside-in` | Outside-in TDD approach |
| `/stdd:commit-tdd` | Commit with TDD evidence |
| `/stdd:mock` | Generate mocks |
| `/stdd:mock-gen` | Advanced mock generation |
| `/stdd:user-test` | User acceptance testing |

### Analysis & Planning

| Command | Description |
|---------|-------------|
| `/stdd:brainstorm` | Ideation and exploration |
| `/stdd:complexity` | Complexity analysis |
| `/stdd:prfaq` | Amazon Working Backwards PRFAQ (`ignition / press-release / full`) |
| `/stdd:product-proposal` | Product proposal generation |
| `/stdd:vision` | Project vision document |
| `/stdd:profile` | Planning depth adaptation (`detect / set`) |

### Collaboration

| Command | Description |
|---------|-------------|
| `/stdd:roles` | 12 named agent personas |
| `/stdd:party-mode` | Multi-agent discussion |
| `/stdd:supervisor` | Supervisor orchestration |
| `/stdd:consult` | Expert consultation |
| `/stdd:debate` | Structured debate |

### Infrastructure

| Command | Description |
|---------|-------------|
| `/stdd:ci` | CI/CD configuration |
| `/stdd:ci-generator` | Generate CI pipelines |
| `/stdd:hooks` | Git hooks management |
| `/stdd:graph` | DAG workflow orchestration |
| `/stdd:pipeline` | Pipeline configuration |
| `/stdd:runtime` | Runtime environment |

### Generation

| Command | Description |
|---------|-------------|
| `/stdd:builder` | Create custom Agents, Workflows, Skills (`create / list`) |
| `/stdd:turbo` | Accelerated generation |
| `/stdd:ui` | UI component generation from DESIGN.md tokens (`create / list`) |
| `/stdd:design` | Design system management |
| `/stdd:factory` | Code factory |
| `/stdd:schema` | Schema generation |
| `/stdd:api-spec` | API specification |

### Documentation

| Command | Description |
|---------|-------------|
| `/stdd:docs` | Documentation site generation (`build / serve`) |
| `/stdd:final-doc` | Final documentation |
| `/stdd:dashboard` | Static HTML project health dashboard (`generate / open`) |
| `/stdd:story` | Story board management |

### Context & Memory

| Command | Description |
|---------|-------------|
| `/stdd:context` | Context management |
| `/stdd:codegraph` | Code knowledge graph (`inspect / query / update`) |
| `/stdd:context-engine` | LLM-optimized distillation & sharding |
| `/stdd:memory` | Memory management |
| `/stdd:memory-scan` | Scan and clean memory |
| `/stdd:learn` | Learning from feedback |

### Governance

| Command | Description |
|---------|-------------|
| `/stdd:constitution` | 9-article quality governance |
| `/stdd:audit` | Compliance audit |
| `/stdd:waiver-manager` | Manage waivers |
| `/stdd:guard` | Quality guard |
| `/stdd:validate` | Validation checks |
| `/stdd:confirm` | Confirmation protocol |

### Ultra Enhanced Commands (Phase 2-4)

| Command | Description |
|---------|-------------|
| `/stdd:modules` | Modules marketplace (`search / install / list`) |
| `/stdd:iterate` | Plan-Execute-Reflect iterative loop (`plan / execute / reflect`) |
| `/stdd:parallel` | DAG intent parallel execution (`execute <intent>`) |
| `/stdd:start` | Interactive quick start wizard |
| `/stdd:recommend` | Recommend next steps based on project state |

### All Slash Entries

/stdd:api-spec /stdd:apply /stdd:archive /stdd:audit /stdd:baby-steps /stdd:brainstorm /stdd:browser /stdd:builder /stdd:certainty /stdd:ci /stdd:ci-generator /stdd:clarify /stdd:codegraph /stdd:commands /stdd:commit /stdd:commit-msg /stdd:commit-tdd /stdd:complexity /stdd:confirm /stdd:constitution /stdd:context /stdd:context-engine /stdd:continue /stdd:contract /stdd:dashboard /stdd:depcheck /stdd:design /stdd:doctor /stdd:docs /stdd:elicitation /stdd:execute /stdd:explore /stdd:extensions /stdd:factory /stdd:ff /stdd:final-doc /stdd:fix-packet /stdd:game-dev /stdd:graph /stdd:graph-history /stdd:graph-run /stdd:guard /stdd:help /stdd:hooks /stdd:init /stdd:issue /stdd:iterate /stdd:learn /stdd:list /stdd:memory /stdd:memory-scan /stdd:metrics /stdd:mock /stdd:mock-gen /stdd:modules /stdd:mutation /stdd:new /stdd:outside-in /stdd:parallel /stdd:party-mode /stdd:pipeline /stdd:plan /stdd:prfaq /stdd:profile /stdd:prp /stdd:product-proposal /stdd:progress /stdd:propose /stdd:recommend /stdd:roles /stdd:runtime /stdd:schema /stdd:skills /stdd:spec /stdd:spec-generator /stdd:start /stdd:starters /stdd:status /stdd:story /stdd:sudo /stdd:supervisor /stdd:tdd-init /stdd:turbo /stdd:ui /stdd:update /stdd:user-test /stdd:validate /stdd:verify /stdd:vision /stdd:waiver-manager /stdd:workspace

## Documentation Navigation

- [Home](../../README.md) - Project overview
- [Usage Guide](../../USAGE.md) - Full usage manual (Chinese)
- [Getting Started](getting-started.md) - First-run guide
- [CLI Guide](cli-guide.md) - Full CLI reference
- [Concepts](concepts.md) - Core concepts explained
- [Workflows](workflows.md) - Common patterns
- [Chinese Docs](../README.md) - Chinese documentation
