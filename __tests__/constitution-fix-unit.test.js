const fs = require('fs');
const path = require('path');
const os = require('os');

jest.mock('../src/cli/commands/tdd-init', () => ({
  TddInitCommand: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({ fixed: [], dryRun: false }),
  })),
}));
jest.mock('../src/cli/commands/constitution-checker', () => ({
  ConstitutionChecker: jest.fn().mockImplementation(() => ({
    loadWaivers: jest.fn(),
    checkArticle1LibraryFirst: jest.fn(),
    issues: { warning: [], error: [] },
  })),
}));

const { ConstitutionFixCommand } = require('../src/cli/commands/constitution-fix');

describe('ConstitutionFixCommand helpers', () => {
  describe('_hasJsdocBeforeLine', () => {
    const cmd = new ConstitutionFixCommand(null);

    it('detects jsdoc block ending with */', () => {
      const lines = ['/**', ' * Description', ' */', 'export function foo() {}'];
      expect(cmd._hasJsdocBeforeLine(lines, 3)).toBe(true);
    });

    it('returns false when no jsdoc present', () => {
      const lines = ['// comment', 'export function foo() {}'];
      expect(cmd._hasJsdocBeforeLine(lines, 1)).toBe(false);
    });

    it('returns false when line index is 0', () => {
      const lines = ['export function foo() {}'];
      expect(cmd._hasJsdocBeforeLine(lines, 0)).toBe(false);
    });

    it('skips blank lines between jsdoc and export', () => {
      const lines = ['/**', ' * Desc', ' */', '', 'export function foo() {}'];
      expect(cmd._hasJsdocBeforeLine(lines, 4)).toBe(true);
    });
  });

  describe('_isPublicExport', () => {
    const cmd = new ConstitutionFixCommand(null);

    it('detects exported function', () => {
      expect(cmd._isPublicExport('export function foo() {}')).toBe(true);
    });

    it('detects exported async function', () => {
      expect(cmd._isPublicExport('export async function foo() {}')).toBe(true);
    });

    it('detects exported class', () => {
      expect(cmd._isPublicExport('export class Foo {}')).toBe(true);
    });

    it('detects exported const arrow function', () => {
      expect(cmd._isPublicExport('export const fn = () => {}')).toBe(true);
    });

    it('detects exported default function', () => {
      expect(cmd._isPublicExport('export default function foo() {}')).toBe(true);
    });

    it('returns false for non-export line', () => {
      expect(cmd._isPublicExport('function foo() {}')).toBe(false);
    });

    it('returns false for const assignment', () => {
      expect(cmd._isPublicExport('const x = 1;')).toBe(false);
    });
  });

  describe('_isSimpleExport', () => {
    const cmd = new ConstitutionFixCommand(null);

    it('detects boolean export', () => {
      expect(cmd._isSimpleExport('export const flag = true')).toBe(true);
    });

    it('detects null export', () => {
      expect(cmd._isSimpleExport('export const nothing = null')).toBe(true);
    });

    it('detects numeric export', () => {
      expect(cmd._isSimpleExport('export const count = 42')).toBe(true);
    });

    it('returns false for function export', () => {
      expect(cmd._isSimpleExport('export function foo() {}')).toBe(false);
    });
  });

  describe('_extractExportName', () => {
    const cmd = new ConstitutionFixCommand(null);

    it('extracts function name', () => {
      expect(cmd._extractExportName('export function myFunc() {}')).toBe('myFunc');
    });

    it('extracts async function name', () => {
      expect(cmd._extractExportName('export async function myAsync() {}')).toBe('myAsync');
    });

    it('extracts class name', () => {
      expect(cmd._extractExportName('export class MyClass {}')).toBe('MyClass');
    });

    it('extracts const name', () => {
      expect(cmd._extractExportName('export const MY_CONST = 42')).toBe('MY_CONST');
    });

    it('extracts default function name', () => {
      expect(cmd._extractExportName('export default function DefaultFn() {}')).toBe('DefaultFn');
    });

    it('returns unknown for unrecognized pattern', () => {
      expect(cmd._extractExportName('export default something')).toBe('something');
    });
  });

  describe('_extractParams', () => {
    const cmd = new ConstitutionFixCommand(null);

    it('extracts function params', () => {
      expect(cmd._extractParams('export function foo(a, b) {}')).toEqual(['a', 'b']);
    });

    it('extracts params with types', () => {
      expect(cmd._extractParams('export function foo(a = 1, b = 2) {}')).toEqual(['a', 'b']);
    });

    it('returns empty for no params', () => {
      expect(cmd._extractParams('export function foo() {}')).toEqual([]);
    });

    it('extracts arrow function params', () => {
      expect(cmd._extractParams('export const fn = (x, y) => {}')).toEqual(['x', 'y']);
    });

    it('returns empty for non-matching', () => {
      expect(cmd._extractParams('export const x = 42')).toEqual([]);
    });
  });

  describe('_buildJsdoc', () => {
    const cmd = new ConstitutionFixCommand(null);

    it('builds jsdoc with name and params', () => {
      const jsdoc = cmd._buildJsdoc('myFunc', ['a', 'b']);
      expect(jsdoc).toContain('@name myFunc');
      expect(jsdoc).toContain('@param {*} a');
      expect(jsdoc).toContain('@param {*} b');
      expect(jsdoc).toContain('@returns');
    });

    it('builds jsdoc without name', () => {
      const jsdoc = cmd._buildJsdoc(null, []);
      expect(jsdoc).not.toContain('@name');
      expect(jsdoc).toContain('[Description needed]');
    });
  });

  describe('_detectLinter', () => {
    it('detects eslint from package.json', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-lint-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
        devDependencies: { eslint: '^8.0.0' },
      }));
      const cmd = new ConstitutionFixCommand(null);
      const result = cmd._detectLinter(tmpDir);
      expect(result).not.toBeNull();
      expect(result.name).toBe('eslint');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('detects prettier from package.json', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-lint-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
        devDependencies: { prettier: '^3.0.0' },
      }));
      const cmd = new ConstitutionFixCommand(null);
      const result = cmd._detectLinter(tmpDir);
      expect(result).not.toBeNull();
      expect(result.name).toBe('prettier');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('detects standard from package.json', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-lint-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
        devDependencies: { standard: '^17.0.0' },
      }));
      const cmd = new ConstitutionFixCommand(null);
      const result = cmd._detectLinter(tmpDir);
      expect(result).not.toBeNull();
      expect(result.name).toBe('standard');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('detects eslint from config file', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-lint-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
      fs.writeFileSync(path.join(tmpDir, '.eslintrc.json'), '{}');
      const cmd = new ConstitutionFixCommand(null);
      const result = cmd._detectLinter(tmpDir);
      expect(result).not.toBeNull();
      expect(result.name).toBe('eslint');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('detects prettier from config file', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-lint-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
      fs.writeFileSync(path.join(tmpDir, '.prettierrc'), '{}');
      const cmd = new ConstitutionFixCommand(null);
      const result = cmd._detectLinter(tmpDir);
      expect(result).not.toBeNull();
      expect(result.name).toBe('prettier');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('returns null when no linter detected', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-lint-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
      const cmd = new ConstitutionFixCommand(null);
      const result = cmd._detectLinter(tmpDir);
      expect(result).toBeNull();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('returns null when no package.json', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-lint-'));
      const cmd = new ConstitutionFixCommand(null);
      const result = cmd._detectLinter(tmpDir);
      expect(result).toBeNull();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('detects eslint from .eslintrc.js config file', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-lint-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
      fs.writeFileSync(path.join(tmpDir, '.eslintrc.js'), 'module.exports = {};');
      const cmd = new ConstitutionFixCommand(null);
      const result = cmd._detectLinter(tmpDir);
      expect(result).not.toBeNull();
      expect(result.name).toBe('eslint');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('detects eslint from .eslintrc (no extension) config file', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-lint-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
      fs.writeFileSync(path.join(tmpDir, '.eslintrc'), '{}');
      const cmd = new ConstitutionFixCommand(null);
      const result = cmd._detectLinter(tmpDir);
      expect(result).not.toBeNull();
      expect(result.name).toBe('eslint');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('detects eslint from .eslintrc.yaml config file', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-lint-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
      fs.writeFileSync(path.join(tmpDir, '.eslintrc.yaml'), 'rules: {}');
      const cmd = new ConstitutionFixCommand(null);
      const result = cmd._detectLinter(tmpDir);
      expect(result).not.toBeNull();
      expect(result.name).toBe('eslint');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('detects eslint from eslint.config.js flat config', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-lint-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
      fs.writeFileSync(path.join(tmpDir, 'eslint.config.js'), 'export default [];');
      const cmd = new ConstitutionFixCommand(null);
      const result = cmd._detectLinter(tmpDir);
      expect(result).not.toBeNull();
      expect(result.name).toBe('eslint');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('detects eslint from eslint.config.mjs flat config', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-lint-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
      fs.writeFileSync(path.join(tmpDir, 'eslint.config.mjs'), 'export default [];');
      const cmd = new ConstitutionFixCommand(null);
      const result = cmd._detectLinter(tmpDir);
      expect(result).not.toBeNull();
      expect(result.name).toBe('eslint');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('detects prettier from .prettierrc.json config file', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-lint-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
      fs.writeFileSync(path.join(tmpDir, '.prettierrc.json'), '{}');
      const cmd = new ConstitutionFixCommand(null);
      const result = cmd._detectLinter(tmpDir);
      expect(result).not.toBeNull();
      expect(result.name).toBe('prettier');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('detects prettier from .prettierrc.js config file', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-lint-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
      fs.writeFileSync(path.join(tmpDir, '.prettierrc.js'), 'module.exports = {};');
      const cmd = new ConstitutionFixCommand(null);
      const result = cmd._detectLinter(tmpDir);
      expect(result).not.toBeNull();
      expect(result.name).toBe('prettier');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('detects prettier from prettier.config.js config file', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-lint-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
      fs.writeFileSync(path.join(tmpDir, 'prettier.config.js'), 'module.exports = {};');
      const cmd = new ConstitutionFixCommand(null);
      const result = cmd._detectLinter(tmpDir);
      expect(result).not.toBeNull();
      expect(result.name).toBe('prettier');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });

  describe('_hasJsdocBeforeLine additional edge cases', () => {
    const cmd = new ConstitutionFixCommand(null);

    it('handles single-line jsdoc (/** ... */)', () => {
      const lines = ['/** inline jsdoc */', 'export function foo() {}'];
      expect(cmd._hasJsdocBeforeLine(lines, 1)).toBe(true);
    });

    it('returns false for block comment that is not jsdoc', () => {
      const lines = ['/* block comment */', 'export function foo() {}'];
      expect(cmd._hasJsdocBeforeLine(lines, 1)).toBe(false);
    });

    it('returns false when scanning up from line 0 with all blanks above', () => {
      const lines = ['export function foo() {}'];
      expect(cmd._hasJsdocBeforeLine(lines, 0)).toBe(false);
    });

    it('handles multi-line jsdoc with blank lines between', () => {
      const lines = ['/**', ' * Desc', ' */', '', '', 'export function foo() {}'];
      expect(cmd._hasJsdocBeforeLine(lines, 5)).toBe(true);
    });
  });

  describe('Article 1 - library-first with warnings', () => {
    async function captureConsole(fn) {
      const lines = [];
      const origLog = console.log;
      console.log = (...args) => lines.push(args.map(String).join(' '));
      try {
        await fn();
      } finally {
        console.log = origLog;
      }
      return lines.join('\n');
    }

    it('should print suggestions in dry-run mode when warnings exist', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-art1-'));
      const { ConstitutionChecker } = require('../src/cli/commands/constitution-checker');
      ConstitutionChecker.mockImplementationOnce(() => ({
        loadWaivers: jest.fn(),
        checkArticle1LibraryFirst: jest.fn(),
        issues: {
          warning: [{ article: 1, message: 'Consider using lodash for deep merge' }],
          error: [],
        },
      }));

      const cmd = new ConstitutionFixCommand(null);
      const output = await captureConsole(async () => {
        const results = await cmd.execute(tmpDir, { article: 1, dryRun: true });
        const a1 = results.find(r => r.article === 1);
        expect(a1.suggestions).toBe(1);
      });

      expect(output).toContain('Dry run - Article 1 (Library-First) suggestions');
      expect(output).toContain('Consider using lodash for deep merge');

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should print suggestions in non-dry-run mode when warnings exist', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-art1-'));
      const { ConstitutionChecker } = require('../src/cli/commands/constitution-checker');
      ConstitutionChecker.mockImplementationOnce(() => ({
        loadWaivers: jest.fn(),
        checkArticle1LibraryFirst: jest.fn(),
        issues: {
          warning: [{ article: 1, message: 'Consider using axios instead of manual http' }],
          error: [],
        },
      }));

      const cmd = new ConstitutionFixCommand(null);
      const output = await captureConsole(async () => {
        const results = await cmd.execute(tmpDir, { article: 1 });
        const a1 = results.find(r => r.article === 1);
        expect(a1.suggestions).toBe(1);
      });

      expect(output).toContain('Article 1 (Library-First) suggestions');
      expect(output).toContain('Consider using axios instead of manual http');

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });
});
