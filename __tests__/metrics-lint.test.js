/**
 * Tests for MetricsCommand.runLintCheck
 *
 * Covers the following branches of runLintCheck (lines 307-383 in metrics.js):
 *   1. Line 317: package.json parse failure
 *   2. Line 321: neither eslint nor prettier in deps
 *   3. Lines 325-331: eslint vs prettier command construction
 *   4. Lines 342-344: execResult.error handling
 *   5. Lines 347-349: lint passes (status === 0)
 *   6. Lines 355-375: eslint JSON parse vs prettier text parse
 *   7. Lines 369-375: JSON parse failure -> regex fallback
 *   8. Lines 378-380: spawnSync outer catch
 *
 * Because spawnSync is imported at module level, we use jest.mock('child_process')
 * at the top of this file to control its return value per test.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Mock child_process before requiring MetricsCommand so the top-level
// const { spawnSync } = require('child_process') picks up the mock.
const mockSpawnSync = jest.fn();
jest.mock('child_process', () => ({
  spawnSync: (...args) => mockSpawnSync(...args),
}));

const { MetricsCommand } = require('../src/cli/commands/metrics');

describe('MetricsCommand - runLintCheck', () => {
  let tempDirs = [];
  let originalCwd;

  function createTempProject(name, setupFn) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-lint-test-'));
    tempDirs.push(root);
    const projectPath = path.join(root, name);
    fs.mkdirSync(projectPath, { recursive: true });
    if (setupFn) setupFn(projectPath);
    return projectPath;
  }

  beforeEach(() => {
    originalCwd = process.cwd();
    mockSpawnSync.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalCwd && process.cwd() !== originalCwd) {
      process.chdir(originalCwd);
    }
  });

  afterAll(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  // -------------------------------------------------------------------
  // Branch 1: No package.json at all -> returns N/A
  // -------------------------------------------------------------------
  it('returns N/A when package.json does not exist', () => {
    const projectPath = createTempProject('no-pkg', (p) => {
      fs.mkdirSync(path.join(p, 'src'), { recursive: true });
    });
    process.chdir(projectPath);

    const cmd = new MetricsCommand(projectPath);
    const result = cmd.runLintCheck(null);

    expect(result).toEqual({ errors: 0, warnings: 0, status: 'N/A' });
    expect(mockSpawnSync).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Branch 2: package.json is not valid JSON -> parse failure (line 317)
  // -------------------------------------------------------------------
  it('returns N/A when package.json cannot be parsed', () => {
    const projectPath = createTempProject('bad-json', (p) => {
      fs.writeFileSync(path.join(p, 'package.json'), '{ invalid json !!!');
    });
    process.chdir(projectPath);

    const cmd = new MetricsCommand(projectPath);
    const result = cmd.runLintCheck(null);

    expect(result).toEqual({ errors: 0, warnings: 0, status: 'N/A' });
    expect(mockSpawnSync).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Branch 3: Valid package.json but no eslint or prettier (line 321)
  // -------------------------------------------------------------------
  it('returns N/A when neither eslint nor prettier is in dependencies', () => {
    const projectPath = createTempProject('no-linter', (p) => {
      fs.writeFileSync(
        path.join(p, 'package.json'),
        JSON.stringify({ name: 'test', devDependencies: { jest: '^29.0.0' } })
      );
    });
    process.chdir(projectPath);

    const cmd = new MetricsCommand(projectPath);
    const result = cmd.runLintCheck(null);

    expect(result).toEqual({ errors: 0, warnings: 0, status: 'N/A' });
    expect(mockSpawnSync).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Branch 3b: eslint listed in dependencies (not devDependencies)
  // -------------------------------------------------------------------
  it('detects eslint in regular dependencies', () => {
    const projectPath = createTempProject('eslint-dep', (p) => {
      fs.writeFileSync(
        path.join(p, 'package.json'),
        JSON.stringify({ name: 'test', dependencies: { eslint: '^8.0.0' } })
      );
    });
    process.chdir(projectPath);

    // spawnSync will be called; simulate execResult.error
    mockSpawnSync.mockReturnValue({ error: new Error('ENOENT') });

    const cmd = new MetricsCommand(projectPath);
    const result = cmd.runLintCheck(null);

    // eslint was detected so spawnSync was called
    expect(mockSpawnSync).toHaveBeenCalledTimes(1);
    // eslint command construction: npx eslint ...
    const call = mockSpawnSync.mock.calls[0];
    expect(call[0]).toBe('npx');
    expect(call[1][0]).toBe('eslint');
    expect(result).toEqual({ errors: 0, warnings: 0, status: 'N/A' });
  });

  // -------------------------------------------------------------------
  // Branch 4: execResult.error is set (lines 342-344)
  // -------------------------------------------------------------------
  it('returns N/A when spawnSync reports an error', () => {
    const projectPath = createTempProject('spawn-error', (p) => {
      fs.writeFileSync(
        path.join(p, 'package.json'),
        JSON.stringify({ name: 'test', devDependencies: { eslint: '^8.0.0' } })
      );
    });
    process.chdir(projectPath);

    mockSpawnSync.mockReturnValue({
      error: new Error('Command not found: npx'),
      status: null,
    });

    const cmd = new MetricsCommand(projectPath);
    const result = cmd.runLintCheck(null);

    expect(result).toEqual({ errors: 0, warnings: 0, status: 'N/A' });
  });

  // -------------------------------------------------------------------
  // Branch 5: Lint passes cleanly (status === 0, lines 347-349)
  // -------------------------------------------------------------------
  it('returns PASS when linter exits with status 0', () => {
    const projectPath = createTempProject('lint-pass', (p) => {
      fs.writeFileSync(
        path.join(p, 'package.json'),
        JSON.stringify({ name: 'test', devDependencies: { eslint: '^8.0.0' } })
      );
    });
    process.chdir(projectPath);

    mockSpawnSync.mockReturnValue({
      error: null,
      status: 0,
      stdout: '[]',
      stderr: '',
    });

    const cmd = new MetricsCommand(projectPath);
    const result = cmd.runLintCheck(null);

    expect(result).toEqual({ errors: 0, warnings: 0, status: 'PASS' });
  });

  // -------------------------------------------------------------------
  // Branch 5b: Prettier also passes
  // -------------------------------------------------------------------
  it('returns PASS for prettier when it exits with status 0', () => {
    const projectPath = createTempProject('prettier-pass', (p) => {
      fs.writeFileSync(
        path.join(p, 'package.json'),
        JSON.stringify({ name: 'test', devDependencies: { prettier: '^3.0.0' } })
      );
    });
    process.chdir(projectPath);

    mockSpawnSync.mockReturnValue({
      error: null,
      status: 0,
      stdout: '',
      stderr: '',
    });

    const cmd = new MetricsCommand(projectPath);
    const result = cmd.runLintCheck(null);

    // prettier command construction: npx prettier --check src/
    const call = mockSpawnSync.mock.calls[0];
    expect(call[1][0]).toBe('prettier');
    expect(result).toEqual({ errors: 0, warnings: 0, status: 'PASS' });
  });

  // -------------------------------------------------------------------
  // Branch 6a: eslint JSON output parsed successfully (lines 355-364)
  // -------------------------------------------------------------------
  it('parses eslint JSON output with errors and warnings', () => {
    const projectPath = createTempProject('eslint-json', (p) => {
      fs.writeFileSync(
        path.join(p, 'package.json'),
        JSON.stringify({ name: 'test', devDependencies: { eslint: '^8.0.0' } })
      );
    });
    process.chdir(projectPath);

    const eslintOutput = JSON.stringify([
      {
        filePath: '/src/a.js',
        errorCount: 3,
        warningCount: 5,
      },
      {
        filePath: '/src/b.js',
        errorCount: 1,
        warningCount: 2,
      },
    ]);

    mockSpawnSync.mockReturnValue({
      error: null,
      status: 1,
      stdout: eslintOutput,
      stderr: '',
    });

    const cmd = new MetricsCommand(projectPath);
    const result = cmd.runLintCheck(null);

    expect(result.errors).toBe(4);
    expect(result.warnings).toBe(7);
    expect(result.status).toBe('FAIL');
  });

  // -------------------------------------------------------------------
  // Branch 6b: eslint JSON on stderr when stdout is empty
  // -------------------------------------------------------------------
  it('falls back to stderr when stdout is empty for eslint', () => {
    const projectPath = createTempProject('eslint-stderr', (p) => {
      fs.writeFileSync(
        path.join(p, 'package.json'),
        JSON.stringify({ name: 'test', devDependencies: { eslint: '^8.0.0' } })
      );
    });
    process.chdir(projectPath);

    const eslintOutput = JSON.stringify([
      { filePath: '/src/a.js', errorCount: 1, warningCount: 0 },
    ]);

    mockSpawnSync.mockReturnValue({
      error: null,
      status: 1,
      stdout: '',
      stderr: eslintOutput,
    });

    const cmd = new MetricsCommand(projectPath);
    const result = cmd.runLintCheck(null);

    expect(result.errors).toBe(1);
    expect(result.warnings).toBe(0);
    expect(result.status).toBe('FAIL');
  });

  // -------------------------------------------------------------------
  // Branch 6c: prettier text output parsed (lines 365-368)
  // -------------------------------------------------------------------
  it('counts prettier warnings from text output lines', () => {
    const projectPath = createTempProject('prettier-warn', (p) => {
      fs.writeFileSync(
        path.join(p, 'package.json'),
        JSON.stringify({ name: 'test', devDependencies: { prettier: '^3.0.0' } })
      );
    });
    process.chdir(projectPath);

    const prettierOutput = [
      'Checking formatting...',
      'src/a.js',
      'src/b.js',
      'src/c.js',
    ].join('\n');

    mockSpawnSync.mockReturnValue({
      error: null,
      status: 1,
      stdout: prettierOutput,
      stderr: '',
    });

    const cmd = new MetricsCommand(projectPath);
    const result = cmd.runLintCheck(null);

    // prettier counts non-empty lines as warnings
    expect(result.warnings).toBe(4);
    expect(result.errors).toBe(0);
    expect(result.status).toBe('WARN');
  });

  // -------------------------------------------------------------------
  // Branch 6d: eslint output with only warnings -> status WARN
  // -------------------------------------------------------------------
  it('returns WARN when eslint reports only warnings and no errors', () => {
    const projectPath = createTempProject('eslint-warn', (p) => {
      fs.writeFileSync(
        path.join(p, 'package.json'),
        JSON.stringify({ name: 'test', devDependencies: { eslint: '^8.0.0' } })
      );
    });
    process.chdir(projectPath);

    const eslintOutput = JSON.stringify([
      { filePath: '/src/a.js', errorCount: 0, warningCount: 3 },
    ]);

    mockSpawnSync.mockReturnValue({
      error: null,
      status: 1,
      stdout: eslintOutput,
      stderr: '',
    });

    const cmd = new MetricsCommand(projectPath);
    const result = cmd.runLintCheck(null);

    expect(result.errors).toBe(0);
    expect(result.warnings).toBe(3);
    expect(result.status).toBe('WARN');
  });

  // -------------------------------------------------------------------
  // Branch 7: JSON parse failure -> regex fallback (lines 369-375)
  // -------------------------------------------------------------------
  it('falls back to regex counting when eslint JSON cannot be parsed', () => {
    const projectPath = createTempProject('eslint-bad-json', (p) => {
      fs.writeFileSync(
        path.join(p, 'package.json'),
        JSON.stringify({ name: 'test', devDependencies: { eslint: '^8.0.0' } })
      );
    });
    process.chdir(projectPath);

    // Invalid JSON that looks like lint output
    const badOutput = [
      '1 error found',
      '  2:5  error  Missing semicolon     semi',
      '  3:1  warning  Unexpected console statement  no-console',
      '1 warning found',
    ].join('\n');

    mockSpawnSync.mockReturnValue({
      error: null,
      status: 1,
      stdout: badOutput,
      stderr: '',
    });

    const cmd = new MetricsCommand(projectPath);
    const result = cmd.runLintCheck(null);

    // Regex /error/gi should match "error" occurrences
    // Regex /warning/gi should match "warning" occurrences
    expect(result.errors).toBeGreaterThan(0);
    expect(result.warnings).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------
  // Branch 7b: regex fallback with no error/warning keywords -> zeros
  // -------------------------------------------------------------------
  it('regex fallback yields zeros when output has no error/warning keywords', () => {
    const projectPath = createTempProject('eslint-no-keywords', (p) => {
      fs.writeFileSync(
        path.join(p, 'package.json'),
        JSON.stringify({ name: 'test', devDependencies: { eslint: '^8.0.0' } })
      );
    });
    process.chdir(projectPath);

    mockSpawnSync.mockReturnValue({
      error: null,
      status: 1,
      stdout: 'something went wrong but no keywords',
      stderr: '',
    });

    const cmd = new MetricsCommand(projectPath);
    const result = cmd.runLintCheck(null);

    expect(result.errors).toBe(0);
    expect(result.warnings).toBe(0);
    // errors === 0, so status is WARN (not FAIL)
    expect(result.status).toBe('WARN');
  });

  // -------------------------------------------------------------------
  // Branch 8: spawnSync outer try/catch (lines 378-380)
  // -------------------------------------------------------------------
  it('returns N/A when spawnSync throws synchronously', () => {
    const projectPath = createTempProject('spawn-throws', (p) => {
      fs.writeFileSync(
        path.join(p, 'package.json'),
        JSON.stringify({ name: 'test', devDependencies: { eslint: '^8.0.0' } })
      );
    });
    process.chdir(projectPath);

    mockSpawnSync.mockImplementation(() => {
      throw new Error('spawnSync completely failed');
    });

    const cmd = new MetricsCommand(projectPath);
    const result = cmd.runLintCheck(null);

    expect(result).toEqual({ errors: 0, warnings: 0, status: 'N/A' });
  });

  // -------------------------------------------------------------------
  // Workspace variant: runLintCheck uses workspace.root as lintCwd
  // -------------------------------------------------------------------
  it('uses workspace.root as the lint working directory when provided', () => {
    const projectPath = createTempProject('ws-lint', (p) => {
      // Root-level package.json without eslint
      fs.writeFileSync(
        path.join(p, 'package.json'),
        JSON.stringify({ name: 'root', private: true, workspaces: ['packages/*'] })
      );

      // Workspace package.json with eslint
      const wsDir = path.join(p, 'packages', 'api');
      fs.mkdirSync(path.join(wsDir, 'src'), { recursive: true });
      fs.writeFileSync(
        path.join(wsDir, 'package.json'),
        JSON.stringify({ name: 'api', devDependencies: { eslint: '^8.0.0' } })
      );
    });

    const cmd = new MetricsCommand(projectPath);
    const workspace = {
      name: 'api',
      root: path.join(projectPath, 'packages', 'api'),
    };

    mockSpawnSync.mockReturnValue({
      error: null,
      status: 0,
      stdout: '[]',
      stderr: '',
    });

    const result = cmd.runLintCheck(workspace);

    expect(result.status).toBe('PASS');
    // Verify spawnSync was called with the workspace root as cwd
    const spawnCall = mockSpawnSync.mock.calls[0];
    const spawnOptions = spawnCall[2];
    expect(spawnOptions.cwd).toBe(workspace.root);
  });

  // -------------------------------------------------------------------
  // Edge: empty stdout and stderr with non-zero status -> regex fallback
  // -------------------------------------------------------------------
  it('handles empty stdout and stderr gracefully with non-zero exit', () => {
    const projectPath = createTempProject('empty-output', (p) => {
      fs.writeFileSync(
        path.join(p, 'package.json'),
        JSON.stringify({ name: 'test', devDependencies: { eslint: '^8.0.0' } })
      );
    });
    process.chdir(projectPath);

    mockSpawnSync.mockReturnValue({
      error: null,
      status: 1,
      stdout: '',
      stderr: '',
    });

    const cmd = new MetricsCommand(projectPath);
    const result = cmd.runLintCheck(null);

    // JSON.parse('') throws, then regex on empty string yields no matches
    expect(result.errors).toBe(0);
    expect(result.warnings).toBe(0);
    expect(result.status).toBe('WARN');
  });

  // -------------------------------------------------------------------
  // Edge: null stdout/stderr handled safely
  // -------------------------------------------------------------------
  it('handles null stdout and stderr safely', () => {
    const projectPath = createTempProject('null-output', (p) => {
      fs.writeFileSync(
        path.join(p, 'package.json'),
        JSON.stringify({ name: 'test', devDependencies: { eslint: '^8.0.0' } })
      );
    });
    process.chdir(projectPath);

    mockSpawnSync.mockReturnValue({
      error: null,
      status: 1,
      stdout: null,
      stderr: null,
    });

    const cmd = new MetricsCommand(projectPath);
    const result = cmd.runLintCheck(null);

    // Should not throw; defaults to regex fallback on empty string
    expect(result).toBeDefined();
    expect(result.status).toBe('WARN');
  });
});
