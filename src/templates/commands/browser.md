---
description: Built-in browser automation (Playwright)
---

# Command: /stdd:browser

## Usage
```
stdd browser snapshot <url>      # Take screenshot
stdd browser inspect <url>       # Inspect page
stdd browser doctor              # Browser health check
stdd browser --width=1920        # Set viewport width
stdd browser --height=1080       # Set viewport height
```

## Description
Built-in browser automation using Playwright for E2E testing, screenshots, and page inspection.

## Execution Flow
1. Launch Playwright browser
2. Navigate to URL or perform action
3. Capture screenshot or inspect DOM
4. Save results to output directory

## Subcommands

### `stdd browser compare <url>`

Compare a page screenshot against a stored visual baseline for regression detection.

```
stdd browser compare <url>              # Compare against default baseline
stdd browser compare <url> --name home  # Compare against named baseline
stdd browser compare <url> --threshold 0.02  # Allow up to 2% pixel diff
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--name <name>` | Snapshot name for the baseline file | Derived from URL hostname + path |
| `--threshold <ratio>` | Maximum allowed diff ratio (0-1) | `0.01` (1%) |

**Details:**
- Uses `pixelmatch` for accurate per-pixel comparison when available
- Falls back to byte-level buffer comparison if pixelmatch is not installed
- Screenshots are compared at the configured viewport size (`--width` / `--height`)
- Exit code is non-zero when diff exceeds the threshold
- Baseline images are stored under `.stdd/baselines/`

### `stdd browser update-baseline <url>`

Take a screenshot of the given URL and save it as the visual baseline for future comparisons.

```
stdd browser update-baseline <url>              # Save as default baseline
stdd browser update-baseline <url> --name home  # Save as named baseline
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--name <name>` | Snapshot name for the baseline file | Derived from URL hostname + path |

**Details:**
- Overwrites any existing baseline with the same name
- Captures at the configured viewport size
- Baseline images are stored under `.stdd/baselines/`

## Output
- Screenshots (PNG)
- Inspection results (JSON)
- Diagnostic reports
- Visual diff images (PNG, via `compare`)
- Diff ratio and pass/fail result (via `compare`)
