---
description: Generate a static HTML documentation site from project docs
---

# Command: /stdd:docs

## Usage
```
stdd docs                     # Generate docs site to stdd/docs-site/
stdd docs generate            # Same as above
stdd docs open                # Generate and open in browser
stdd docs sources             # List documentation sources
stdd docs --json              # Output source listing as JSON
stdd docs --lang en           # Generate English-only docs
stdd docs --output ./my-docs  # Custom output directory
```

## Description
Generates a static HTML documentation site from existing project markdown files, command registry, and skill definitions. Produces a multi-page site with sidebar navigation, search index, and responsive layout.

## Sources
The docs site aggregates content from:
- `README.md` and `README_EN.md` -- Overview pages
- `docs/` directory -- All `.md` files (getting-started, cli-guide, concepts, etc.)
- `ARCHITECTURE.md` -- Architecture page
- `USAGE.md` -- Usage Guide
- `INSTALL.md` -- Installation
- `CONTRIBUTING.md` -- Contributing guide
- `CHANGELOG.md` -- Changelog
- Command registry -- Auto-generated command reference
- Skills directory -- Auto-generated skills reference

## Options

| Option | Description |
|--------|-------------|
| --json | Output source listing or metadata as JSON |
| --output \<path\> | Custom output directory (default: stdd/docs-site/) |
| --lang \<zh\|en\> | Language filter for content |

## Output
- `stdd/docs-site/index.html` -- Landing page with quick links
- `stdd/docs-site/<section>.html` -- Individual doc pages
- `stdd/docs-site/style.css` -- Shared stylesheet
- `stdd/docs-site/search.json` -- Search index for client-side search
