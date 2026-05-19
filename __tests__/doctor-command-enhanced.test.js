/**
 * DoctorCommand — enhanced unit tests
 * Tests individual check methods, JSON output mode, deep checks, and printResults.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { DoctorCommand } = require('../src/cli/commands/doctor');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir;

/** Create a fully healthy project structure */
function createHealthyProject() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-doctor-enh-'));
  fs.mkdirSync(path.join(tmpDir, 'stdd', 'changes'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'stdd', 'specs'), { recursive: true });
  fs.writeFileSync(
    path.join(tmpDir, 'stdd', 'config.yaml'),
    'test:\n  command: "npm test"\n',
  );
  fs.writeFileSync(path.join(tmpDir, 'AGENTS.md'), '# AGENTS\n');
  fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test-project' }));
  return tmpDir;
}

/** Create a bare directory with nothing */
function createEmptyDir() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-doctor-empty-'));
  return tmpDir;
}

/** Create minimal stdd/ only (no config, no AGENTS.md, etc.) */
function createMinimalStdd() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-doctor-min-'));
  fs.mkdirSync(path.join(tmpDir, 'stdd'));
  return tmpDir;
}

function cleanup() {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DoctorCommand — individual check methods', () => {
  afterEach(cleanup);

  // ---- stddDir ----
  describe('stddDir()', () => {
    it('passes when stdd/ directory exists', () => {
      const dir = createHealthyProject();
      const cmd = new DoctorCommand(dir);
      const result = cmd.stddDir();
      expect(result.status).toBe('pass');
      expect(result.message).toContain('STDD directory exists');
    });

    it('fails when stdd/ directory is missing', () => {
      const dir = createEmptyDir();
      const cmd = new DoctorCommand(dir);
      const result = cmd.stddDir();
      expect(result.status).toBe('fail');
      expect(result.message).toContain('missing');
    });
  });

  // ---- configYaml ----
  describe('configYaml()', () => {
    it('passes when stdd/config.yaml exists', () => {
      const dir = createHealthyProject();
      const cmd = new DoctorCommand(dir);
      const result = cmd.configYaml();
      expect(result.status).toBe('pass');
      expect(result.message).toContain('config.yaml present');
    });

    it('fails when config.yaml is missing', () => {
      const dir = createMinimalStdd();
      const cmd = new DoctorCommand(dir);
      const result = cmd.configYaml();
      expect(result.status).toBe('fail');
      expect(result.message).toContain('missing');
    });
  });

  // ---- agentsMd ----
  describe('agentsMd()', () => {
    it('passes when AGENTS.md exists at project root', () => {
      const dir = createHealthyProject();
      const cmd = new DoctorCommand(dir);
      const result = cmd.agentsMd();
      expect(result.status).toBe('pass');
    });

    it('warns when AGENTS.md is missing', () => {
      const dir = createEmptyDir();
      fs.mkdirSync(path.join(dir, 'stdd'), { recursive: true });
      const cmd = new DoctorCommand(dir);
      const result = cmd.agentsMd();
      expect(result.status).toBe('warn');
      expect(result.message).toContain('missing');
    });
  });

  // ---- changesDir ----
  describe('changesDir()', () => {
    it('passes when stdd/changes/ exists', () => {
      const dir = createHealthyProject();
      const cmd = new DoctorCommand(dir);
      const result = cmd.changesDir();
      expect(result.status).toBe('pass');
    });

    it('warns when stdd/changes/ is missing', () => {
      const dir = createMinimalStdd();
      const cmd = new DoctorCommand(dir);
      const result = cmd.changesDir();
      expect(result.status).toBe('warn');
    });
  });

  // ---- specsDir ----
  describe('specsDir()', () => {
    it('passes when stdd/specs/ exists', () => {
      const dir = createHealthyProject();
      const cmd = new DoctorCommand(dir);
      const result = cmd.specsDir();
      expect(result.status).toBe('pass');
    });

    it('warns when stdd/specs/ is missing', () => {
      const dir = createMinimalStdd();
      const cmd = new DoctorCommand(dir);
      const result = cmd.specsDir();
      expect(result.status).toBe('warn');
    });
  });

  // ---- testConfig ----
  describe('testConfig()', () => {
    it('passes when config.yaml has test.command', () => {
      const dir = createHealthyProject();
      const cmd = new DoctorCommand(dir);
      const result = cmd.testConfig();
      expect(result.status).toBe('pass');
      expect(result.message).toContain('npm test');
    });

    it('warns when config.yaml has no test section', () => {
      const dir = createMinimalStdd();
      fs.writeFileSync(path.join(dir, 'stdd', 'config.yaml'), 'name: test\n');
      const cmd = new DoctorCommand(dir);
      const result = cmd.testConfig();
      expect(result.status).toBe('warn');
      expect(result.message).toContain('No test command');
    });

    it('warns when config.yaml is missing entirely', () => {
      const dir = createMinimalStdd();
      const cmd = new DoctorCommand(dir);
      const result = cmd.testConfig();
      expect(result.status).toBe('warn');
      expect(result.message).toContain('Cannot check test command');
    });

    it('warns when config.yaml is malformed', () => {
      const dir = createMinimalStdd();
      fs.writeFileSync(path.join(dir, 'stdd', 'config.yaml'), '{{invalid yaml:::');
      const cmd = new DoctorCommand(dir);
      const result = cmd.testConfig();
      expect(result.status).toBe('warn');
      expect(result.message).toContain('Cannot parse');
    });
  });

  // ---- gitHooks ----
  describe('gitHooks()', () => {
    it('passes when .git/hooks/pre-commit contains stdd', () => {
      const dir = createHealthyProject();
      fs.mkdirSync(path.join(dir, '.git', 'hooks'), { recursive: true });
      fs.writeFileSync(path.join(dir, '.git', 'hooks', 'pre-commit'), '#!/bin/sh\nstdd guard\n');
      const cmd = new DoctorCommand(dir);
      const result = cmd.gitHooks();
      expect(result.status).toBe('pass');
      expect(result.message).toContain('pre-commit hook installed');
    });

    it('passes when .husky/pre-commit contains stdd', () => {
      const dir = createHealthyProject();
      fs.mkdirSync(path.join(dir, '.husky'), { recursive: true });
      fs.writeFileSync(path.join(dir, '.husky', 'pre-commit'), '#!/bin/sh\nstdd guard\n');
      const cmd = new DoctorCommand(dir);
      const result = cmd.gitHooks();
      expect(result.status).toBe('pass');
      expect(result.message).toContain('husky');
    });

    it('warns when pre-commit hook exists but has no stdd reference', () => {
      const dir = createHealthyProject();
      fs.mkdirSync(path.join(dir, '.git', 'hooks'), { recursive: true });
      fs.writeFileSync(path.join(dir, '.git', 'hooks', 'pre-commit'), '#!/bin/sh\necho hello\n');
      const cmd = new DoctorCommand(dir);
      const result = cmd.gitHooks();
      expect(result.status).toBe('warn');
      expect(result.message).toContain('does not contain stdd');
    });

    it('warns when no git hooks are installed', () => {
      const dir = createHealthyProject();
      const cmd = new DoctorCommand(dir);
      const result = cmd.gitHooks();
      expect(result.status).toBe('warn');
      expect(result.message).toContain('not installed');
    });
  });

  // ---- husky ----
  describe('husky()', () => {
    it('passes when .husky/ directory exists', () => {
      const dir = createHealthyProject();
      fs.mkdirSync(path.join(dir, '.husky'));
      const cmd = new DoctorCommand(dir);
      const result = cmd.husky();
      expect(result.status).toBe('pass');
    });

    it('returns info when husky is in package.json deps but .husky/ missing', () => {
      const dir = createHealthyProject();
      fs.writeFileSync(
        path.join(dir, 'package.json'),
        JSON.stringify({ name: 'test', devDependencies: { husky: '^9.0.0' } }),
      );
      const cmd = new DoctorCommand(dir);
      const result = cmd.husky();
      expect(result.status).toBe('info');
      expect(result.message).toContain('dependencies');
    });

    it('returns info when husky is not detected', () => {
      const dir = createMinimalStdd();
      const cmd = new DoctorCommand(dir);
      const result = cmd.husky();
      expect(result.status).toBe('info');
      expect(result.message).toContain('not detected');
    });
  });

  // ---- nodeVersion ----
  describe('nodeVersion()', () => {
    it('passes on Node >= 20 (current runtime)', () => {
      const dir = createHealthyProject();
      const cmd = new DoctorCommand(dir);
      const result = cmd.nodeVersion();
      const major = parseInt(process.version.slice(1).split('.')[0], 10);
      if (major >= 20) {
        expect(result.status).toBe('pass');
        expect(result.message).toContain(process.version);
      } else {
        expect(result.status).toBe('fail');
      }
    });
  });

  // ---- packageJson ----
  describe('packageJson()', () => {
    it('passes when package.json exists', () => {
      const dir = createHealthyProject();
      const cmd = new DoctorCommand(dir);
      const result = cmd.packageJson();
      expect(result.status).toBe('pass');
    });

    it('warns when package.json is missing', () => {
      const dir = createEmptyDir();
      const cmd = new DoctorCommand(dir);
      const result = cmd.packageJson();
      expect(result.status).toBe('warn');
      expect(result.message).toContain('not found');
    });
  });
});

