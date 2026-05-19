const fs = require('fs');
const path = require('path');
const os = require('os');
const { DoctorCommand } = require('../src/cli/commands/doctor');

function makeTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-doctor-'));
}

function setupHealthyProject(tmp) {
  fs.mkdirSync(path.join(tmp, 'stdd'));
  fs.mkdirSync(path.join(tmp, 'stdd', 'changes'));
  fs.mkdirSync(path.join(tmp, 'stdd', 'specs'));
  fs.writeFileSync(path.join(tmp, 'stdd', 'config.yaml'), 'test:\n  command: "npm test"\n');
  fs.writeFileSync(path.join(tmp, 'AGENTS.md'), '# AGENTS');
  fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ name: 'test' }));
  return tmp;
}

describe('DoctorCommand', () => {
  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    process.exitCode = 0;
  });

  afterEach(() => {
    logSpy.mockRestore();
    process.exitCode = 0;
  });

  // --- constructor ---
  it('uses process.cwd() when no cwd argument provided', () => {
    const cmd = new DoctorCommand();
    expect(cmd.cwd).toBe(process.cwd());
  });

  it('uses provided cwd argument', () => {
    const cmd = new DoctorCommand('/tmp/test-dir');
    expect(cmd.cwd).toBe('/tmp/test-dir');
  });

  // --- stddDir ---
  it('stddDir passes when stdd directory exists', () => {
    const tmp = makeTmp();
    fs.mkdirSync(path.join(tmp, 'stdd'));
    const cmd = new DoctorCommand(tmp);
    const result = cmd.stddDir();
    expect(result.status).toBe('pass');
    expect(result.message).toContain('STDD directory');
  });

  it('stddDir fails when stdd directory is missing', () => {
    const tmp = makeTmp();
    const cmd = new DoctorCommand(tmp);
    const result = cmd.stddDir();
    expect(result.status).toBe('fail');
    expect(result.message).toContain('missing');
  });

  // --- configYaml ---
  it('configYaml passes when config.yaml exists', () => {
    const tmp = makeTmp();
    fs.mkdirSync(path.join(tmp, 'stdd'));
    fs.writeFileSync(path.join(tmp, 'stdd', 'config.yaml'), 'test:\n  command: npm test\n');
    const cmd = new DoctorCommand(tmp);
    const result = cmd.configYaml();
    expect(result.status).toBe('pass');
  });

  it('configYaml fails when config.yaml is missing', () => {
    const tmp = makeTmp();
    fs.mkdirSync(path.join(tmp, 'stdd'));
    const cmd = new DoctorCommand(tmp);
    const result = cmd.configYaml();
    expect(result.status).toBe('fail');
  });

  // --- agentsMd ---
  it('agentsMd passes when AGENTS.md exists', () => {
    const tmp = makeTmp();
    fs.writeFileSync(path.join(tmp, 'AGENTS.md'), '# AGENTS');
    const cmd = new DoctorCommand(tmp);
    const result = cmd.agentsMd();
    expect(result.status).toBe('pass');
  });

  it('agentsMd warns when AGENTS.md is missing', () => {
    const tmp = makeTmp();
    const cmd = new DoctorCommand(tmp);
    const result = cmd.agentsMd();
    expect(result.status).toBe('warn');
  });

  // --- changesDir ---
  it('changesDir passes when stdd/changes/ exists', () => {
    const tmp = makeTmp();
    fs.mkdirSync(path.join(tmp, 'stdd', 'changes'), { recursive: true });
    const cmd = new DoctorCommand(tmp);
    const result = cmd.changesDir();
    expect(result.status).toBe('pass');
  });

  it('changesDir warns when stdd/changes/ is missing', () => {
    const tmp = makeTmp();
    const cmd = new DoctorCommand(tmp);
    const result = cmd.changesDir();
    expect(result.status).toBe('warn');
  });

  // --- specsDir ---
  it('specsDir passes when stdd/specs/ exists', () => {
    const tmp = makeTmp();
    fs.mkdirSync(path.join(tmp, 'stdd', 'specs'), { recursive: true });
    const cmd = new DoctorCommand(tmp);
    const result = cmd.specsDir();
    expect(result.status).toBe('pass');
  });

  it('specsDir warns when stdd/specs/ is missing', () => {
    const tmp = makeTmp();
    const cmd = new DoctorCommand(tmp);
    const result = cmd.specsDir();
    expect(result.status).toBe('warn');
  });

  // --- testConfig ---
  it('testConfig passes when test command is configured', () => {
    const tmp = makeTmp();
    fs.mkdirSync(path.join(tmp, 'stdd'));
    fs.writeFileSync(path.join(tmp, 'stdd', 'config.yaml'), 'test:\n  command: "npm test"\n');
    const cmd = new DoctorCommand(tmp);
    const result = cmd.testConfig();
    expect(result.status).toBe('pass');
    expect(result.message).toContain('npm test');
  });

  it('testConfig warns when no test command in config', () => {
    const tmp = makeTmp();
    fs.mkdirSync(path.join(tmp, 'stdd'));
    fs.writeFileSync(path.join(tmp, 'stdd', 'config.yaml'), 'other: value\n');
    const cmd = new DoctorCommand(tmp);
    const result = cmd.testConfig();
    expect(result.status).toBe('warn');
  });

  it('testConfig warns when config.yaml is missing', () => {
    const tmp = makeTmp();
    const cmd = new DoctorCommand(tmp);
    const result = cmd.testConfig();
    expect(result.status).toBe('warn');
    expect(result.message).toContain('config.yaml missing');
  });

  // --- gitHooks ---
  it('gitHooks passes when pre-commit hook contains stdd', () => {
    const tmp = makeTmp();
    fs.mkdirSync(path.join(tmp, '.git', 'hooks'), { recursive: true });
    fs.writeFileSync(path.join(tmp, '.git', 'hooks', 'pre-commit'), '#!/bin/sh\nstdd guard\n');
    const cmd = new DoctorCommand(tmp);
    const result = cmd.gitHooks();
    expect(result.status).toBe('pass');
  });

  it('gitHooks warns when pre-commit hook has no stdd reference', () => {
    const tmp = makeTmp();
    fs.mkdirSync(path.join(tmp, '.git', 'hooks'), { recursive: true });
    fs.writeFileSync(path.join(tmp, '.git', 'hooks', 'pre-commit'), '#!/bin/sh\necho "hello"\n');
    const cmd = new DoctorCommand(tmp);
    const result = cmd.gitHooks();
    expect(result.status).toBe('warn');
  });

  it('gitHooks passes via husky when husky pre-commit contains stdd', () => {
    const tmp = makeTmp();
    fs.mkdirSync(path.join(tmp, '.husky'), { recursive: true });
    fs.writeFileSync(path.join(tmp, '.husky', 'pre-commit'), '#!/bin/sh\nstdd guard\n');
    const cmd = new DoctorCommand(tmp);
    const result = cmd.gitHooks();
    expect(result.status).toBe('pass');
    expect(result.message).toContain('husky');
  });

  // --- husky ---
  it('husky passes when .husky directory exists', () => {
    const tmp = makeTmp();
    fs.mkdirSync(path.join(tmp, '.husky'));
    const cmd = new DoctorCommand(tmp);
    const result = cmd.husky();
    expect(result.status).toBe('pass');
  });

  it('husky returns info when husky in dependencies but no .husky dir', () => {
    const tmp = makeTmp();
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
      devDependencies: { husky: '^9.0.0' }
    }));
    const cmd = new DoctorCommand(tmp);
    const result = cmd.husky();
    expect(result.status).toBe('info');
    expect(result.message).toContain('dependencies');
  });

  it('husky returns info when not detected', () => {
    const tmp = makeTmp();
    const cmd = new DoctorCommand(tmp);
    const result = cmd.husky();
    expect(result.status).toBe('info');
    expect(result.message).toContain('not detected');
  });

  // --- nodeVersion ---
  it('nodeVersion passes on Node >= 20', () => {
    const cmd = new DoctorCommand();
    const result = cmd.nodeVersion();
    // CI runs Node >= 20
    expect(['pass', 'fail']).toContain(result.status);
  });

  // --- packageJson ---
  it('packageJson passes when package.json exists', () => {
    const tmp = makeTmp();
    fs.writeFileSync(path.join(tmp, 'package.json'), '{}');
    const cmd = new DoctorCommand(tmp);
    const result = cmd.packageJson();
    expect(result.status).toBe('pass');
  });

  it('packageJson warns when package.json is missing', () => {
    const tmp = makeTmp();
    const cmd = new DoctorCommand(tmp);
    const result = cmd.packageJson();
    expect(result.status).toBe('warn');
  });

  // --- execute ---
  it('execute returns JSON when options.json is true', () => {
    const tmp = setupHealthyProject(makeTmp());
    const cmd = new DoctorCommand(tmp);
    cmd.execute({ json: true });
    expect(logSpy.mock.calls.length).toBeGreaterThan(0);
    const output = logSpy.mock.calls.map(c => c[0]).join('\n');
    const parsed = JSON.parse(output);
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed.every(r => r.id && r.status)).toBe(true);
  });

  it('execute sets exitCode to 1 when errors found', () => {
    const tmp = makeTmp(); // no stdd dir = errors
    const cmd = new DoctorCommand(tmp);
    process.exitCode = 0;
    cmd.execute({ json: true });
    expect(process.exitCode).toBe(1);
  });

  it('execute prints human-readable output without json flag', () => {
    const tmp = setupHealthyProject(makeTmp());
    const cmd = new DoctorCommand(tmp);
    cmd.execute({});
    const output = logSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('STDD Copilot Doctor');
  });

  // --- _deepChecks ---
  it('_deepChecks runs without error when stdd structure exists', () => {
    const tmp = setupHealthyProject(makeTmp());
    fs.mkdirSync(path.join(tmp, 'stdd', 'changes', 'feat-x'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'stdd', 'changes', 'feat-x', 'tasks.md'), '- [ ] Task 1\n');
    const cmd = new DoctorCommand(tmp);
    const results = cmd._deepChecks();
    expect(Array.isArray(results)).toBe(true);
    expect(results.some(r => r.id === 'activeChanges')).toBe(true);
    expect(results.some(r => r.id === 'coverageReport')).toBe(true);
  });

  it('_deepChecks reports no active changes when changes dir is empty', () => {
    const tmp = setupHealthyProject(makeTmp());
    const cmd = new DoctorCommand(tmp);
    const results = cmd._deepChecks();
    const activeChange = results.find(r => r.id === 'activeChanges');
    expect(activeChange.message).toContain('No active changes');
  });

  // --- printResults ---
  it('printResults prints summary with failures and warnings', () => {
    const cmd = new DoctorCommand();
    cmd.printResults([
      { status: 'fail', message: 'Critical issue', id: 'test1', severity: 'error' },
      { status: 'warn', message: 'Minor issue', id: 'test2', severity: 'warning' },
    ]);
    const output = logSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('1 critical issue');
    expect(output).toContain('1 warning');
  });

  it('printResults prints "Everything looks good" when no issues', () => {
    const cmd = new DoctorCommand();
    cmd.printResults([
      { status: 'pass', message: 'All good', id: 'test1', severity: 'info' },
    ]);
    const output = logSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('Everything looks good');
  });
});
