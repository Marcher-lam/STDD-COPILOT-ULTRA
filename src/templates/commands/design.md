---
description: Generate technical design document from specifications
---

# Command: /stdd:design

## Usage
```
stdd design create                           # Create DESIGN.md
stdd design show                             # Show design document
stdd design check                            # Check design completeness
stdd design update                           # Update design document
```

## Description
Transform specifications into technical design documents with architecture decisions, implementation plans, and risk assessment.

## Execution Flow
1. Detect tech stack
2. Select design preset
3. Generate DESIGN.md template
4. Fill with architecture decisions
5. Validate completeness

### `stdd design reverse-scan [dir]`

Scan project CSS/style files and auto-generate a `DESIGN.md` from actual code tokens rather than from specifications.

```
stdd design reverse-scan                   # Scan current directory
stdd design reverse-scan src/styles        # Scan specific directory
stdd design reverse-scan --dry-run         # Preview without writing
stdd design reverse-scan --output docs/DESIGN.md  # Custom output path
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--dir <path>` | Directory to scan for style files | Current directory (`.`) |
| `--dry-run` | Preview extracted tokens without writing a file | Off (writes file) |
| `--output <path>` | Custom output path for generated file | `DESIGN.md` |

**Details:**
- Extracts the following design tokens from source files:
  - CSS custom properties (variables)
  - Color values (`hex`, `rgb`, `rgba`, `hsl`, `hsla`, named colors)
  - `font-family` declarations
  - `border-radius` values
  - `box-shadow` declarations
  - Spacing values (`margin`, `padding`, `gap`)
- Scans `tailwind.config.js` / `tailwind.config.ts` when present and merges theme extensions
- Supports CSS, SCSS, and styled-components / CSS-in-JS patterns
- Deduplicates and groups tokens by category

## Output
- `DESIGN.md` in project root
- Architecture decisions
- Implementation plan
- Risk assessment
- Tech stack documentation
