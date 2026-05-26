const fs = require('fs');
const path = require('path');
const os = require('os');
const { CssExtractor, CSS_EXTENSIONS, TAILWIND_CONFIG_NAMES } = require('../src/utils/css-extractor');

describe('CssExtractor', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-css-ext-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function writeFile(relativePath, content) {
    const fullPath = path.join(tempDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
  }

  describe('constructor', () => {
    test('initializes with empty tokens', () => {
      const ext = new CssExtractor(tempDir);
      expect(ext.tokens.cssVariables).toEqual([]);
      expect(ext.tokens.colors.semantic).toEqual({});
      expect(ext.tokens.colors.raw).toEqual([]);
      expect(ext.tokens.fonts).toEqual([]);
      expect(ext.tokens.borderRadius).toEqual([]);
      expect(ext.tokens.shadows).toEqual([]);
      expect(ext.tokens.spacing).toEqual([]);
    });
  });

  describe('extract', () => {
    test('finds CSS files recursively', () => {
      writeFile('src/styles/main.css', ':root { --color-primary: #3B82F6; }');
      writeFile('src/components/Button.css', '.btn { color: red; }');
      writeFile('src/deep/nested/styles.css', 'body { margin: 0; }');

      const ext = new CssExtractor(tempDir);
      const tokens = ext.extract(tempDir);

      expect(tokens.cssVariables.length).toBe(1);
      expect(tokens.cssVariables[0].name).toBe('color-primary');
      expect(tokens.cssVariables[0].value).toBe('#3B82F6');
    });

    test('excludes node_modules and other common dirs', () => {
      writeFile('src/main.css', ':root { --x: 1; }');
      writeFile('node_modules/lib/style.css', ':root { --y: 2; }');
      writeFile('.git/evil.css', ':root { --z: 3; }');

      const ext = new CssExtractor(tempDir);
      const tokens = ext.extract(tempDir);

      expect(tokens.cssVariables.length).toBe(1);
      expect(tokens.cssVariables[0].name).toBe('x');
    });

    test('handles empty directory', () => {
      const ext = new CssExtractor(tempDir);
      const tokens = ext.extract(tempDir);
      expect(tokens.cssVariables).toEqual([]);
      expect(tokens.colors.raw).toEqual([]);
    });

    test('handles custom excludeDirs', () => {
      writeFile('src/main.css', ':root { --a: 1; }');
      writeFile('vendor/style.css', ':root { --b: 2; }');

      const ext = new CssExtractor(tempDir);
      const tokens = ext.extract(tempDir, { excludeDirs: ['node_modules', 'vendor'] });

      expect(tokens.cssVariables.length).toBe(1);
      expect(tokens.cssVariables[0].name).toBe('a');
    });

    test('respects maxDepth', () => {
      writeFile('a.css', ':root { --depth1: 1; }');
      writeFile('lvl1/lvl2/lvl3/lvl4/lvl5/lvl6/deep.css', ':root { --depth7: 7; }');

      const ext = new CssExtractor(tempDir);
      const tokens = ext.extract(tempDir, { maxDepth: 3 });

      // deep.css at depth 7 should not be found
      expect(tokens.cssVariables.every(v => v.name !== 'depth7')).toBe(true);
    });
  });

  describe('CSS variable extraction', () => {
    test('extracts CSS variables with :root', () => {
      writeFile('vars.css', `
        :root {
          --color-primary: #3B82F6;
          --spacing-md: 16px;
          --radius-lg: 12px;
          --font-base: Inter, sans-serif;
          --shadow-card: 0 8px 24px rgba(0,0,0,.10);
        }
      `);

      const ext = new CssExtractor(tempDir);
      const tokens = ext.extract(tempDir);

      expect(tokens.cssVariables.length).toBe(5);
      expect(tokens.colors.semantic['color-primary']).toBe('#3B82F6');
      expect(tokens.spacing).toContain('16px');
      expect(tokens.borderRadius).toContain('12px');
      expect(tokens.shadows.length).toBe(1);
    });

    test('extracts CSS variables from .scss files', () => {
      writeFile('style.scss', `
        $primary: #FF0000;
        :root { --color-main: #00FF00; }
      `);

      const ext = new CssExtractor(tempDir);
      const tokens = ext.extract(tempDir);
      expect(tokens.cssVariables.some(v => v.name === 'color-main')).toBe(true);
    });
  });

  describe('color extraction', () => {
    test('extracts hex colors', () => {
      writeFile('colors.css', `
        .red { color: #FF0000; }
        .blue { background: #3B82F6; }
        .short { border-color: #F00; }
      `);

      const ext = new CssExtractor(tempDir);
      const tokens = ext.extract(tempDir);

      expect(tokens.colors.raw.length).toBeGreaterThanOrEqual(3);
      expect(tokens.colors.raw.some(c => c.value === '#FF0000')).toBe(true);
      expect(tokens.colors.raw.some(c => c.value === '#3B82F6')).toBe(true);
    });

    test('extracts rgb/rgba colors', () => {
      writeFile('rgb.css', `
        .foo { color: rgb(255, 0, 0); }
        .bar { background: rgba(0, 128, 255, 0.5); }
      `);

      const ext = new CssExtractor(tempDir);
      const tokens = ext.extract(tempDir);

      expect(tokens.colors.raw.some(c => c.format === 'rgb')).toBe(true);
    });

    test('extracts hsl colors', () => {
      writeFile('hsl.css', `
        .baz { color: hsl(200, 80%, 50%); }
      `);

      const ext = new CssExtractor(tempDir);
      const tokens = ext.extract(tempDir);

      expect(tokens.colors.raw.some(c => c.format === 'hsl')).toBe(true);
    });

    test('deduplicates colors', () => {
      writeFile('dup.css', `
        .a { color: #FF0000; }
        .b { color: #FF0000; }
        .c { color: #ff0000; }
      `);

      const ext = new CssExtractor(tempDir);
      const tokens = ext.extract(tempDir);

      const reds = tokens.colors.raw.filter(c => c.value.toLowerCase() === '#ff0000');
      expect(reds.length).toBe(1);
    });
  });

  describe('font extraction', () => {
    test('extracts font-family declarations', () => {
      writeFile('fonts.css', `
        body { font-family: 'Inter', system-ui, sans-serif; }
        code { font-family: 'JetBrains Mono', monospace; }
      `);

      const ext = new CssExtractor(tempDir);
      const tokens = ext.extract(tempDir);

      expect(tokens.fonts).toContain('Inter');
      expect(tokens.fonts).toContain('system-ui');
      expect(tokens.fonts).toContain('sans-serif');
      expect(tokens.fonts).toContain('JetBrains Mono');
      expect(tokens.fonts).toContain('monospace');
    });

    test('deduplicates fonts', () => {
      writeFile('dup-fonts.css', `
        .a { font-family: sans-serif; }
        .b { font-family: sans-serif; }
      `);

      const ext = new CssExtractor(tempDir);
      const tokens = ext.extract(tempDir);

      const count = tokens.fonts.filter(f => f === 'sans-serif').length;
      expect(count).toBe(1);
    });
  });

  describe('border-radius extraction', () => {
    test('extracts border-radius values', () => {
      writeFile('radius.css', `
        .card { border-radius: 12px; }
        .pill { border-radius: 9999px; }
        .flat { border-radius: 0; }
      `);

      const ext = new CssExtractor(tempDir);
      const tokens = ext.extract(tempDir);

      expect(tokens.borderRadius).toContain('12px');
      expect(tokens.borderRadius).toContain('9999px');
      expect(tokens.borderRadius).not.toContain('0');
      expect(tokens.borderRadius).not.toContain('0px');
    });
  });

  describe('shadow extraction', () => {
    test('extracts box-shadow values', () => {
      writeFile('shadow.css', `
        .card { box-shadow: 0 8px 24px rgba(0,0,0,.10); }
        .flat { box-shadow: none; }
      `);

      const ext = new CssExtractor(tempDir);
      const tokens = ext.extract(tempDir);

      expect(tokens.shadows.length).toBe(1);
      expect(tokens.shadows[0].value).toContain('0 8px 24px');
    });
  });

  describe('Tailwind config extraction', () => {
    test('extracts colors from tailwind.config.js', () => {
      writeFile('tailwind.config.js', `
        module.exports = {
          theme: {
            extend: {
              colors: {
                'brand': '#FF6600',
                'surface': '#FFFFFF',
              },
              fontFamily: {
                'sans': ['Inter', 'system-ui'],
              },
              borderRadius: {
                'lg': '12px',
              },
            }
          }
        }
      `);

      const ext = new CssExtractor(tempDir);
      const tokens = ext.extract(tempDir);

      expect(tokens.colors.semantic['brand']).toBe('#FF6600');
      expect(tokens.colors.semantic['surface']).toBe('#FFFFFF');
      expect(tokens.fonts).toContain('Inter');
      expect(tokens.borderRadius).toContain('12px');
    });
  });

  describe('generateDesignMD', () => {
    test('generates DESIGN.md from tokens', () => {
      const ext = new CssExtractor(tempDir);
      const tokens = {
        cssVariables: [
          { name: 'color-primary', value: '#3B82F6', source: 'test.css' },
          { name: 'spacing-md', value: '16px', source: 'test.css' },
        ],
        colors: { semantic: { 'color-primary': '#3B82F6' }, raw: [{ value: '#3B82F6', format: 'hex', source: 'test.css' }] },
        fonts: ['Inter', 'sans-serif'],
        borderRadius: ['8px', '12px'],
        shadows: [{ value: '0 8px 24px rgba(0,0,0,.10)', source: 'test.css' }],
        spacing: ['16px'],
      };

      const md = ext.generateDesignMD(tokens);

      expect(md).toContain('# Design System');
      expect(md).toContain('reverse-scanned');
      expect(md).toContain('color-primary');
      expect(md).toContain('#3B82F6');
      expect(md).toContain('Inter');
      expect(md).toContain('8px');
      expect(md).toContain('0 8px 24px');
    });

    test('generates empty DESIGN.md when no tokens', () => {
      const ext = new CssExtractor(tempDir);
      const tokens = {
        cssVariables: [],
        colors: { semantic: {}, raw: [] },
        fonts: [],
        borderRadius: [],
        shadows: [],
        spacing: [],
      };

      const md = ext.generateDesignMD(tokens);
      expect(md).toContain('# Design System');
      expect(md).toContain('CSS Variables Found: 0');
    });
  });
});

