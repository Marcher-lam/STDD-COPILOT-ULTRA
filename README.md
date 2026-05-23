<div align="center">

# STDD Copilot

**Specification + Test-Driven Development CLI Framework**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/tests-3845%2F3845%20passing-brightgreen.svg)](CONTRIBUTING.md)
[![Coverage](https://img.shields.io/badge/coverage-97%25%20statements-brightgreen.svg)](CONTRIBUTING.md)

[简体中文](./README.md) · [English](./README_EN.md)

</div>

---

## What is STDD Copilot

STDD Copilot is a CLI workflow framework that brings **Spec-First** discipline and **TDD** rigor to AI-assisted development. It generates checkpoints — BDD specs, task lists, design docs, test evidence, constitution audits — that keep AI coding assistants on track and turn vague prompts into verifiable engineering.

> **STDD is not an AI.** It's a process control layer that AI coding assistants execute against.

### Why

| Pain | How STDD solves it |
|------|--------------------|
| AI misunderstands your intent | Multi-round clarification → Confirm Gate → BDD specification |
| AI ships untested code | Ralph Loop TDD: Red → Green → Mutation → Refactor |
| No consistent quality bar | 9-article Constitution with automatic hook enforcement |
| Requirements drift silently | File-based Source of Truth (`stdd/changes/`) + Delta Spec Merge |
| Context lost on crash / close | Real-time JSONL progress log with resume-from-breakpoint |

### At a glance

- **75** CLI commands · **80** command templates · **47** skill templates · **171** test suites
- **3845** tests passing · **97.3%** statement coverage · **91.0%** branch coverage
- Via `stdd` CLI or `/stdd:*` slash commands in Claude Code / Cursor / Windsurf

---

## Quick start

```bash
npm install -g @marcher-lam/stdd-copilot@latest  # or see INSTALL.md for source / Docker

cd your-project
stdd init                           # create stdd/ directory and config

stdd new change add-dark-mode       # create a change
stdd ff "add dark mode support"     # fast-forward: proposal → tasks → spec in one step
stdd apply add-dark-mode            # execute TDD cycle (Red → Green → Refactor)
stdd verify add-dark-mode           # run tests + constitution + evidence check
stdd archive add-dark-mode          # move to archive and merge specs
```

In AI coding tools:
```
/stdd:ff implement user login with OAuth
/stdd:apply --phase red
/stdd:verify
/stdd:archive
```

---

## The workflow

```
init → new → propose → clarify → confirm → spec → plan → apply → verify → archive
  │                   │        │                                        │
  │                   └ AI clarify ┘                              mutation evidence
  └── ff "desc" ──→ skip to apply ─────────────────────────────────┘
```

| Scenario | Fast path |
|----------|-----------|
| Clear feature | `ff "desc"` → `apply` → `verify` → `archive` |
| Needs refinement | `new` → `continue` → `apply` → … |
| Bug fix | `issue "desc"` → TDD fix → `verify` → `archive` |
| One-shot | `turbo "desc"` — auto-executes every phase |

---

## Command reference

### Core workflow

| CLI | Slash command | Purpose |
|-----|---------------|---------|
| `stdd init` | `/stdd:init` | Initialize STDD in a project |
| `stdd new change <name>` | `/stdd:new` | Create a change |
| `stdd propose <action>` | `/stdd:propose` | Draft requirement proposal |
| `stdd clarify <change>` | `/stdd:clarify` | Multi-round requirement clarification |
| `stdd confirm <change>` | `/stdd:confirm` | Human confirmation gate |
| `stdd spec <change>` | `/stdd:spec` | Generate BDD `.feature` files |
| `stdd plan <change>` | `/stdd:plan` | Task breakdown + ADR |
| `stdd apply <change>` | `/stdd:apply` | TDD implementation (Red → Green → Refactor) |
| `stdd verify <change>` | `/stdd:verify` | Test + constitution + evidence |
| `stdd archive <change>` | `/stdd:archive` | Archive and merge specs |
| `stdd continue <change>` | `/stdd:continue` | Pick up interrupted work |
| `stdd ff <desc>` | `/stdd:ff` | Fast-forward: proposal → tasks → spec |
| `stdd turbo <desc>` | `/stdd:turbo` | Full auto-pilot |
| `stdd issue <desc>` | `/stdd:issue` | Bug-fix change with reproduction steps |
| `stdd explore [scope]` | `/stdd:explore` | Read-only project exploration |
| `stdd brainstorm <topic>` | `/stdd:brainstorm` | 60+ structured reasoning methods |
| `stdd commit <change>` | `/stdd:commit` | Atomic commits (red:/green:/refactor: prefix) |

### SDD enhancements

| CLI | Purpose |
|-----|---------|
| `stdd api-spec [change]` | OpenAPI / TypeScript spec generation |
| `stdd schema create / validate / fork` | JSON Schema / Zod validation |
| `stdd contract generate / verify` | Consumer-driven contract testing |
| `stdd validate [change]` | Spec Guardian consistency checks |
| `stdd fix-packet [change]` | Golden Packet failure evidence for AI handoff |

### TDD enhancements

| CLI | Purpose |
|-----|---------|
| `stdd mutation [change]` | Mutation testing (Quick heuristic + Stryker) |
| `stdd outside-in init / scaffold` | Outside-in TDD: E2E → integration → unit |
| `stdd tdd-init` | Test scaffold generation |
| `stdd mock-gen [change]` | Mock data and stub generation |

### Quality & governance

| CLI | Purpose |
|-----|---------|
| `stdd guard` | TDD guard with anti-bypass |
| `stdd constitution show / check / fix / audit / waive` | 9-article constitution system |
| `stdd hooks install / verify / disable / enable` | AI editor hook installation |
| `stdd progress --summary / --resume / --clear` | Real-time JSONL progress tracking |
| `stdd metrics` | Quality dashboard |
| `stdd doctor` | Project health diagnostics |
| `stdd depcheck` | Unused dependency detection |
| `stdd audit` | Historical compliance audit |

### Graph engine

| CLI | Purpose |
|-----|---------|
| `stdd graph run <intent>` | Execute DAG by intent (feature / hotfix / repair / research) |
| `stdd graph history` | Execution history and replay |
| `stdd graph recommend` | Smart next-step recommendation |

### Extras

| CLI | Purpose |
|-----|---------|
| `stdd workspace list / validate / repair` | Monorepo workspace management |
| `stdd learn` | Pattern extraction and style guide generation |
| `stdd roles party / review` | 12-role collaborative agent simulation |
| `stdd story create / to-bdd` | Story mapping to BDD conversion |
| `stdd user-test [change]` | Human + agent test scripts |
| `stdd pipeline [change]` | IR + acceptance skeletons from specs |
| `stdd runtime agent start / next / stop` | Party Mode multi-agent simulation |
| `stdd runtime sudo <file>` | SudoLang interpreter |
| `stdd product-proposal` | Full product proposal from all STDD artifacts |
| `stdd context --export` | 3-layer project context export |
| `stdd ci` | CI pipeline config generation |
| `stdd starters` | Project starter templates (JS / TS / Python / Go / Rust) |
| `stdd extensions` | Community extension management |

---

## Constitution

9 articles with **blocking**, **warning**, and **suggestion** tiers enforced automatically on `verify` and `guard`.

| Tier | Article | Rule |
|------|---------|------|
| Blocking | 2 — TDD | Test-first + coverage gate + mutation evidence |
| Blocking | 7 — Security | No secrets, no injection, safe paths |
| Blocking | 9 — CI/CD | Automated pipeline required |
| Warning | 1 — Library-First | Prefer mature libraries |
| Warning | 3 — Small Commits | Atomic, conventional commits |
| Warning | 4 — Code Style | Consistent formatting |
| Warning | 6 — Error Handling | Explicit error paths |
| Suggestion | 5 — Documentation | Docs as code |
| Suggestion | 8 — Performance | Reasonable defaults |

```bash
stdd constitution check                              # full compliance check
stdd constitution show 2                             # inspect article 2
stdd constitution fix --dry-run                      # preview auto-fixes
stdd constitution waive 4 --reason "legacy" --days 7 # temporary exemption
```

---

## Project structure

```
stdd-copilot/
├── cli.js                                # CLI entry (Commander.js)
├── src/
│   ├── cli/commands/                     # 75 command implementations
│   ├── cli/registry/                     # command registry + dynamic loader
│   ├── utils/                            # 21 utility modules
│   ├── runtime/                          # agent simulator, SudoLang, browser
│   └── types/                            # JSDoc type definitions
├── src/templates/
│   ├── commands/                         # 80 slash-command templates
│   └── skills/stdd/                      # 47 skill templates
├── stdd/                                 # runtime working directory
│   ├── changes/                          # change lifecycle
│   ├── specs/                            # BDD source of truth
│   ├── graph/                            # DAG config + cache
│   ├── evidence/                         # guard / verify / mutation outputs
│   └── reporters/                        # test reporter plugins
├── __tests__/                            # 171 test suites / 3845 tests
├── schemas/                              # JSON / YAML schemas
│   ├── spec-driven/                      # spec templates
│   └── constitution/                     # 9 articles
└── docs/                                 # documentation
```

---

## License

[MIT](LICENSE)

<details>
<summary>Appendix — all 127 slash entries (80 unique)</summary>

**Command templates (80)**: `/stdd:api-spec` `/stdd:apply` `/stdd:archive` `/stdd:audit` `/stdd:baby-steps` `/stdd:brainstorm` `/stdd:browser` `/stdd:certainty` `/stdd:ci` `/stdd:ci-generator` `/stdd:clarify` `/stdd:commands` `/stdd:commit` `/stdd:commit-msg` `/stdd:commit-tdd` `/stdd:confirm` `/stdd:constitution` `/stdd:context` `/stdd:continue` `/stdd:contract` `/stdd:depcheck` `/stdd:design` `/stdd:doctor` `/stdd:elicitation` `/stdd:execute` `/stdd:explore` `/stdd:extensions` `/stdd:factory` `/stdd:ff` `/stdd:final-doc` `/stdd:fix-packet` `/stdd:graph` `/stdd:graph-history` `/stdd:graph-run` `/stdd:guard` `/stdd:help` `/stdd:hooks` `/stdd:init` `/stdd:issue` `/stdd:iterate` `/stdd:learn` `/stdd:list` `/stdd:memory` `/stdd:memory-scan` `/stdd:metrics` `/stdd:mock` `/stdd:mock-gen` `/stdd:mutation` `/stdd:new` `/stdd:outside-in` `/stdd:parallel` `/stdd:pipeline` `/stdd:plan` `/stdd:prp` `/stdd:product-proposal` `/stdd:progress` `/stdd:propose` `/stdd:recommend` `/stdd:roles` `/stdd:runtime` `/stdd:schema` `/stdd:skills` `/stdd:spec` `/stdd:spec-generator` `/stdd:start` `/stdd:starters` `/stdd:status` `/stdd:story` `/stdd:sudo` `/stdd:supervisor` `/stdd:tdd-init` `/stdd:turbo` `/stdd:update` `/stdd:user-test` `/stdd:validate` `/stdd:verify` `/stdd:vision` `/stdd:waiver-manager` `/stdd:workspace`

**Skill templates (47)**: `/stdd:api-spec` `/stdd:apply` `/stdd:archive` `/stdd:brainstorm` `/stdd:certainty` `/stdd:clarify` `/stdd:commit` `/stdd:complexity` `/stdd:confirm` `/stdd:constitution` `/stdd:context` `/stdd:continue` `/stdd:contract` `/stdd:design` `/stdd:execute` `/stdd:explore` `/stdd:factory` `/stdd:ff` `/stdd:final-doc` `/stdd:fix-packet` `/stdd:graph` `/stdd:guard` `/stdd:help` `/stdd:init` `/stdd:issue` `/stdd:iterate` `/stdd:learn` `/stdd:memory` `/stdd:metrics` `/stdd:mock` `/stdd:mutation` `/stdd:new` `/stdd:outside-in` `/stdd:parallel` `/stdd:plan` `/stdd:product-proposal` `/stdd:propose` `/stdd:prp` `/stdd:roles` `/stdd:schema` `/stdd:spec` `/stdd:supervisor` `/stdd:turbo` `/stdd:user-test` `/stdd:validate` `/stdd:verify` `/stdd:vision`

</details>
