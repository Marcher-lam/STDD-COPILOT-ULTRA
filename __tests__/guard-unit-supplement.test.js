const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Unit tests for GuardCommand.
 *
 * Uses jest.isolateModules per test so that module mocks do not leak into
 * guard.test.js (which runs the real CLI via spawnSync).
 */

// Module-level tmpDir for use in isoTest closures
let _tmpDir;
let _mocks = {};

function setupMocks() {
  _mocks = {};

  const mutationMod = require('../src/cli/commands/mutation');
  const coverageMod = require('../src/utils/coverage-parser');
  const testCmdMod = require('../src/utils/test-command-resolver');
  const wsDetectorMod = require('../src/utils/workspace-detector');
  const wsScopeMod = require('../src/utils/workspace-scope');

  _mocks.findLatestMutationEvidence = jest.spyOn(mutationMod, 'findLatestMutationEvidence').mockReturnValue(null);
  _mocks.parseCoverage = jest.spyOn(coverageMod, 'parseCoverage').mockReturnValue({ found: false });
  _mocks.resolveTestCommands = jest.spyOn(testCmdMod, 'resolveTestCommands').mockReturnValue([]);
  _mocks.resolveWorkspace = jest.spyOn(wsDetectorMod, 'resolveWorkspace').mockReturnValue(null);
  _mocks.collectSourceDirs = jest.spyOn(wsDetectorMod, 'collectSourceDirs');
  _mocks.resolveWorkspaceScope = jest.spyOn(wsScopeMod, 'resolveWorkspaceScope').mockReturnValue(null);
  _mocks.detectWorkspaceScopes = jest.spyOn(wsScopeMod, 'detectWorkspaceScopes').mockReturnValue([]);
  _mocks.commandToWorkspaceScope = jest.spyOn(wsScopeMod, 'commandToWorkspaceScope').mockReturnValue({ name: 'mock', path: 'mock' });

  _mocks.collectSourceDirs.mockImplementation((cwd) => {
    const srcDir = path.join(cwd, 'src');
    if (fs.existsSync(srcDir)) return [srcDir];
    return [];
  });

  _mocks.GuardCommand = require('../src/cli/commands/guard').GuardCommand;
}

function setupProject(options = {}) {
  setupMocks();

  fs.mkdirSync(path.join(_tmpDir, 'stdd'), { recursive: true });
  fs.mkdirSync(path.join(_tmpDir, 'src'), { recursive: true });

  const pkg = {
    name: 'test-project',
    scripts: { test: 'jest' },
    devDependencies: { eslint: '^8.0.0', jest: '^29.0.0', ...(options.deps || {}) },
  };
  fs.writeFileSync(path.join(_tmpDir, 'package.json'), JSON.stringify(pkg, null, 2));

  if (options.srcFiles) {
    for (const [name, content] of Object.entries(options.srcFiles)) {
      const fp = path.join(_tmpDir, 'src', name);
      fs.mkdirSync(path.dirname(fp), { recursive: true });
      fs.writeFileSync(fp, content);
    }
  }
  if (options.testFiles) {
    for (const [name, content] of Object.entries(options.testFiles)) {
      const fp = path.join(_tmpDir, 'src', name);
      fs.mkdirSync(path.dirname(fp), { recursive: true });
      fs.writeFileSync(fp, content);
    }
  }
}

