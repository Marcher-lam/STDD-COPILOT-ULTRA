const fs = require('fs');
const path = require('path');
const { runCli, createTempProject, cleanupTempProject } = require('../test-support/integration-helper');

describe('progress command tracking', () => {
  let projectPath;
  let progressPath;

  beforeEach(() => {
    projectPath = createTempProject('progress-project', { changeName: 'demo' });
    progressPath = path.join(projectPath, 'stdd', 'progress.jsonl');
    fs.writeFileSync(progressPath, '', 'utf8');
  });

  afterEach(() => {
    cleanupTempProject(projectPath);
  });

  function readEntries() {
    if (!fs.existsSync(progressPath)) return [];
    return fs.readFileSync(progressPath, 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line));
  }

  it('does not track progress command itself', () => {
    const result = runCli(['progress', '--summary'], projectPath);

    expect(result.status).toBe(0);
    expect(readEntries()).toEqual([]);
  });

  it('records non-zero exitCode commands as fail', () => {
    const result = runCli(['verify', 'demo', '--test-command', 'true', '--no-constitution'], projectPath);
    const entries = readEntries();

    expect(result.status).toBe(1);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ ev: 'start', cmd: 'verify' });
    expect(entries[1]).toMatchObject({ ev: 'fail' });
    expect(entries[1].err).toContain('Command exited with code 1');
  });

  it('clears progress without writing a dangling complete event', () => {
    runCli(['status'], projectPath);
    expect(readEntries().length).toBeGreaterThan(0);

    const result = runCli(['progress', '--clear'], projectPath);

    expect(result.status).toBe(0);
    expect(readEntries()).toEqual([]);
  });

  it('only suggests stdd continue for resumable workflow commands', () => {
    fs.writeFileSync(progressPath, JSON.stringify({
      id: '1',
      ts: new Date().toISOString(),
      ev: 'start',
      cmd: 'audit',
      args: {},
    }) + '\n', 'utf8');

    const auditResume = runCli(['progress', '--resume'], projectPath);
    expect(auditResume.stdout).toContain('No automatic resume command is available');
    expect(auditResume.stdout).not.toContain('stdd continue');

    fs.writeFileSync(progressPath, JSON.stringify({
      id: '2',
      ts: new Date().toISOString(),
      ev: 'start',
      cmd: 'apply',
      args: { change: 'demo' },
    }) + '\n', 'utf8');

    const applyResume = runCli(['progress', '--resume'], projectPath);
    expect(applyResume.stdout).toContain('stdd continue demo');
  });
});