// ---------------------------------------------------------------------------
// execute() — full integration
// ---------------------------------------------------------------------------

describe('DoctorCommand — execute()', () => {
  afterEach(cleanup);

  it('runs all checks and populates id + severity on each result', () => {
    const dir = createHealthyProject();
    const cmd = new DoctorCommand(dir);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    cmd.execute();

    // printResults was called
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('STDD Copilot Doctor'));

    logSpy.mockRestore();
  });

  it('sets process.exitCode = 1 when failures exist', () => {
    const dir = createEmptyDir();
    const cmd = new DoctorCommand(dir);
    const originalExitCode = process.exitCode;

    jest.spyOn(console, 'log').mockImplementation(() => {});
    cmd.execute();

    expect(process.exitCode).toBe(1);
    process.exitCode = originalExitCode;

    jest.restoreAllMocks();
  });

  it('does not set exitCode when all checks pass or warn', () => {
    const dir = createHealthyProject();
    // Ensure no git hooks (warning, not failure) — this is fine
    const cmd = new DoctorCommand(dir);
    const originalExitCode = process.exitCode;
    process.exitCode = undefined;

    jest.spyOn(console, 'log').mockImplementation(() => {});
    cmd.execute();

    expect(process.exitCode).toBe(undefined);
    process.exitCode = originalExitCode;

    jest.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// JSON output mode
// ---------------------------------------------------------------------------

describe('DoctorCommand — JSON output', () => {
  afterEach(cleanup);

  it('outputs valid JSON array with correct shape', () => {
    const dir = createHealthyProject();
    const cmd = new DoctorCommand(dir);
    let captured = '';
    const logSpy = jest.spyOn(console, 'log').mockImplementation((msg) => { captured += msg; });

    cmd.execute({ json: true });

    const parsed = JSON.parse(captured);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(10); // CHECKS array has 10 entries

    for (const r of parsed) {
      expect(r).toHaveProperty('id');
      expect(r).toHaveProperty('status');
      expect(r).toHaveProperty('message');
      expect(r).toHaveProperty('severity');
      expect(['pass', 'fail', 'warn', 'info']).toContain(r.status);
    }

    logSpy.mockRestore();
  });

  it('includes expected check IDs in JSON output', () => {
    const dir = createHealthyProject();
    const cmd = new DoctorCommand(dir);
    let captured = '';
    const logSpy = jest.spyOn(console, 'log').mockImplementation((msg) => { captured += msg; });

    cmd.execute({ json: true });

    const parsed = JSON.parse(captured);
    const ids = parsed.map(r => r.id);
    expect(ids).toContain('stddDir');
    expect(ids).toContain('configYaml');
    expect(ids).toContain('agentsMd');
    expect(ids).toContain('nodeVersion');
    expect(ids).toContain('packageJson');

    logSpy.mockRestore();
  });

  it('sets exitCode = 1 on failures in JSON mode', () => {
    const dir = createEmptyDir();
    const cmd = new DoctorCommand(dir);
    const originalExitCode = process.exitCode;

    jest.spyOn(console, 'log').mockImplementation(() => {});
    cmd.execute({ json: true });

    expect(process.exitCode).toBe(1);
    process.exitCode = originalExitCode;

    jest.restoreAllMocks();
  });

  it('does not call printResults in JSON mode', () => {
    const dir = createHealthyProject();
    const cmd = new DoctorCommand(dir);
    const printSpy = jest.spyOn(cmd, 'printResults').mockImplementation(() => {});

    jest.spyOn(console, 'log').mockImplementation(() => {});
    cmd.execute({ json: true });

    expect(printSpy).not.toHaveBeenCalled();

    jest.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// Deep checks
// ---------------------------------------------------------------------------

describe('DoctorCommand — deep checks', () => {
  afterEach(cleanup);

  it('appends deep check results when options.deep is true', () => {
    const dir = createHealthyProject();
    const cmd = new DoctorCommand(dir);
    let captured = '';
    const logSpy = jest.spyOn(console, 'log').mockImplementation((msg) => { captured += msg; });

    cmd.execute({ json: true, deep: true });

    const parsed = JSON.parse(captured);
    // Standard checks (10) + deep checks (at minimum activeChanges or npmAudit)
    expect(parsed.length).toBeGreaterThan(10);

    const deepIds = parsed.filter(r => !['stddDir', 'configYaml', 'agentsMd', 'changesDir', 'specsDir', 'testConfig', 'gitHooks', 'husky', 'nodeVersion', 'packageJson'].includes(r.id));
    expect(deepIds.length).toBeGreaterThan(0);

    // Should include activeChanges since we created stdd/changes/
    expect(deepIds.some(r => r.id === 'activeChanges')).toBe(true);

    logSpy.mockRestore();
  });

  it('reports "No active changes" when changes/ is empty', () => {
    const dir = createHealthyProject();
    const cmd = new DoctorCommand(dir);
    let captured = '';
    const logSpy = jest.spyOn(console, 'log').mockImplementation((msg) => { captured += msg; });

    cmd.execute({ json: true, deep: true });

    const parsed = JSON.parse(captured);
    const activeChanges = parsed.find(r => r.id === 'activeChanges');
    expect(activeChanges).toBeDefined();
    expect(activeChanges.message).toContain('No active changes');

    logSpy.mockRestore();
  });

  it('counts active changes with tasks.md correctly', () => {
    const dir = createHealthyProject();
    // Create two active changes, one with tasks.md
    fs.mkdirSync(path.join(dir, 'stdd', 'changes', 'feature-a'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'stdd', 'changes', 'feature-a', 'tasks.md'), '- [ ] Do stuff\n');
    fs.mkdirSync(path.join(dir, 'stdd', 'changes', 'feature-b'), { recursive: true });
    // feature-b has no tasks.md

    const cmd = new DoctorCommand(dir);
    let captured = '';
    const logSpy = jest.spyOn(console, 'log').mockImplementation((msg) => { captured += msg; });

    cmd.execute({ json: true, deep: true });

    const parsed = JSON.parse(captured);
    const activeChanges = parsed.find(r => r.id === 'activeChanges');
    expect(activeChanges.message).toContain('2 active change(s)');
    expect(activeChanges.message).toContain('1 with tasks.md');

    logSpy.mockRestore();
  });

  it('reports progress log size when progress.jsonl exists', () => {
    const dir = createHealthyProject();
    fs.writeFileSync(path.join(dir, 'stdd', 'progress.jsonl'), '{"a":1}\n{"b":2}\n');

    const cmd = new DoctorCommand(dir);
    let captured = '';
    const logSpy = jest.spyOn(console, 'log').mockImplementation((msg) => { captured += msg; });

    cmd.execute({ json: true, deep: true });

    const parsed = JSON.parse(captured);
    const progressSize = parsed.find(r => r.id === 'progressSize');
    expect(progressSize).toBeDefined();
    expect(progressSize.message).toContain('Progress log');

    logSpy.mockRestore();
  });

  it('reports evidence file count when evidence/ exists', () => {
    const dir = createHealthyProject();
    fs.mkdirSync(path.join(dir, 'stdd', 'evidence'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'stdd', 'evidence', 'run-1.json'), '{}');
    fs.writeFileSync(path.join(dir, 'stdd', 'evidence', 'run-2.json'), '{}');

    const cmd = new DoctorCommand(dir);
    let captured = '';
    const logSpy = jest.spyOn(console, 'log').mockImplementation((msg) => { captured += msg; });

    cmd.execute({ json: true, deep: true });

    const parsed = JSON.parse(captured);
    const evidenceCount = parsed.find(r => r.id === 'evidenceCount');
    expect(evidenceCount).toBeDefined();
    expect(evidenceCount.message).toContain('2 evidence file(s)');

    logSpy.mockRestore();
  });

  it('skips archive and dot directories when counting active changes', () => {
    const dir = createHealthyProject();
    fs.mkdirSync(path.join(dir, 'stdd', 'changes', 'archive'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'stdd', 'changes', '.hidden'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'stdd', 'changes', 'real-change'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'stdd', 'changes', 'real-change', 'tasks.md'), '- [ ] Task\n');

    const cmd = new DoctorCommand(dir);
    let captured = '';
    const logSpy = jest.spyOn(console, 'log').mockImplementation((msg) => { captured += msg; });

    cmd.execute({ json: true, deep: true });

    const parsed = JSON.parse(captured);
    const activeChanges = parsed.find(r => r.id === 'activeChanges');
    expect(activeChanges.message).toContain('1 active change(s)');

    logSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// printResults output format
// ---------------------------------------------------------------------------

describe('DoctorCommand — printResults()', () => {
  afterEach(cleanup);

  it('prints header, each result line, and a summary', () => {
    const dir = createHealthyProject();
    const cmd = new DoctorCommand(dir);
    const logCalls = [];
    const logSpy = jest.spyOn(console, 'log').mockImplementation((...args) => {
      logCalls.push(args.join(' '));
    });

    const results = [
      { id: 'test1', status: 'pass', message: 'All good', severity: 'error' },
      { id: 'test2', status: 'fail', message: 'Something broken', severity: 'error' },
      { id: 'test3', status: 'warn', message: 'Minor issue', severity: 'warning' },
      { id: 'test4', status: 'info', message: 'FYI note', severity: 'info' },
    ];

    cmd.printResults(results);

    const output = logCalls.join('\n');
    expect(output).toContain('STDD Copilot Doctor');
    expect(output).toContain('All good');
    expect(output).toContain('Something broken');
    expect(output).toContain('Minor issue');
    expect(output).toContain('FYI note');
    expect(output).toContain('1 critical issue(s)');
    expect(output).toContain('1 warning(s)');

    logSpy.mockRestore();
  });

  it('prints "Everything looks good" when no failures or warnings', () => {
    const dir = createHealthyProject();
    const cmd = new DoctorCommand(dir);
    const logCalls = [];
    const logSpy = jest.spyOn(console, 'log').mockImplementation((...args) => {
      logCalls.push(args.join(' '));
    });

    cmd.printResults([
      { id: 't1', status: 'pass', message: 'OK', severity: 'info' },
      { id: 't2', status: 'info', message: 'Note', severity: 'info' },
    ]);

    const output = logCalls.join('\n');
    expect(output).toContain('Everything looks good');

    logSpy.mockRestore();
  });

  it('counts multiple failures and warnings correctly', () => {
    const dir = createHealthyProject();
    const cmd = new DoctorCommand(dir);
    const logCalls = [];
    const logSpy = jest.spyOn(console, 'log').mockImplementation((...args) => {
      logCalls.push(args.join(' '));
    });

    cmd.printResults([
      { id: 't1', status: 'fail', message: 'err1', severity: 'error' },
      { id: 't2', status: 'fail', message: 'err2', severity: 'error' },
      { id: 't3', status: 'warn', message: 'w1', severity: 'warning' },
      { id: 't4', status: 'warn', message: 'w2', severity: 'warning' },
      { id: 't5', status: 'warn', message: 'w3', severity: 'warning' },
    ]);

    const output = logCalls.join('\n');
    expect(output).toContain('2 critical issue(s)');
    expect(output).toContain('3 warning(s)');
    expect(output).not.toContain('Everything looks good');

    logSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------

describe('DoctorCommand — constructor', () => {
  it('uses process.cwd() when no argument is given', () => {
    const cmd = new DoctorCommand();
    expect(cmd.cwd).toBe(process.cwd());
  });

  it('uses provided cwd', () => {
    const cmd = new DoctorCommand('/tmp/my-project');
    expect(cmd.cwd).toBe('/tmp/my-project');
  });
});
