/**
 * Round 35: awesome-design-md-inspired DESIGN.md enhancement coverage.
 */
const fs = require('fs');
const path = require('path');
const {
  DesignCommand,
  renderDesignMD,
  renderPreviewHTML,
} = require('../src/cli/commands/design');

const TMP = path.join(__dirname, '__design_awesome_tmp__');
function mkdirp(dir) { fs.mkdirSync(dir, { recursive: true }); }

beforeEach(() => mkdirp(TMP));
afterEach(() => fs.rmSync(TMP, { recursive: true, force: true }));

describe('awesome-design-md inspired design output', () => {
  it('renders extended Stitch-style DESIGN.md sections', () => {
    const content = renderDesignMD('modern');
    expect(content).toContain('## Visual Theme & Atmosphere');
    expect(content).toContain('## Color Palette & Roles');
    expect(content).toContain('## Typography Rules');
    expect(content).toContain('## Component Stylings');
    expect(content).toContain('## Depth & Elevation');
    expect(content).toContain("## Do's and Don'ts");
    expect(content).toContain('## Responsive Behavior');
    expect(content).toContain('## Agent Prompt Guide');
    expect(content).toContain('Ready-to-use Prompt');
  });

  it('renders preview HTML catalog for a preset', () => {
    const html = renderPreviewHTML('dark', true);
    expect(html).toContain('Dark Developer Design Preview');
    expect(html).toContain('Primary Action');
    expect(html).toContain('--color-primary');
    expect(html).toContain('Form Preview');
  });

  it('creates DESIGN.md and both preview catalogs by default', async () => {
    const out = [];
    const origLog = console.log;
    console.log = (...args) => out.push(args.join(' '));
    try {
      const result = await new DesignCommand(TMP).execute('create', [], { preset: 'modern' });
      expect(fs.existsSync(path.join(TMP, 'DESIGN.md'))).toBe(true);
      expect(fs.existsSync(path.join(TMP, 'preview.html'))).toBe(true);
      expect(fs.existsSync(path.join(TMP, 'preview-dark.html'))).toBe(true);
      expect(result.previews).toHaveLength(2);
      expect(out.join('\n')).toContain('Preview:');
    } finally {
      console.log = origLog;
    }
  });

  it('supports --no-preview behavior', async () => {
    const origLog = console.log;
    console.log = () => {};
    try {
      const result = await new DesignCommand(TMP).execute('create', [], { preset: 'minimal', noPreview: true });
      expect(fs.existsSync(path.join(TMP, 'DESIGN.md'))).toBe(true);
      expect(fs.existsSync(path.join(TMP, 'preview.html'))).toBe(false);
      expect(fs.existsSync(path.join(TMP, 'preview-dark.html'))).toBe(false);
      expect(result.previews).toEqual([]);
    } finally {
      console.log = origLog;
    }
  });

  it('check recognizes enhanced DESIGN.md as complete', async () => {
    const origLog = console.log;
    console.log = () => {};
    try {
      await new DesignCommand(TMP).execute('create', [], { preset: 'dark' });
      const result = new DesignCommand(TMP).check({ json: false });
      expect(result.complete).toBe(true);
      expect(result.issues).toEqual([]);
      expect(result.checks.hasElevation).toBe(true);
      expect(result.checks.hasPromptGuide).toBe(true);
    } finally {
      console.log = origLog;
    }
  });

  it('lists presets in JSON form', async () => {
    const out = [];
    const origLog = console.log;
    console.log = (...args) => out.push(args.join(' '));
    try {
      const result = await new DesignCommand(TMP).execute('list', [], { json: true });
      expect(result).toHaveLength(3);
      expect(JSON.parse(out.join('\n')).presets).toHaveLength(3);
    } finally {
      console.log = origLog;
    }
  });
});
