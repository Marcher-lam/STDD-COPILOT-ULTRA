const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { GraphHistoryCommand } = require('../src/cli/commands/graph-history');

describe('GraphHistoryCommand', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-graph-history-'));
    const stddDir = path.join(tmpDir, 'stdd');
    fs.mkdirSync(stddDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function createEvidence(content, changeDir) {
    const evidenceDir = path.join(changeDir, 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });
    const filePath = path.join(evidenceDir, 'verify-' + Date.now() + '.json');
    fs.writeFileSync(filePath, JSON.stringify(content), 'utf-8');
    return filePath;
  }

  it('returns empty array when no evidence exists', () => {
    const cmd = new GraphHistoryCommand(tmpDir);
    const entries = cmd.scanEvidence();
    expect(entries).toEqual([]);
  });

  it('reads a single verify evidence entry', () => {
    const evidenceContent = {
      id: 'abc123def456',
      type: 'verify',
      timestamp: '2026-05-12T10:00:00.000Z',
      unixTimestamp: 1747044000000,
      status: 'pass',
      results: {
        tasks: { allDone: true, done: 3, total: 3 },
        tests: { passed: true },
        constitution: { status: 'pass' },
      },
    };

    createEvidence(evidenceContent, path.join(tmpDir, 'stdd'));

    const cmd = new GraphHistoryCommand(tmpDir);
    const entries = cmd.scanEvidence();

    expect(entries.length).toBe(1);
    expect(entries[0].id).toBe('abc123def456');
    expect(entries[0].type).toBe('verify');
    expect(entries[0].status).toBe('pass');
  });

  it('reads change-level evidence with change name', () => {
    const changeDir = path.join(tmpDir, 'stdd', 'changes', 'add-dark-mode');
    const evidenceContent = {
      id: 'change-evidence-1',
      type: 'verify',
      timestamp: '2026-05-12T10:30:00.000Z',
      unixTimestamp: 1747045800000,
      status: 'fail',
      metadata: { changeName: 'add-dark-mode' },
      results: {
        tasks: { allDone: false, done: 1, total: 3 },
        tests: { passed: false, error: 'Test failed' },
      },
    };

    createEvidence(evidenceContent, changeDir);

    const cmd = new GraphHistoryCommand(tmpDir);
    const entries = cmd.scanEvidence();

    expect(entries.length).toBe(1);
    expect(entries[0].changeName).toBe('add-dark-mode');
    expect(entries[0].status).toBe('fail');
  });

  it('sorts entries by timestamp descending', () => {
    const evidenceDir = path.join(tmpDir, 'stdd', 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });

    const older = { id: 'old-id', timestamp: '2026-05-12T09:00:00.000Z', unixTimestamp: 1747040400000, type: 'verify', status: 'pass' };
    const newer = { id: 'new-id', timestamp: '2026-05-12T11:00:00.000Z', unixTimestamp: 1747047600000, type: 'guard', status: 'pass' };

    fs.writeFileSync(path.join(evidenceDir, 'verify-1747040400000.json'), JSON.stringify(older), 'utf-8');
    fs.writeFileSync(path.join(evidenceDir, 'guard-1747047600000.json'), JSON.stringify(newer), 'utf-8');

    const cmd = new GraphHistoryCommand(tmpDir);
    const entries = cmd.scanEvidence();

    expect(entries.length).toBe(2);
    expect(entries[0].id).toBe('new-id');
    expect(entries[1].id).toBe('old-id');
  });

  it('filters by change name', () => {
    const changeA = path.join(tmpDir, 'stdd', 'changes', 'change-a');
    const changeB = path.join(tmpDir, 'stdd', 'changes', 'change-b');

    createEvidence({ id: 'a1', type: 'verify', status: 'pass', timestamp: '2026-05-12T10:00:00.000Z', unixTimestamp: 1747044000000 }, changeA);
    createEvidence({ id: 'b1', type: 'verify', status: 'pass', timestamp: '2026-05-12T10:01:00.000Z', unixTimestamp: 1747044060000 }, changeB);

    const cmd = new GraphHistoryCommand(tmpDir);
    const entries = cmd.scanEvidence({ change: 'change-a' });

    expect(entries.length).toBe(1);
    expect(entries[0].changeName).toBe('change-a');
  });

  it('filters by explicit workspace metadata', () => {
    const evidenceDir = path.join(tmpDir, 'stdd', 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });

    fs.writeFileSync(path.join(evidenceDir, 'verify-1.json'), JSON.stringify({
      id: 'api-evidence',
      type: 'verify',
      status: 'pass',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      metadata: { workspace: { name: '@demo/api', path: 'packages/api', root: path.join(tmpDir, 'packages', 'api') } },
    }), 'utf-8');
    fs.writeFileSync(path.join(evidenceDir, 'verify-2.json'), JSON.stringify({
      id: 'web-evidence',
      type: 'verify',
      status: 'pass',
      timestamp: '2026-01-01T00:01:00.000Z',
      unixTimestamp: 1735689660000,
      metadata: { workspace: { name: '@demo/web', path: 'packages/web', root: path.join(tmpDir, 'packages', 'web') } },
    }), 'utf-8');

    const cmd = new GraphHistoryCommand(tmpDir);
    const entries = cmd.scanEvidence({ workspace: 'packages/api' });

    expect(entries.map(entry => entry.id)).toEqual(['api-evidence']);
  });

  it('filters legacy workspace evidence inferred from issue paths', () => {
    const evidenceDir = path.join(tmpDir, 'stdd', 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });

    fs.writeFileSync(path.join(evidenceDir, 'guard-1.json'), JSON.stringify({
      id: 'legacy-api-evidence',
      type: 'guard',
      status: 'fail',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      results: {
        constitution: {
          details: {
            blocking: [{ article: 7, file: 'packages/api/src/index.js', message: 'secret' }],
            warning: [],
          },
        },
      },
    }), 'utf-8');

    const cmd = new GraphHistoryCommand(tmpDir);
    const entries = cmd.scanEvidence({ workspace: 'packages/api' });

    expect(entries.map(entry => entry.id)).toEqual(['legacy-api-evidence']);
  });

  it('infers type from filename', () => {
    const cmd = new GraphHistoryCommand(tmpDir);
    expect(cmd._inferType('verify-123.json')).toBe('verify');
    expect(cmd._inferType('guard-456.json')).toBe('guard');
    expect(cmd._inferType('error-789.json')).toBe('error');
    expect(cmd._inferType('unknown-000.json')).toBe('unknown');
  });

  it('ignores malformed JSON files', () => {
    const evidenceDir = path.join(tmpDir, 'stdd', 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });

    fs.writeFileSync(path.join(evidenceDir, 'bad.json'), 'not valid json', 'utf-8');
    fs.writeFileSync(path.join(evidenceDir, 'verify-1.json'), JSON.stringify({ id: 'good', type: 'verify', status: 'pass', timestamp: '2026-01-01T00:00:00.000Z', unixTimestamp: 1735689600000 }), 'utf-8');

    const cmd = new GraphHistoryCommand(tmpDir);
    const entries = cmd.scanEvidence();

    expect(entries.length).toBe(1);
    expect(entries[0].id).toBe('good');
  });

  it('list outputs JSON format when requested', () => {
    const evidenceDir = path.join(tmpDir, 'stdd', 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });
    fs.writeFileSync(path.join(evidenceDir, 'verify-1.json'), JSON.stringify({ id: 'test-id', type: 'verify', status: 'pass', timestamp: '2026-01-01T00:00:00.000Z', unixTimestamp: 1735689600000 }), 'utf-8');

    const cmd = new GraphHistoryCommand(tmpDir);
    let output = '';
    const originalLog = console.log;
    console.log = (msg) => { output += msg; };

    cmd.list({ json: true });

    console.log = originalLog;

    const parsed = JSON.parse(output);
    expect(parsed).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'test-id', type: 'verify', status: 'pass' }),
    ]));
  });

  it('list JSON includes workspaces from evidence payload', () => {
    const evidenceDir = path.join(tmpDir, 'stdd', 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });
    fs.writeFileSync(path.join(evidenceDir, 'verify-2.json'), JSON.stringify({
      id: 'workspace-history-id',
      type: 'verify',
      status: 'pass',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      results: {
        tests: {
          passed: true,
          workspaces: [
            { workspaceName: 'packages/api', passed: true },
          ],
        },
      },
    }), 'utf-8');

    const cmd = new GraphHistoryCommand(tmpDir);
    let output = '';
    const originalLog = console.log;
    console.log = (msg) => { output += msg; };

    cmd.list({ json: true });

    console.log = originalLog;

    const parsed = JSON.parse(output);
    expect(parsed[0]).toEqual(expect.objectContaining({
      id: 'workspace-history-id',
      workspaces: ['packages/api'],
    }));
  });

  it('replay finds matching evidence and prints details', () => {
    const evidenceDir = path.join(tmpDir, 'stdd', 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });
    const evidenceData = {
      id: 'replay-test-id',
      type: 'verify',
      status: 'fail',
      timestamp: '2026-05-12T10:00:00.000Z',
      unixTimestamp: 1747044000000,
      metadata: { os: 'darwin', nodeVersion: 'v20.0.0' },
      results: {
        tasks: { allDone: false, done: 1, total: 3 },
        tests: { passed: false, error: 'AssertionError: expected true to be false' },
        constitution: { status: 'pass', issues: { blocking: [] } },
      },
    };
    fs.writeFileSync(path.join(evidenceDir, 'verify-1747044000000.json'), JSON.stringify(evidenceData), 'utf-8');

    const cmd = new GraphHistoryCommand(tmpDir);
    let output = '';
    const originalLog = console.log;
    console.log = (msg) => { output += msg + '\n'; };

    cmd.replay('replay-test-id');

    console.log = originalLog;

    expect(output).toContain('replay-test-id');
    expect(output).toContain('FAIL');
    expect(output).toContain('darwin');
    expect(output).toContain('Tasks:');
  });

  it('replay sets exitCode = 1 when ID is not found', () => {
    const originalExitCode = process.exitCode;
    process.exitCode = 0;

    const cmd = new GraphHistoryCommand(tmpDir);
    cmd.replay('nonexistent-id');

    expect(process.exitCode).toBe(1);
    process.exitCode = originalExitCode;
  });
});

describe('graph history CLI command', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-graph-cli-'));
    const stddDir = path.join(tmpDir, 'stdd');
    fs.mkdirSync(stddDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function runCli(args, cwd) {
    const result = spawnSync(process.execPath, [path.join(__dirname, '..', 'cli.js'), ...args], {
      encoding: 'utf8',
      cwd: cwd || path.join(__dirname, '..'),
    });

    return {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }

  it('graph history shows message when no evidence exists', () => {
    const result = runCli(['graph', 'history'], tmpDir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('No evidence history found');
  });

  it('graph help shows implemented history and replay', () => {
    const result = runCli(['graph', '--help']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('stdd graph history');
    expect(result.stdout).toContain('stdd graph replay');
    expect(result.stdout).toContain('Currently implemented: visualize, analyze, parallel --detect, history, replay, run, recommend.');
  });

  it('graph replay exits with non-zero when ID not found', () => {
    const result = runCli(['graph', 'replay', 'nonexistent']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('not found');
  });
});
