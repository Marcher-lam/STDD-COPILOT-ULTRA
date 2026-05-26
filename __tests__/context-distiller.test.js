const fs = require('fs');
const path = require('path');
const os = require('os');
const { ContextDistiller } = require('../src/utils/context-distiller');

describe('ContextDistiller', () => {
  let tmpDir;
  let distiller;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-distill-'));
    distiller = new ContextDistiller();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('distillCode', () => {
    it('extracts class declarations and exports from JS code', () => {
      const file = path.join(tmpDir, 'test.js');
      fs.writeFileSync(file, [
        'const foo = require("bar");',
        '',
        'class MyComponent {',
        '  render() {',
        '    return "hello";',
        '  }',
        '}',
        '',
        'export { MyComponent };',
      ].join('\n'));

      const result = distiller.distillCode(file);
      expect(result.type).toBe('code');
      expect(result.distilled).toContain('class MyComponent');
      expect(result.distilled).toContain('export');
    });
  });

  describe('distillMarkdown', () => {
    it('extracts headings and list items', () => {
      const file = path.join(tmpDir, 'test.md');
      fs.writeFileSync(file, [
        '# Title',
        '',
        'Some prose here that should be removed.',
        '',
        '- Item 1',
        '- Item 2',
        '',
        '## Section',
        '',
        'More prose to remove.',
        '',
        '| Header | Value |',
        '|--------|-------|',
        '| A      | B     |',
      ].join('\n'));

      const result = distiller.distillMarkdown(file);
      expect(result.distilled).toContain('# Title');
      expect(result.distilled).toContain('- Item 1');
      expect(result.distilled).toContain('## Section');
      expect(result.distilled).toContain('| Header');
    });
  });

  describe('distillSpec', () => {
    it('extracts Feature and Scenario names', () => {
      const file = path.join(tmpDir, 'test.feature');
      fs.writeFileSync(file, [
        'Feature: User Login',
        '  As a user',
        '  I want to log in',
        '',
        '  Scenario: Successful login',
        '    Given a valid user',
        '    When they submit credentials',
        '    Then they see the dashboard',
        '',
        '  Scenario: Failed login',
        '    Given an invalid user',
        '    When they submit bad credentials',
        '    Then they see an error',
      ].join('\n'));

      const result = distiller.distillSpec(file);
      expect(result.distilled).toContain('Feature: User Login');
      expect(result.distilled).toContain('Scenario: Successful login');
      expect(result.distilled).toContain('Given a valid user');
    });
  });

  describe('distillJSON', () => {
    it('extracts top-level keys and types', () => {
      const file = path.join(tmpDir, 'test.json');
      fs.writeFileSync(file, JSON.stringify({
        name: 'test',
        version: '1.0.0',
        dependencies: { foo: '^1.0' },
        scripts: { start: 'node .' },
      }));

      const result = distiller.distillJSON(file);
      expect(result.distilled).toContain('name: string');
      expect(result.distilled).toContain('dependencies: object');
      expect(result.distilled).toContain('scripts: object');
    });
  });

  describe('distillFile', () => {
    it('auto-detects file type by extension', () => {
      const mdFile = path.join(tmpDir, 'doc.md');
      fs.writeFileSync(mdFile, '# Hello\n\nWorld');
      const result = distiller.distillFile(mdFile);
      expect(result.type).toBe('markdown');
    });
  });

  describe('distillProject', () => {
    it('throws if stdd/ directory does not exist', () => {
      expect(() => distiller.distillProject(tmpDir)).toThrow('No stdd/ directory');
    });

    it('distills a stdd/ directory and writes output', () => {
      const stddDir = path.join(tmpDir, 'stdd');
      const reportsDir = path.join(stddDir, 'reports');
      fs.mkdirSync(reportsDir, { recursive: true });
      fs.writeFileSync(path.join(reportsDir, 'test.md'), '# Report\n\nContent here\n- Item 1');
      fs.writeFileSync(path.join(stddDir, 'overview.md'), '# Overview\n\nProject info.');

      const result = distiller.distillProject(tmpDir);
      expect(result).toHaveProperty('outputPath');
      expect(result.filesProcessed).toBeGreaterThanOrEqual(1);
      expect(result.estimatedTokens).toBeGreaterThan(0);
      expect(fs.existsSync(path.join(tmpDir, result.outputPath))).toBe(true);
    });
  });
});
