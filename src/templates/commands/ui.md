---
description: Generate frontend pages and components using DESIGN.md design tokens
---

# Command: /stdd:ui

## Usage
```
stdd ui page <name>                            # Generate a React page
stdd ui page <name> --layout sidebar           # Page with sidebar layout
stdd ui page <name> --framework vanilla        # Vanilla HTML page
stdd ui page <name> --sections hero,features   # Page with named sections
stdd ui component <name> --type button         # Generate a button component
stdd ui component <name> --type card           # Generate a card component
stdd ui component <name> --type form           # Generate a form component
stdd ui component <name> --type input          # Generate an input component
stdd ui component <name> --type modal          # Generate a modal component
stdd ui component <name> --type nav            # Generate a nav component
stdd ui component <name> --type table          # Generate a table component
stdd ui component <name> --type list           # Generate a list component
stdd ui scaffold                               # Scaffold full UI app structure
stdd ui scaffold react                         # Scaffold with React
stdd ui preview                                # Generate preview gallery
stdd ui list                                   # List generated artifacts
```

## Description
Generates frontend pages and components using design tokens from DESIGN.md. Supports React, Vue, and vanilla HTML output with CSS custom properties derived from the project's design system.

## Execution Flow
1. Read DESIGN.md for design tokens (colors, fonts, spacing, radius)
2. Detect framework from package.json (or use --framework flag)
3. Generate component/page code with CSS custom properties
4. Write output to stdd/ui/ directory

## Options
| Option | Description |
|--------|-------------|
| --framework | react, vue, vanilla (default: detected from package.json) |
| --layout | centered, sidebar, full (default: centered) |
| --sections | Comma-separated section names for pages |
| --type | Component type: button, card, form, input, modal, nav, table, list |
| --style | CSS format: css, scss, tailwind, css-modules (default: css) |
| --json | JSON output |
| --force | Force overwrite existing files |

## Output
- `stdd/ui/pages/` - Generated page components
- `stdd/ui/components/` - Generated UI components
- `stdd/ui/global.css` - Global CSS with design tokens
- `stdd/ui/preview.html` - Preview gallery of tokens and components
