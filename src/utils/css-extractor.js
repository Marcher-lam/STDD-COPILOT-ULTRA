const fs = require('fs');
const path = require('path');
const { createLogger } = require('./logger');
const log = createLogger('css-extractor');

const CSS_EXTENSIONS = ['.css', '.scss', '.less', '.sass'];
const TAILWIND_CONFIG_NAMES = ['tailwind.config.js', 'tailwind.config.cjs', 'tailwind.config.mjs', 'tailwind.config.ts'];

const HEX_COLOR_RE = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;
const RGB_COLOR_RE = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)/g;
const HSL_COLOR_RE = /hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%(?:\s*,\s*[\d.]+)?\s*\)/g;
const CSS_VAR_RE = /--([\w-]+)\s*:\s*([^;}\n]+)/g;
const FONT_FAMILY_RE = /font-family\s*:\s*([^;}\n]+)/g;
const BORDER_RADIUS_RE = /border-radius\s*:\s*([^;}\n]+)/g;
const BOX_SHADOW_RE = /box-shadow\s*:\s*([^;}\n]+)/g;

class CssExtractor {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.tokens = {
      cssVariables: [],
      colors: { semantic: {}, raw: [] },
      fonts: [],
      borderRadius: [],
      shadows: [],
      spacing: [],
    };
  }

  /**
   * Scan a directory for CSS/style files and extract design tokens
   * @param {string} dir - Directory to scan (defaults to cwd)
   * @param {object} options - { maxDepth, excludeDirs }
   * @returns {object} Extracted design tokens
   */
  extract(dir, options = {}) {
    const scanDir = dir || this.cwd;
    const maxDepth = options.maxDepth ?? 5;
    const excludeDirs = new Set(options.excludeDirs || ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'vendor']);

    const files = this._findStyleFiles(scanDir, maxDepth, excludeDirs);
    log.debug(`Found ${files.length} style files to scan`);

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        this._extractFromFile(file, content);
      } catch (err) {
        log.debug(`Skip unreadable file: ${file} — ${err.message}`);
      }
    }

    // Also scan for tailwind config
    for (const name of TAILWIND_CONFIG_NAMES) {
      const twPath = path.join(scanDir, name);
      if (fs.existsSync(twPath)) {
        try {
          const content = fs.readFileSync(twPath, 'utf-8');
          this._extractFromTailwindConfig(content);
        } catch {
          log.debug(`Could not parse ${name}`);
        }
      }
    }

    this._deduplicateTokens();
    return this.tokens;
  }

  _findStyleFiles(dir, maxDepth, excludeDirs, depth = 0) {
    if (depth > maxDepth) return [];
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return [];
    }

    const files = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!excludeDirs.has(entry.name)) {
          files.push(...this._findStyleFiles(path.join(dir, entry.name), maxDepth, excludeDirs, depth + 1));
        }
      } else if (CSS_EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
        files.push(path.join(dir, entry.name));
      }
    }
    return files;
  }

  _extractFromFile(filePath, content) {
    // Extract CSS variables
    let match;
    CSS_VAR_RE.lastIndex = 0;
    while ((match = CSS_VAR_RE.exec(content)) !== null) {
      const name = match[1];
      const value = match[2].trim();
      this.tokens.cssVariables.push({ name, value, source: filePath });
      this._categorizeVariable(name, value);
    }

    // Extract raw colors
    HEX_COLOR_RE.lastIndex = 0;
    while ((match = HEX_COLOR_RE.exec(content)) !== null) {
      this._addColor(match[0], 'hex', filePath);
    }

    RGB_COLOR_RE.lastIndex = 0;
    while ((match = RGB_COLOR_RE.exec(content)) !== null) {
      this._addColor(`rgb(${match[1]}, ${match[2]}, ${match[3]})`, 'rgb', filePath);
    }

    HSL_COLOR_RE.lastIndex = 0;
    while ((match = HSL_COLOR_RE.exec(content)) !== null) {
      this._addColor(`hsl(${match[1]}, ${match[2]}%, ${match[3]}%)`, 'hsl', filePath);
    }

    // Extract font families
    FONT_FAMILY_RE.lastIndex = 0;
    while ((match = FONT_FAMILY_RE.exec(content)) !== null) {
      const fonts = match[1].split(',').map(f => f.trim().replace(/['"]/g, '')).filter(Boolean);
      for (const font of fonts) {
        if (!this.tokens.fonts.includes(font)) {
          this.tokens.fonts.push(font);
        }
      }
    }

    // Extract border radius
    BORDER_RADIUS_RE.lastIndex = 0;
    while ((match = BORDER_RADIUS_RE.exec(content)) !== null) {
      const val = match[1].trim();
      if (val !== '0' && val !== '0px' && !this.tokens.borderRadius.includes(val)) {
        this.tokens.borderRadius.push(val);
      }
    }

    // Extract box shadows
    BOX_SHADOW_RE.lastIndex = 0;
    while ((match = BOX_SHADOW_RE.exec(content)) !== null) {
      const val = match[1].trim();
      if (val !== 'none' && !this.tokens.shadows.some(s => s.value === val)) {
        this.tokens.shadows.push({ value: val, source: filePath });
      }
    }
  }

  _extractFromTailwindConfig(content) {
    // Extract extend.colors
    const colorsMatch = content.match(/colors\s*:\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/s);
    if (colorsMatch) {
      const colorBlock = colorsMatch[1];
      const colorEntries = colorBlock.matchAll(/['"]?(\w+)['"]?\s*:\s*['"]([^'"]+)['"]/g);
      for (const m of colorEntries) {
        this.tokens.colors.semantic[m[1]] = m[2];
      }
    }

    // Extract extend.fontFamily
    const fontMatch = content.match(/fontFamily\s*:\s*\{([^}]*)\}/s);
    if (fontMatch) {
      const fontEntries = fontMatch[1].matchAll(/['"]?(\w+)['"]?\s*:\s*\[([^\]]+)\]/g);
      for (const m of fontEntries) {
        const fonts = m[2].split(',').map(f => f.trim().replace(/['"]/g, '')).filter(Boolean);
        for (const font of fonts) {
          if (!this.tokens.fonts.includes(font)) {
            this.tokens.fonts.push(font);
          }
        }
      }
    }

    // Extract extend.borderRadius
    const radiusMatch = content.match(/borderRadius\s*:\s*\{([^}]*)\}/s);
    if (radiusMatch) {
      const radiusEntries = radiusMatch[1].matchAll(/['"]?(\w+)['"]?\s*:\s*['"]([^'"]+)['"]/g);
      for (const m of radiusEntries) {
        if (!this.tokens.borderRadius.includes(m[2])) {
          this.tokens.borderRadius.push(m[2]);
        }
      }
    }
  }

  _categorizeVariable(name, value) {
    const lower = name.toLowerCase();

    if (lower.includes('color') || lower.includes('colour')) {
      this.tokens.colors.semantic[name] = value;
    } else if (lower.includes('font')) {
      if (!this.tokens.fonts.includes(value)) {
        this.tokens.fonts.push(value.replace(/['"]/g, ''));
      }
    } else if (lower.includes('radius')) {
      if (!this.tokens.borderRadius.includes(value)) {
        this.tokens.borderRadius.push(value);
      }
    } else if (lower.includes('shadow')) {
      if (value !== 'none' && !this.tokens.shadows.some(s => s.value === value)) {
        this.tokens.shadows.push({ value, source: 'css-variable' });
      }
    } else if (lower.includes('spacing') || lower.includes('space') || lower.includes('gap') || lower.includes('pad') || lower.includes('margin')) {
      if (!this.tokens.spacing.includes(value)) {
        this.tokens.spacing.push(value);
      }
    }
  }

  _addColor(value, format, source) {
    const normalized = value.toLowerCase();
    const exists = this.tokens.colors.raw.some(c => c.value.toLowerCase() === normalized);
    if (!exists) {
      this.tokens.colors.raw.push({ value, format, source });
    }
  }

  _deduplicateTokens() {
    const uniqueFonts = [...new Set(this.tokens.fonts)];
    this.tokens.fonts = uniqueFonts;

    const uniqueRadius = [...new Set(this.tokens.borderRadius)];
    this.tokens.borderRadius = uniqueRadius;

    const uniqueSpacing = [...new Set(this.tokens.spacing)];
    this.tokens.spacing = uniqueSpacing;
  }

  /**
   * Generate a DESIGN.md from extracted tokens
   * @param {object} tokens - Extracted tokens (from extract())
   * @returns {string} DESIGN.md content
   */
  generateDesignMD(tokens) {
    const t = tokens || this.tokens;
    const semanticColors = Object.entries(t.colors.semantic);
    const rawColors = t.colors.raw.slice(0, 20);
    const fonts = t.fonts;
    const radius = t.borderRadius;
    const shadows = t.shadows;
    const spacing = t.spacing;
    const date = new Date().toISOString().split('T')[0];

    const lines = [
      `# Design System`,
      ``,
      `> Generated: ${date}`,
      `> Source: reverse-scanned from project CSS/style files`,
      ``,
      `## Extracted Color Tokens`,
      ``,
    ];

    if (semanticColors.length > 0) {
      lines.push(`### Semantic Colors (from CSS Variables / Tailwind)`);
      lines.push(``);
      lines.push(`| Token | Value |`);
      lines.push(`|-------|-------|`);
      for (const [name, value] of semanticColors) {
        lines.push(`| \`${name}\` | \`${value}\` |`);
      }
      lines.push(``);
    }

    if (rawColors.length > 0) {
      lines.push(`### Raw Color Values`);
      lines.push(``);
      lines.push(`| Value | Format |`);
      lines.push(`|-------|--------|`);
      for (const c of rawColors) {
        lines.push(`| \`${c.value}\` | ${c.format} |`);
      }
      lines.push(``);
    }

    if (fonts.length > 0) {
      lines.push(`## Typography`);
      lines.push(``);
      lines.push(`Extracted font stacks:`);
      lines.push(``);
      for (const font of fonts) {
        lines.push(`- \`${font}\``);
      }
      lines.push(``);
    }

    if (radius.length > 0) {
      lines.push(`## Border Radius`);
      lines.push(``);
      lines.push(`| Value |`);
      lines.push(`|-------|`);
      for (const r of radius) {
        lines.push(`| \`${r}\` |`);
      }
      lines.push(``);
    }

    if (shadows.length > 0) {
      lines.push(`## Elevation / Shadows`);
      lines.push(``);
      lines.push(`| Value |`);
      lines.push(`|-------|`);
      for (const s of shadows) {
        lines.push(`| \`${s.value}\` |`);
      }
      lines.push(``);
    }

    if (spacing.length > 0) {
      lines.push(`## Spacing Values`);
      lines.push(``);
      lines.push(`| Value |`);
      lines.push(`|-------|`);
      for (const s of spacing) {
        lines.push(`| \`${s}\` |`);
      }
      lines.push(``);
    }

    lines.push(`## CSS Variables Found: ${t.cssVariables.length}`);
    lines.push(``);
    if (t.cssVariables.length > 0) {
      lines.push(`| Variable | Value |`);
      lines.push(`|----------|-------|`);
      for (const v of t.cssVariables.slice(0, 50)) {
        lines.push(`| \`--${v.name}\` | \`${v.value}\` |`);
      }
      if (t.cssVariables.length > 50) {
        lines.push(`| ... | _${t.cssVariables.length - 50} more variables_ |`);
      }
      lines.push(``);
    }

    lines.push(`---`);
    lines.push(``);
    lines.push(`*This DESIGN.md was auto-generated by \`stdd design reverse-scan\`. Review and adjust as needed.*`);

    return lines.join('\n');
  }
}

module.exports = { CssExtractor, CSS_EXTENSIONS, TAILWIND_CONFIG_NAMES };