describe('DesignCommand reverse-scan', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-design-rs-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('reverseScan creates DESIGN.md from project styles', () => {
    const { DesignCommand } = require('../src/cli/commands/design');
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'src', 'style.css'), ':root { --color-main: #FF6600; }', 'utf-8');

    const cmd = new DesignCommand(tempDir);
    const result = cmd.reverseScan({ dir: tempDir });

    expect(result.generated).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'DESIGN.md'))).toBe(true);
    const content = fs.readFileSync(path.join(tempDir, 'DESIGN.md'), 'utf-8');
    expect(content).toContain('color-main');
    expect(content).toContain('#FF6600');
  });

  test('reverseScan dry-run does not write file', () => {
    const { DesignCommand } = require('../src/cli/commands/design');
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'src', 'style.css'), ':root { --x: 1; }', 'utf-8');

    const cmd = new DesignCommand(tempDir);
    const result = cmd.reverseScan({ dir: tempDir, dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'DESIGN.md'))).toBe(false);
  });

  test('reverseScan throws on invalid dir', () => {
    const { DesignCommand } = require('../src/cli/commands/design');
    const cmd = new DesignCommand(tempDir);
    expect(() => cmd.reverseScan({ dir: '/nonexistent/path' })).toThrow('Directory not found');
  });

  test('reverseScan uses custom output path', () => {
    const { DesignCommand } = require('../src/cli/commands/design');
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'src', 'style.css'), ':root { --x: 1; }', 'utf-8');

    const cmd = new DesignCommand(tempDir);
    const customOutput = path.join(tempDir, 'CUSTOM.md');
    const result = cmd.reverseScan({ dir: tempDir, output: customOutput });

    expect(result.path).toBe(customOutput);
    expect(fs.existsSync(customOutput)).toBe(true);
  });
});