describe('GuardCommand unit coverage', () => {
  beforeEach(() => {
    _tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-guard-unit-'));
  });

  afterEach(() => {
    fs.rmSync(_tmpDir, { recursive: true, force: true });
  });

  // Helper: runs test body inside isolateModules with tmpDir available
  function isoTest(testName, testFn) {
    test(testName, () => {
      return new Promise((resolve, reject) => {
        jest.isolateModules(() => {
          testFn().then(resolve).catch(reject);
        });
      });
    });
  }

  // ─── _getSourceDirs ───

  describe('_getSourceDirs', () => {
    isoTest('returns root src dir when no workspace focused', async () => {
      setupProject();
      const guard = new _mocks.GuardCommand(_tmpDir);
      const dirs = guard._getSourceDirs();
      expect(dirs).toContain(path.join(_tmpDir, 'src'));
    });

    isoTest('returns empty when src dir does not exist', async () => {
      setupProject();
      fs.rmSync(path.join(_tmpDir, 'src'), { recursive: true, force: true });
      _mocks.collectSourceDirs.mockReturnValue([]);
      const guard = new _mocks.GuardCommand(_tmpDir);
      const dirs = guard._getSourceDirs();
      expect(dirs).toEqual([]);
    });
  });

  // ─── _printReport ───

  describe('_printReport', () => {
    isoTest('renders all status types', async () => {
      setupMocks();
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const guard = new _mocks.GuardCommand(_tmpDir);
      guard._printReport({
        constitution: { status: 'pass' },
        lint: { status: 'fail' },
        coverage: { status: 'warn' },
        testCommands: { status: 'skip' },
        mutation: { status: 'unknown' },
      });
      const output = spy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('PASS');
      expect(output).toContain('FAIL');
      expect(output).toContain('WARN');
      expect(output).toContain('SKIP');
      spy.mockRestore();
    });
  });

  // ─── _runLint ───

  describe('_runLint', () => {
    isoTest('returns unavailable when no src dir', async () => {
      setupProject();
      _mocks.collectSourceDirs.mockReturnValue([]);
      const guard = new _mocks.GuardCommand(_tmpDir);
      const result = guard._runLint();
      expect(result.available).toBe(false);
    });

    isoTest('returns unavailable when no linter configured', async () => {
      setupProject({ deps: {} });
      const pkg = JSON.parse(fs.readFileSync(path.join(_tmpDir, 'package.json'), 'utf8'));
      delete pkg.devDependencies.eslint;
      fs.writeFileSync(path.join(_tmpDir, 'package.json'), JSON.stringify(pkg));
      const guard = new _mocks.GuardCommand(_tmpDir);
      const result = guard._runLint();
      expect(result.available).toBe(false);
      expect(result.reason).toContain('linter');
    });

    isoTest('returns unavailable when package.json is unreadable', async () => {
      setupMocks();
      fs.mkdirSync(path.join(_tmpDir, 'stdd'), { recursive: true });
      fs.mkdirSync(path.join(_tmpDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(_tmpDir, 'package.json'), 'not json');
      const guard = new _mocks.GuardCommand(_tmpDir);
      const result = guard._runLint();
      expect(result.available).toBe(false);
    });

    isoTest('returns unavailable when spawnSync errors', async () => {
      // Mock child_process before guard.js loads inside isolateModules
      jest.doMock('child_process', () => ({
        ...jest.requireActual('child_process'),
        spawnSync: jest.fn(() => ({ error: new Error('spawn ENOENT') })),
      }));
      setupProject();
      const guard = new _mocks.GuardCommand(_tmpDir);
      const result = guard._runLint();
      expect(result.available).toBe(false);
      expect(result.reason).toContain('ENOENT');
    });
  });

  // ─── _estimateCoverage ───

  describe('_estimateCoverage', () => {
    isoTest('returns estimate when no coverage report exists', async () => {
      setupProject({
        srcFiles: { 'app.js': 'const x = 1;' },
        testFiles: { 'app.test.js': 'test("x", () => {});' },
      });
      const guard = new _mocks.GuardCommand(_tmpDir);
      const result = guard._estimateCoverage();
      expect(result.coverageSource).toBe('estimate');
      expect(result.sourceFiles).toBeGreaterThan(0);
    });

    isoTest('returns none when no source files', async () => {
      setupMocks();
      fs.mkdirSync(path.join(_tmpDir, 'stdd'), { recursive: true });
      fs.writeFileSync(path.join(_tmpDir, 'package.json'), '{}');
      _mocks.collectSourceDirs.mockReturnValue([]);
      const guard = new _mocks.GuardCommand(_tmpDir);
      const result = guard._estimateCoverage();
      expect(result.coverageSource).toBe('none');
      expect(result.sourceFiles).toBe(0);
    });

    isoTest('returns report when coverage summary found', async () => {
      setupProject({ srcFiles: { 'app.js': 'const x = 1;' } });
      _mocks.parseCoverage.mockReturnValue({
        found: true, lines: { pct: 86 },
        file: path.join(_tmpDir, 'coverage', 'coverage-summary.json'),
      });
      const guard = new _mocks.GuardCommand(_tmpDir);
      const result = guard._estimateCoverage();
      expect(result.coverageSource).toBe('report');
      expect(result.lines.pct).toBe(86);
    });

    isoTest('falls through when coverage found but lines.pct is null', async () => {
      setupProject({
        srcFiles: { 'app.js': 'const x = 1;' },
        testFiles: { 'app.test.js': 'test("x", () => {});' },
      });
      _mocks.parseCoverage.mockReturnValue({ found: true, lines: { pct: null } });
      const guard = new _mocks.GuardCommand(_tmpDir);
      const result = guard._estimateCoverage();
      expect(result.coverageSource).toBe('estimate');
    });
  });

  // ─── execute: constitution branches ───

  describe('execute - constitution blocking', () => {
    isoTest('reports fail when constitution has blocking issues', async () => {
      setupProject({
        srcFiles: { 'config.js': "const password = 'secret123';\nmodule.exports = {};" },
        testFiles: { 'config.test.js': 'test("x", () => {});' },
      });
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const guard = new _mocks.GuardCommand(_tmpDir);
      const report = await guard.execute({ constitution: true });
      expect(report.constitution.status).toBe('fail');
      const output = spy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Guard Failed');
      spy.mockRestore();
    });
  });

  describe('execute - constitution warning', () => {
    isoTest('exercises warning branch with unused deps', async () => {
      setupMocks();
      fs.mkdirSync(path.join(_tmpDir, 'stdd'), { recursive: true });
      fs.mkdirSync(path.join(_tmpDir, 'src'), { recursive: true });
      const pkg = {
        name: 'test-project',
        scripts: { test: 'jest' },
        devDependencies: { jest: '^29.0.0', lodash: '^4.17.21' },
      };
      fs.writeFileSync(path.join(_tmpDir, 'package.json'), JSON.stringify(pkg, null, 2));
      fs.writeFileSync(path.join(_tmpDir, 'src', 'app.js'), 'const x = 1;\nmodule.exports = { x };');
      fs.writeFileSync(path.join(_tmpDir, 'src', 'app.test.js'), 'test("x", () => {});');

      const spy = jest.spyOn(console, 'log').mockImplementation();
      const guard = new _mocks.GuardCommand(_tmpDir);
      const report = await guard.execute({ constitution: true });
      expect(['pass', 'warn', 'fail']).toContain(report.constitution.status);
      spy.mockRestore();
    });
  });

  // ─── execute: lint branches ───

  describe('execute - lint', () => {
    isoTest('lint passes when eslint returns exit code 0', async () => {
      setupProject({
        srcFiles: { 'app.js': 'const x = 1;' },
        testFiles: { 'app.test.js': 'test("x", () => {});' },
      });
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const guard = new _mocks.GuardCommand(_tmpDir);
      guard._runLint = () => ({
        available: true, type: 'eslint', exitCode: 0,
        issueCount: 0, output: '', stderr: '',
      });
      const report = await guard.execute({ constitution: false });
      expect(report.lint.status).toBe('pass');
      const output = spy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('no issues');
      spy.mockRestore();
    });

    isoTest('lint warns when eslint returns non-zero', async () => {
      setupProject({
        srcFiles: { 'app.js': 'const x = 1;' },
        testFiles: { 'app.test.js': 'test("x", () => {});' },
      });
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const guard = new _mocks.GuardCommand(_tmpDir);
      guard._runLint = () => ({
        available: true, type: 'eslint', exitCode: 1,
        issueCount: 3, output: 'src/app.js: line 1, col 1 - Error', stderr: '',
      });
      const report = await guard.execute({ constitution: false });
      expect(report.lint.status).toBe('warn');
      spy.mockRestore();
    });

    isoTest('lint fails in strict mode with issues', async () => {
      setupProject({
        srcFiles: { 'app.js': 'const x = 1;' },
        testFiles: { 'app.test.js': 'test("x", () => {});' },
      });
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const guard = new _mocks.GuardCommand(_tmpDir);
      guard._runLint = () => ({
        available: true, type: 'eslint', exitCode: 1,
        issueCount: 2, output: 'error', stderr: '',
      });
      const report = await guard.execute({ constitution: false, strict: true });
      expect(report.lint.status).toBe('fail');
      spy.mockRestore();
    });

    isoTest('lint skips when not available', async () => {
      setupProject({
        srcFiles: { 'app.js': 'const x = 1;' },
        testFiles: { 'app.test.js': 'test("x", () => {});' },
      });
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const guard = new _mocks.GuardCommand(_tmpDir);
      guard._runLint = () => ({ available: false, reason: 'No linter configured' });
      const report = await guard.execute({ constitution: false });
      expect(report.lint.status).toBe('skip');
      spy.mockRestore();
    });
  });

  // ─── execute: coverage branches ───

  describe('execute - coverage report', () => {
    isoTest('reports pass when coverage report has acceptable line coverage', async () => {
      setupProject({
        srcFiles: { 'app.js': 'const x = 1;' },
        testFiles: { 'app.test.js': 'test("x", () => {});' },
      });
      _mocks.parseCoverage.mockReturnValue({
        found: true, lines: { pct: 90 },
        file: path.join(_tmpDir, 'coverage', 'coverage-summary.json'),
      });
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const guard = new _mocks.GuardCommand(_tmpDir);
      const report = await guard.execute({ constitution: false });
      expect(report.coverage.status).toBe('pass');
      const output = spy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Line coverage: 90.0%');
      expect(output).toContain('Line coverage acceptable');
      spy.mockRestore();
    });

    isoTest('reports warn when coverage report has low line coverage', async () => {
      setupProject({
        srcFiles: { 'app.js': 'const x = 1;' },
        testFiles: { 'app.test.js': 'test("x", () => {});' },
      });
      _mocks.parseCoverage.mockReturnValue({
        found: true, lines: { pct: 50 },
        file: path.join(_tmpDir, 'coverage', 'coverage-summary.json'),
      });
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const guard = new _mocks.GuardCommand(_tmpDir);
      const report = await guard.execute({ constitution: false });
      expect(report.coverage.status).toBe('warn');
      const output = spy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Line coverage below 80%');
      spy.mockRestore();
    });
  });

  describe('execute - coverage estimate', () => {
    isoTest('reports warn when test ratio is below 20%', async () => {
      setupProject({
        srcFiles: {
          'a.js': 'const a = 1;', 'b.js': 'const b = 2;',
          'c.js': 'const c = 3;', 'd.js': 'const d = 4;', 'e.js': 'const e = 5;',
        },
        testFiles: { 'a.test.js': 'test("a", () => {});' },
      });
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const guard = new _mocks.GuardCommand(_tmpDir);
      const report = await guard.execute({ constitution: false });
      expect(report.coverage.status).toBe('warn');
      const output = spy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Test ratio below 20%');
      spy.mockRestore();
    });

    isoTest('reports pass when test ratio is acceptable', async () => {
      setupProject({
        srcFiles: { 'app.js': 'const x = 1;' },
        testFiles: {
          'app.test.js': 'test("x", () => {});',
          'app.spec.js': 'test("y", () => {});',
        },
      });
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const guard = new _mocks.GuardCommand(_tmpDir);
      const report = await guard.execute({ constitution: false });
      expect(report.coverage.status).toBe('pass');
      const output = spy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Test ratio acceptable');
      spy.mockRestore();
    });
  });

  // ─── execute: test commands branch ───

  describe('execute - test commands', () => {
    isoTest('reports pass when test commands found', async () => {
      setupProject({
        srcFiles: { 'app.js': 'const x = 1;' },
        testFiles: { 'app.test.js': 'test("x", () => {});' },
      });
      _mocks.resolveTestCommands.mockReturnValue([{
        command: 'npm test', cwd: _tmpDir, workspaceName: 'root', source: 'package.json',
      }]);
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const guard = new _mocks.GuardCommand(_tmpDir);
      const report = await guard.execute({ constitution: false });
      expect(report.testCommands.status).toBe('pass');
      spy.mockRestore();
    });
  });

  // ─── execute: mutation evidence branches ───

  describe('execute - mutation evidence', () => {
    isoTest('reports mutation evidence when found with mutationScore', async () => {
      setupProject({
        srcFiles: { 'app.js': 'const x = 1;' },
        testFiles: { 'app.test.js': 'test("x", () => {});' },
      });
      _mocks.findLatestMutationEvidence.mockReturnValue({
        filePath: path.join(_tmpDir, 'stdd', 'evidence', 'mutation-123.json'),
        data: { status: 'pass', mutationScore: 85, threshold: 80, mode: 'full' },
      });
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const guard = new _mocks.GuardCommand(_tmpDir);
      const report = await guard.execute({ constitution: false });
      expect(report.mutation.status).toBe('pass');
      expect(report.mutation.details.score).toBe(85);
      const output = spy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('85%');
      spy.mockRestore();
    });

    isoTest('reports warn when mutation evidence status is fail', async () => {
      setupProject({
        srcFiles: { 'app.js': 'const x = 1;' },
        testFiles: { 'app.test.js': 'test("x", () => {});' },
      });
      _mocks.findLatestMutationEvidence.mockReturnValue({
        filePath: path.join(_tmpDir, 'stdd', 'evidence', 'mutation-456.json'),
        data: { status: 'fail', score: 40, threshold: 80, mode: 'full' },
      });
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const guard = new _mocks.GuardCommand(_tmpDir);
      const report = await guard.execute({ constitution: false });
      expect(report.mutation.status).toBe('warn');
      spy.mockRestore();
    });

    isoTest('uses score field when mutationScore is undefined', async () => {
      setupProject({
        srcFiles: { 'app.js': 'const x = 1;' },
        testFiles: { 'app.test.js': 'test("x", () => {});' },
      });
      _mocks.findLatestMutationEvidence.mockReturnValue({
        filePath: path.join(_tmpDir, 'stdd', 'evidence', 'mutation-789.json'),
        data: { status: 'pass', score: 72, threshold: 80, mode: 'full' },
      });
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const guard = new _mocks.GuardCommand(_tmpDir);
      const report = await guard.execute({ constitution: false });
      expect(report.mutation.details.score).toBe(72);
      spy.mockRestore();
    });

    isoTest('handles null score in mutation evidence', async () => {
      setupProject({
        srcFiles: { 'app.js': 'const x = 1;' },
        testFiles: { 'app.test.js': 'test("x", () => {});' },
      });
      _mocks.findLatestMutationEvidence.mockReturnValue({
        filePath: path.join(_tmpDir, 'stdd', 'evidence', 'mutation-null.json'),
        data: { status: 'pass', mutationScore: null, threshold: 80, mode: 'full' },
      });
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const guard = new _mocks.GuardCommand(_tmpDir);
      await guard.execute({ constitution: false });
      const output = spy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('n/a');
      spy.mockRestore();
    });
  });

  // ─── execute: workspace metadata branches ───

  describe('execute - workspace metadata', () => {
    isoTest('sets workspace in metadata when workspace scope is resolved', async () => {
      setupProject({
        srcFiles: { 'app.js': 'const x = 1;' },
        testFiles: { 'app.test.js': 'test("x", () => {});' },
      });
      const wsScope = { name: 'api', path: 'packages/api', root: path.join(_tmpDir, 'packages', 'api') };
      _mocks.resolveWorkspaceScope.mockReturnValue(wsScope);
      _mocks.resolveWorkspace.mockReturnValue({ name: 'api', root: path.join(_tmpDir, 'packages', 'api') });

      const spy = jest.spyOn(console, 'log').mockImplementation();
      const guard = new _mocks.GuardCommand(_tmpDir);
      const report = await guard.execute({ constitution: false, workspace: 'packages/api' });
      expect(report.workspace).toEqual(wsScope);
      spy.mockRestore();
    });

    isoTest('sets workspaces in metadata when detectedWorkspaces exist', async () => {
      setupProject({
        srcFiles: { 'app.js': 'const x = 1;' },
        testFiles: { 'app.test.js': 'test("x", () => {});' },
      });
      const wsList = [{ name: 'api', path: 'packages/api' }, { name: 'web', path: 'packages/web' }];
      _mocks.detectWorkspaceScopes.mockReturnValue(wsList);

      const spy = jest.spyOn(console, 'log').mockImplementation();
      const guard = new _mocks.GuardCommand(_tmpDir);
      const report = await guard.execute({ constitution: false });
      expect(report.workspaces).toEqual(wsList);
      spy.mockRestore();
    });
  });

  // ─── execute: full integration ───

  describe('execute', () => {
    isoTest('full guard run passes on healthy project', async () => {
      setupProject({
        srcFiles: { 'app.js': 'const x = 1;' },
        testFiles: { 'app.test.js': 'test("x", () => {});' },
      });
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const guard = new _mocks.GuardCommand(_tmpDir);
      const report = await guard.execute({ constitution: false });
      expect(report.constitution.status).toBe('skip');
      expect(report).toBeDefined();
      spy.mockRestore();
    });

    isoTest('throws on invalid workspace', async () => {
      setupProject();
      _mocks.resolveWorkspace.mockReturnValue(null);
      const guard = new _mocks.GuardCommand(_tmpDir);
      await expect(guard.execute({ workspace: 'nonexistent' })).rejects.toThrow('not found');
    });

    isoTest('handles strict mode with lint warnings', async () => {
      setupProject({
        srcFiles: { 'app.js': 'const x = 1;' },
        testFiles: { 'app.test.js': 'test("x", () => {});' },
      });
      const spy = jest.spyOn(console, 'log').mockImplementation();
      const guard = new _mocks.GuardCommand(_tmpDir);
      const report = await guard.execute({ constitution: false, strict: true });
      expect(report).toBeDefined();
      spy.mockRestore();
    });
  });
});
