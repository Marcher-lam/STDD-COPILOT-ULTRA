# STDD Copilot

**Specification & Test-Driven Development Copilot**

CLI Commands:
stdd init
stdd init /path/to/project
stdd init --force
stdd list
stdd list --specs
stdd list --archived
stdd list --json
stdd status
stdd status add-dark-mode
stdd new change add-dark-mode
stdd new spec auth
stdd skills
stdd skills --phase 4
stdd commands
stdd fix-packet add-dark-mode
stdd outside-in init
stdd outside-in scaffold add-dark-mode
stdd constitution
stdd constitution show 2
stdd constitution check
stdd hooks install
stdd hooks verify
stdd hooks status
stdd hooks disable
stdd hooks enable

## Documentation
[English Docs Index](./docs/en/README.md) | English documentation hub and entry-point map
[Getting Started](./docs/en/getting-started.md) | First-run workflow and quick CLI reference
[CLI Guide](./docs/en/cli-guide.md) | Full CLI command reference

## TDD Gap Enhancements
`stdd fix-packet [change]` generates a Golden Packet style failure context with specs, tasks, evidence, runtime artifacts, and fix rules. `stdd apply` now writes one automatically when tests fail.

`stdd outside-in init` creates `stdd/tdd-registry.yaml`; `stdd outside-in scaffold <change>` generates an outside-in plan plus E2E, integration, and unit test skeletons.

The dynamic Skill Graph now includes `stdd-outside-in` in the feature intent and adds a repair intent: `stdd-fix-packet → stdd-apply → stdd-verify`.

Current verification baseline: `npm test -- --runInBand` passes 60 test suites and 757 tests.
