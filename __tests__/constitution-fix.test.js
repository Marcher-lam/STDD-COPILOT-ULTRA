const fs = require('fs');
const path = require('path');
const os = require('os');
const { ConstitutionFixCommand } = require('../src/cli/commands/constitution-fix');

describe('ConstitutionFixCommand', () => {
  let tempDir;

  function setup() {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-const-fix-'));
  }

  function teardown() {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  afterAll(() => {
    teardown();
  });

  const silentSpinner = {
    text: '',
    start() {},
    stop() {},
    succeed() {},
    fail() {}
  };

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

  function setupWorkspaces() {
    fs.writeFileSync(path.join(tempDir, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/*"\n');
    fs.mkdirSync(path.join(tempDir, 'packages', 'api', 'src'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'packages', 'web', 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'packages', 'api', 'package.json'), JSON.stringify({ name: '@test/api' }));
    fs.writeFileSync(path.join(tempDir, 'packages', 'web', 'package.json'), JSON.stringify({ name: '@test/web' }));
  }

  describe('Article 5 - JSDoc fix', () => {
    it('should insert JSDoc blocks before undocumented exported functions', async () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'utils.js'),
        'export function add(a, b) { return a + b; }\nexport function subtract(x, y) { return x - y; }\nmodule.exports = {};\n'
      );

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 5 });

      const article5Result = results.find(r => r.article === 5);
      expect(article5Result.fixed.length).toBe(1);
      expect(article5Result.fixed).toContain('src/utils.js');

      const content = fs.readFileSync(path.join(srcDir, 'utils.js'), 'utf8');
      expect(content).toContain('/**\n');
      expect(content).toContain('[Description needed]');
      expect(content).toContain('@param');
      expect(content).toContain('@returns');
      expect(content).toContain('export function add');
      expect(content).toContain('export function subtract');

      teardown();
    });

    it('should not modify files that already have JSDoc', async () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'documented.js'),
        '/**\n * Adds two numbers.\n * @param {number} a\n * @param {number} b\n * @returns {number}\n */\nexport function add(a, b) { return a + b; }\n'
      );

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 5 });

      const article5Result = results.find(r => r.article === 5);
      expect(article5Result.fixed).toHaveLength(0);

      teardown();
    });

    it('should handle exported classes', async () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'service.js'),
        'export class UserService {\n  getName() { return "test"; }\n}\n'
      );

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 5 });

      const article5Result = results.find(r => r.article === 5);
      expect(article5Result.fixed.length).toBe(1);

      const content = fs.readFileSync(path.join(srcDir, 'service.js'), 'utf8');
      expect(content).toContain('/**\n');
      expect(content).toContain('@name UserService');
      expect(content).toContain('export class UserService');

      teardown();
    });

    it('should handle arrow function exports', async () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'fn.js'),
        'export const multiply = (a, b) => a * b;\n'
      );

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 5 });

      const article5Result = results.find(r => r.article === 5);
      expect(article5Result.fixed.length).toBe(1);

      const content = fs.readFileSync(path.join(srcDir, 'fn.js'), 'utf8');
      expect(content).toContain('export const multiply');
      expect(content).toContain('@param');
      expect(content).toContain('@returns');

      teardown();
    });

    it('should insert JSDoc in workspace source files', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/*"\n');
      const srcDir = path.join(tempDir, 'packages', 'api', 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'packages', 'api', 'package.json'), JSON.stringify({ name: '@test/api' }));
      fs.writeFileSync(
        path.join(srcDir, 'service.ts'),
        'export function getUser(id) { return { id }; }\n'
      );

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 5 });

      const article5Result = results.find(r => r.article === 5);
      expect(article5Result.fixed).toContain('packages/api/src/service.ts');

      const content = fs.readFileSync(path.join(srcDir, 'service.ts'), 'utf8');
      expect(content).toContain('/**\n');
      expect(content).toContain('@name getUser');
      expect(content).toContain('@param {*} id');
      expect(content).toContain('export function getUser');

      teardown();
    });

    it('should skip simple constant exports', async () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'consts.js'),
        'export const VERSION = "1.0";\nexport const NAME = "app";\n'
      );

      const originalContent = fs.readFileSync(path.join(srcDir, 'consts.js'), 'utf8');

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 5 });

      const article5Result = results.find(r => r.article === 5);
      expect(article5Result.fixed).toHaveLength(0);

      const contentAfter = fs.readFileSync(path.join(srcDir, 'consts.js'), 'utf8');
      expect(contentAfter).toBe(originalContent);

      teardown();
    });
  });

  describe('--dry-run mode', () => {
    it('should not modify files in dry-run mode for Article 5', async () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'utils.js'),
        'export function add(a, b) { return a + b; }\n'
      );

      const originalContent = fs.readFileSync(path.join(srcDir, 'utils.js'), 'utf8');

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 5, dryRun: true });

      const article5Result = results.find(r => r.article === 5);
      expect(article5Result.fixed.length).toBe(1);
      expect(article5Result.dryRun).toBe(true);

      const contentAfter = fs.readFileSync(path.join(srcDir, 'utils.js'), 'utf8');
      expect(contentAfter).toBe(originalContent);

      teardown();
    });

    it('should not create test files in dry-run mode for Article 2', async () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'helper.js'), 'export const foo = () => 1;\n');

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 2, dryRun: true });

      const article2Result = results.find(r => r.article === 2);
      expect(article2Result.dryRun).toBe(true);
      expect(article2Result.created.length).toBe(1);
      expect(article2Result.created).toContain('src/__tests__/helper.test.js');

      const testPath = path.join(srcDir, '__tests__', 'helper.test.js');
      expect(fs.existsSync(testPath)).toBe(false);

      teardown();
    });

    it('should not modify workspace files in dry-run mode for Article 5', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/*"\n');
      const srcDir = path.join(tempDir, 'packages', 'api', 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'packages', 'api', 'package.json'), JSON.stringify({ name: '@test/api' }));
      const filePath = path.join(srcDir, 'service.ts');
      fs.writeFileSync(filePath, 'export function getUser(id) { return { id }; }\n');

      const originalContent = fs.readFileSync(filePath, 'utf8');

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 5, dryRun: true });

      const article5Result = results.find(r => r.article === 5);
      expect(article5Result.fixed).toContain('packages/api/src/service.ts');
      expect(article5Result.dryRun).toBe(true);
      expect(fs.readFileSync(filePath, 'utf8')).toBe(originalContent);

      teardown();
    });
  });

  describe('Article 2 - TDD fix', () => {
    it('should create test files for source files without tests', async () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'math.js'), 'export const add = (a, b) => a + b;\n');

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 2 });

      const article2Result = results.find(r => r.article === 2);
      expect(article2Result.created.length).toBe(1);
      expect(article2Result.created).toContain('src/__tests__/math.test.js');
      expect(fs.existsSync(path.join(srcDir, '__tests__', 'math.test.js'))).toBe(true);

      teardown();
    });

    it('should create tests only inside the selected workspace', async () => {
      setup();
      setupWorkspaces();

      fs.writeFileSync(path.join(tempDir, 'packages', 'api', 'src', 'api.js'), 'export const api = () => true;\n');
      fs.writeFileSync(path.join(tempDir, 'packages', 'web', 'src', 'web.js'), 'export const web = () => true;\n');

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 2, workspace: 'packages/api' });

      const article2Result = results.find(r => r.article === 2);
      expect(article2Result.workspace).toMatchObject({ name: '@test/api', path: 'packages/api' });
      expect(article2Result.created).toContain('packages/api/src/__tests__/api.test.js');
      expect(fs.existsSync(path.join(tempDir, 'packages', 'api', 'src', '__tests__', 'api.test.js'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'packages', 'web', 'src', '__tests__', 'web.test.js'))).toBe(false);

      teardown();
    });
  });

  describe('Article 4 - Code Style lint auto-fix', () => {
    it('should detect eslint from devDependencies', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ devDependencies: { eslint: '^8.0.0' } }));

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const linter = cmd._detectLinter(tempDir);

      expect(linter.name).toBe('eslint');
      expect(linter.command).toContain('eslint');
      expect(linter.command).toContain('--fix');

      teardown();
    });

    it('should detect prettier from devDependencies', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ devDependencies: { prettier: '^3.0.0' } }));

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const linter = cmd._detectLinter(tempDir);

      expect(linter.name).toBe('prettier');
      expect(linter.command).toContain('prettier');
      expect(linter.command).toContain('--write');

      teardown();
    });

    it('should detect standard from devDependencies', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ devDependencies: { standard: '^17.0.0' } }));

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const linter = cmd._detectLinter(tempDir);

      expect(linter.name).toBe('standard');
      expect(linter.command).toContain('standard');
      expect(linter.command).toContain('--fix');

      teardown();
    });

    it('should detect eslint from config file when not in dependencies', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, '.eslintrc.json'), JSON.stringify({ rules: {} }));

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const linter = cmd._detectLinter(tempDir);

      expect(linter.name).toBe('eslint');

      teardown();
    });

    it('should detect prettier from config file when not in dependencies', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, '.prettierrc'), JSON.stringify({ semi: true }));

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const linter = cmd._detectLinter(tempDir);

      expect(linter.name).toBe('prettier');

      teardown();
    });

    it('should return null when no linter is detected', async () => {
      setup();

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const linter = cmd._detectLinter(tempDir);

      expect(linter).toBeNull();

      teardown();
    });

    it('should return null when package.json is invalid', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, 'package.json'), 'not valid json');

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const linter = cmd._detectLinter(tempDir);

      expect(linter).toBeNull();

      teardown();
    });

    it('should execute dry-run mode for Article 4', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ devDependencies: { eslint: '^8.0.0' } }));

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 4, dryRun: true });

      const article4Result = results.find(r => r.article === 4);
      expect(article4Result.dryRun).toBe(true);
      expect(article4Result.linter).toBe('eslint');
      expect(article4Result.command).toContain('eslint');
      expect(article4Result.fixed).toBe(0);

      teardown();
    });

    it('should return linter: null when no linter detected for Article 4', async () => {
      setup();

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 4 });

      const article4Result = results.find(r => r.article === 4);
      expect(article4Result.linter).toBeNull();
      expect(article4Result.fixed).toBe(0);

      teardown();
    });

    it('should use workspace package.json linter and not fall back to root', async () => {
      setup();
      setupWorkspaces();
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ devDependencies: { prettier: '^3.0.0' } }));
      fs.writeFileSync(path.join(tempDir, 'packages', 'api', 'package.json'), JSON.stringify({ name: '@test/api', devDependencies: { eslint: '^8.0.0' } }));

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, { article: 4, workspace: 'packages/api', dryRun: true });

      const article4Result = results.find(r => r.article === 4);
      expect(article4Result.workspace).toMatchObject({ name: '@test/api', path: 'packages/api' });
      expect(article4Result.linter).toBe('eslint');
      expect(article4Result.command).toContain('eslint');
      expect(article4Result.command).not.toContain('prettier');
      expect(article4Result.targets).toEqual(['packages/api']);

      teardown();
    });

    it('should count lint errors before and after fix', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ devDependencies: { eslint: '^8.0.0' } }));

      const cmd = new ConstitutionFixCommand(silentSpinner);

      const linter = cmd._detectLinter(tempDir);
      expect(linter.name).toBe('eslint');

      const errors = await cmd._countLintErrors(tempDir, linter);
      expect(errors).toBeGreaterThanOrEqual(0);

      teardown();
    });

    it('should handle prettier config detection', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ dependencies: {}, devDependencies: {} }));
      fs.writeFileSync(path.join(tempDir, '.prettierrc'), JSON.stringify({ singleQuote: true }));

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const linter = cmd._detectLinter(tempDir);

      expect(linter.name).toBe('prettier');
      expect(linter.command).toContain('prettier');
      expect(linter.command).toContain('--write');

      teardown();
    });

    it('should prefer eslint over prettier when both exist', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ devDependencies: { eslint: '^8.0.0', prettier: '^3.0.0' } }));

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const linter = cmd._detectLinter(tempDir);

      expect(linter.name).toBe('eslint');

      teardown();
    });
  });

  describe('default - run all fixes', () => {
    it('should fix all articles when no article specified', async () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'utils.js'),
        'export function helper(x) { return x; }\n'
      );

      const cmd = new ConstitutionFixCommand(silentSpinner);
      const results = await cmd.execute(tempDir, {});

      expect(results.length).toBe(4);
      expect(results.find(r => r.article === 1)).toBeDefined();
      expect(results.find(r => r.article === 2)).toBeDefined();
      expect(results.find(r => r.article === 4)).toBeDefined();
      expect(results.find(r => r.article === 5)).toBeDefined();

      const article5Result = results.find(r => r.article === 5);
      expect(article5Result.fixed.length).toBe(1);

      teardown();
    });
  });

  describe('workspace scope', () => {
    it('should throw a clear error when workspace does not exist', async () => {
      setup();

      const cmd = new ConstitutionFixCommand(silentSpinner);
      await expect(cmd.execute(tempDir, { article: 2, workspace: 'packages/missing' }))
        .rejects
        .toThrow("Workspace 'packages/missing' not found.");

      teardown();
    });

    it('should dry-run Article 5 for selected workspace without modifying files and print workspace', async () => {
      setup();
      setupWorkspaces();

      const apiFile = path.join(tempDir, 'packages', 'api', 'src', 'service.js');
      const webFile = path.join(tempDir, 'packages', 'web', 'src', 'service.js');
      fs.writeFileSync(apiFile, 'export function apiService() { return true; }\n');
      fs.writeFileSync(webFile, 'export function webService() { return true; }\n');
      const apiOriginal = fs.readFileSync(apiFile, 'utf8');
      const webOriginal = fs.readFileSync(webFile, 'utf8');

      let results;
      const output = await captureConsole(async () => {
        const cmd = new ConstitutionFixCommand(silentSpinner);
        results = await cmd.execute(tempDir, { article: 5, workspace: 'packages/api', dryRun: true });
      });

      const article5Result = results.find(r => r.article === 5);
      expect(article5Result.workspace).toMatchObject({ name: '@test/api', path: 'packages/api' });
      expect(article5Result.fixed).toContain('packages/api/src/service.js');
      expect(article5Result.fixed).not.toContain('packages/web/src/service.js');
      expect(output).toContain('Workspace: @test/api (packages/api)');
      expect(fs.readFileSync(apiFile, 'utf8')).toBe(apiOriginal);
      expect(fs.readFileSync(webFile, 'utf8')).toBe(webOriginal);

      teardown();
    });
  });
});
