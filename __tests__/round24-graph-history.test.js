const fs = require('fs');
const os = require('os');
const path = require('path');
const { GraphHistoryCommand } = require('../src/cli/commands/graph-history');

describe('GraphHistoryCommand - round 24 branch coverage', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-r24-'));
  });

  afterAll(() => {
    // cleanup handled per-test or here if any leftover
  });

  function makeStddDir() {
    const stddDir = path.join(tmpDir, 'stdd');
    fs.mkdirSync(stddDir, { recursive: true });
    return stddDir;
  }

  function writeEvidence(dir, fileName, content) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, fileName), JSON.stringify(content), 'utf-8');
  }

  // ---- workspaceFromPath branches ----

  it('extracts workspace from apps/ prefix in test results', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'verify-apps.json', {
      id: 'apps-test',
      type: 'verify',
      status: 'pass',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      results: {
        tests: {
          passed: true,
          workspaces: [
            { workspaceName: 'apps/web', passed: true },
          ],
        },
      },
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    const entries = cmd.scanEvidence();
    expect(entries.length).toBe(1);
    expect(entries[0].workspaces).toContain('apps/web');
  });

  it('extracts workspace from result.workspace and result.name when workspaceName missing', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'verify-1.json', {
      id: 'ws-fallback',
      type: 'verify',
      status: 'pass',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      results: {
        tests: {
          passed: true,
          workspaces: [
            { workspace: 'packages/api-fallback' },
            { name: 'packages/shared-lib' },
            { workspaceName: null, workspace: null, name: null },
          ],
        },
      },
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    const entries = cmd.scanEvidence();
    expect(entries.length).toBe(1);
    // workspace fallback and name fallback extracted; falsy name is skipped
    expect(entries[0].workspaces).toEqual(expect.arrayContaining(['packages/api-fallback', 'packages/shared-lib']));
    // the entry with all-null names should not produce a workspace
    expect(entries[0].workspaces).not.toContain('');
    expect(entries[0].workspaces).not.toContain(null);
  });

  // ---- tests.workspaces not an array ----

  it('handles tests.workspaces being a non-array value gracefully', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'verify-nonarray.json', {
      id: 'nonarray-ws',
      type: 'verify',
      status: 'pass',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      results: {
        tests: {
          passed: true,
          workspaces: 'not-an-array',
        },
      },
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    const entries = cmd.scanEvidence();
    expect(entries.length).toBe(1);
    // Should not crash; workspaces from tests should be empty
    expect(entries[0].workspaces).toEqual([]);
  });

  // ---- constitution issues: only warnings, no blocking ----

  it('extracts workspace from constitution warning issues', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'guard-warn.json', {
      id: 'warn-only',
      type: 'guard',
      status: 'pass',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      results: {
        constitution: {
          details: {
            blocking: [],
            warning: [
              { article: 3, file: 'packages/cli/src/main.js', message: 'minor issue' },
            ],
          },
        },
      },
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    const entries = cmd.scanEvidence();
    expect(entries.length).toBe(1);
    expect(entries[0].workspaces).toContain('packages/cli');
  });

  // ---- constitution issues: issues as direct property (not details) ----

  it('handles constitution.issues (not .details) with workspace field', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'guard-issues.json', {
      id: 'issues-direct',
      type: 'guard',
      status: 'fail',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      results: {
        constitution: {
          status: 'fail',
          issues: {
            blocking: [
              { article: 5, workspace: 'packages/core', message: 'violation' },
            ],
            warning: [],
          },
        },
      },
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    const entries = cmd.scanEvidence();
    expect(entries.length).toBe(1);
    expect(entries[0].workspaces).toContain('packages/core');
  });

  // ---- issue with non-string workspace/workspaceName values ----

  it('skips non-string workspace and workspaceName on constitution issues', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'guard-nonstring.json', {
      id: 'nonstring-ws',
      type: 'guard',
      status: 'fail',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      results: {
        constitution: {
          details: {
            blocking: [
              { article: 1, workspace: 123, workspaceName: true, file: 'packages/db/src/index.ts', message: 'bad types' },
            ],
            warning: [],
          },
        },
      },
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    const entries = cmd.scanEvidence();
    expect(entries.length).toBe(1);
    // Non-string workspace/workspaceName are skipped; file path is still extracted
    expect(entries[0].workspaces).toContain('packages/db');
  });

  // ---- issue message containing file path patterns extracted via regex ----

  it('extracts workspace from file paths embedded in issue messages', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'guard-msg-path.json', {
      id: 'msg-path-ws',
      type: 'guard',
      status: 'fail',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      results: {
        constitution: {
          details: {
            blocking: [
              { article: 7, message: 'Found secret in apps/backend/src/config.ts and packages/auth/keys.json' },
            ],
            warning: [
              { article: 2, message: 'Check packages/utils/src/helpers.js for style' },
            ],
          },
        },
      },
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    const entries = cmd.scanEvidence();
    expect(entries.length).toBe(1);
    expect(entries[0].workspaces).toEqual(expect.arrayContaining(['apps/backend', 'packages/auth', 'packages/utils']));
  });

  // ---- issue with apps/ prefix in file path ----

  it('extracts apps/ workspace from issue file path', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'guard-apps.json', {
      id: 'apps-file-path',
      type: 'guard',
      status: 'fail',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      results: {
        constitution: {
          details: {
            blocking: [
              { article: 4, path: 'apps/server/src/index.js', message: 'issue in server' },
            ],
            warning: [],
          },
        },
      },
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    const entries = cmd.scanEvidence();
    expect(entries.length).toBe(1);
    expect(entries[0].workspaces).toContain('apps/server');
  });

  // ---- issue file path that is too short (no workspace) ----

  it('returns null workspace for short file path in issues', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'guard-short.json', {
      id: 'short-path',
      type: 'guard',
      status: 'pass',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      results: {
        constitution: {
          details: {
            blocking: [
              { article: 1, file: 'single.js', message: 'no workspace here' },
            ],
            warning: [],
          },
        },
      },
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    const entries = cmd.scanEvidence();
    expect(entries.length).toBe(1);
    // 'single.js' has only 1 part, workspaceFromPath returns null
    expect(entries[0].workspaces).toEqual([]);
  });

  // ---- issue file path with non-packages/non-apps prefix ----

  it('returns null workspace for src/ prefix file path', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'guard-src.json', {
      id: 'src-prefix',
      type: 'guard',
      status: 'pass',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      results: {
        constitution: {
          details: {
            blocking: [
              { article: 2, file: 'src/index.js', message: 'generic src file' },
            ],
            warning: [],
          },
        },
      },
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    const entries = cmd.scanEvidence();
    expect(entries.length).toBe(1);
    // 'src/' is not packages/ or apps/ so workspaceFromPath returns null
    expect(entries[0].workspaces).toEqual([]);
  });

  // ---- entry without id uses filename, without type uses _inferType ----

  it('falls back to filename as id and _inferType when type missing', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'error-no-id.json', {
      // no id, no type
      status: 'fail',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    const entries = cmd.scanEvidence();
    expect(entries.length).toBe(1);
    expect(entries[0].id).toBe('error-no-id');
    expect(entries[0].type).toBe('error');
  });

  // ---- entry without unixTimestamp and without timestamp defaults to 0 ----

  it('defaults unixTimestamp to 0 when no timestamp or unixTimestamp', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'guard-notime.json', {
      id: 'no-time',
      type: 'guard',
      status: 'pass',
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    const entries = cmd.scanEvidence();
    expect(entries.length).toBe(1);
    expect(entries[0].unixTimestamp).toBe(0);
  });

  // ---- entry with timestamp but no unixTimestamp computes from timestamp ----

  it('computes unixTimestamp from timestamp string when unixTimestamp missing', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'verify-compute-ts.json', {
      id: 'compute-ts',
      type: 'verify',
      status: 'pass',
      timestamp: '2026-06-01T12:00:00.000Z',
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    const entries = cmd.scanEvidence();
    expect(entries.length).toBe(1);
    expect(entries[0].unixTimestamp).toBe(new Date('2026-06-01T12:00:00.000Z').getTime());
  });

  // ---- metadata.changeName fallback when scanning change dir with null changeName ----

  it('uses metadata.changeName when changeDir is null', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'verify-meta-chg.json', {
      id: 'meta-change',
      type: 'verify',
      status: 'pass',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      metadata: { changeName: 'meta-change-name' },
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    const entries = cmd.scanEvidence();
    expect(entries.length).toBe(1);
    expect(entries[0].changeName).toBe('meta-change-name');
  });

  // ---- list empty with json=false shows human-readable message ----

  it('list prints human-readable message when empty and json=false', () => {
    makeStddDir();
    const cmd = new GraphHistoryCommand(tmpDir);
    let output = '';
    const origLog = console.log;
    console.log = (msg) => { output += msg + '\n'; };
    cmd.list({ json: false });
    console.log = origLog;
    expect(output).toContain('No evidence history found');
    expect(output).toContain('stdd verify');
  });

  // ---- list empty with json=true prints empty array ----

  it('list prints empty JSON array when empty and json=true', () => {
    makeStddDir();
    const cmd = new GraphHistoryCommand(tmpDir);
    let output = '';
    const origLog = console.log;
    console.log = (msg) => { output += msg + '\n'; };
    cmd.list({ json: true });
    console.log = origLog;
    expect(JSON.parse(output.trim())).toEqual([]);
  });

  // ---- _printTable with > 50 entries shows truncation message ----

  it('prints truncation notice when more than 50 entries', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    for (let i = 0; i < 52; i++) {
      writeEvidence(evidenceDir, `verify-${i.toString().padStart(3, '0')}.json`, {
        id: `entry-${i}`,
        type: 'verify',
        status: i % 2 === 0 ? 'pass' : 'fail',
        timestamp: new Date(1735689600000 + i * 1000).toISOString(),
        unixTimestamp: 1735689600000 + i * 1000,
      });
    }

    const cmd = new GraphHistoryCommand(tmpDir);
    let output = '';
    const origLog = console.log;
    console.log = (msg) => { output += msg + '\n'; };
    cmd.list({ json: false });
    console.log = origLog;
    expect(output).toContain('and 2 more entries');
    expect(output).toContain('Total: 52');
  });

  // ---- status unknown uses chalk.yellow ----

  it('prints unknown status in yellow in table', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'verify-unknown.json', {
      id: 'unknown-status',
      type: 'verify',
      status: 'pending',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    let output = '';
    const origLog = console.log;
    console.log = (msg) => { output += msg + '\n'; };
    cmd.list({ json: false });
    console.log = origLog;
    expect(output.toLowerCase()).toContain('pending');
  });

  // ---- _printDetail with verbose=false suppresses results ----

  it('replay with verbose=false suppresses results output', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'verify-verbose.json', {
      id: 'verbose-test',
      type: 'verify',
      status: 'pass',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      results: { tests: { passed: true } },
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    let output = '';
    const origLog = console.log;
    console.log = (msg) => { output += msg + '\n'; };
    cmd.replay('verbose-test', { verbose: false });
    console.log = origLog;
    expect(output).toContain('verbose-test');
    expect(output).not.toContain('Results:');
  });

  // ---- _printDetail without workspaces and without changeName ----

  it('replay skips workspaces line when no workspaces and skips changeName line', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'guard-noworkspace.json', {
      id: 'no-ws-no-change',
      type: 'guard',
      status: 'pass',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      // no changeName, no workspaces, no metadata
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    let output = '';
    const origLog = console.log;
    console.log = (msg) => { output += msg + '\n'; };
    cmd.replay('no-ws-no-change');
    console.log = origLog;
    expect(output).toContain('no-ws-no-change');
    expect(output).not.toContain('Change:');
    expect(output).not.toContain('Workspaces:');
    expect(output).not.toContain('Metadata:');
  });

  // ---- _printDetail with non-verify type does not show re-run hint ----

  it('replay does not show re-run hint for non-verify type', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'guard-rerun.json', {
      id: 'guard-no-rerun',
      type: 'guard',
      status: 'pass',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      metadata: { changeName: 'some-change' },
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    let output = '';
    const origLog = console.log;
    console.log = (msg) => { output += msg + '\n'; };
    cmd.replay('guard-no-rerun');
    console.log = origLog;
    expect(output).toContain('guard-no-rerun');
    expect(output).toContain('some-change');
    // guard type with changeName should NOT show re-run hint
    expect(output).not.toContain('Re-run verify');
  });

  // ---- _printResults: tests passed=null shows SKIP ----

  it('_printResults shows SKIP when tests.passed is null', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'verify-skip.json', {
      id: 'skip-test',
      type: 'verify',
      status: 'pass',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      results: { tests: { passed: null } },
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    let output = '';
    const origLog = console.log;
    console.log = (msg) => { output += msg + '\n'; };
    cmd.replay('skip-test');
    console.log = origLog;
    expect(output).toContain('SKIP');
  });

  // ---- _printResults: failed test with multiline error shows tail ----

  it('_printResults shows last 3 lines of multiline test error', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    const multilineError = [
      'AssertionError at line 1',
      'expected true at line 2',
      'but got false at line 3',
      'stack trace line 4',
      'final error line 5',
    ].join('\n');
    writeEvidence(evidenceDir, 'verify-multiline.json', {
      id: 'multiline-err',
      type: 'verify',
      status: 'fail',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      results: { tests: { passed: false, error: multilineError } },
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    let output = '';
    const origLog = console.log;
    console.log = (msg) => { output += msg + '\n'; };
    cmd.replay('multiline-err');
    console.log = origLog;
    expect(output).toContain('stack trace line 4');
    expect(output).toContain('final error line 5');
  });

  // ---- _printResults: constitution with blocking issues ----

  it('_printResults shows blocking constitution issues', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'verify-const-block.json', {
      id: 'const-block',
      type: 'verify',
      status: 'fail',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      results: {
        constitution: {
          status: 'fail',
          issues: {
            blocking: [
              { article: 5, message: 'No TODOs allowed' },
              { article: 12, message: 'Missing type annotations' },
            ],
          },
        },
      },
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    let output = '';
    const origLog = console.log;
    console.log = (msg) => { output += msg + '\n'; };
    cmd.replay('const-block');
    console.log = origLog;
    expect(output).toContain('Article 5');
    expect(output).toContain('No TODOs allowed');
    expect(output).toContain('Article 12');
  });

  // ---- _printResults: lint passed=null shows SKIP ----

  it('_printResults shows SKIP for lint when lint.passed is null', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'verify-lint-skip.json', {
      id: 'lint-skip',
      type: 'verify',
      status: 'pass',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      results: { lint: { passed: null } },
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    let output = '';
    const origLog = console.log;
    console.log = (msg) => { output += msg + '\n'; };
    cmd.replay('lint-skip');
    console.log = origLog;
    expect(output).toContain('Lint');
    expect(output).toContain('SKIP');
  });

  // ---- _printResults: lint passed=true shows pass ----

  it('_printResults shows lint pass when lint.passed is true', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'verify-lint-pass.json', {
      id: 'lint-pass',
      type: 'verify',
      status: 'pass',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      results: { lint: { passed: true } },
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    let output = '';
    const origLog = console.log;
    console.log = (msg) => { output += msg + '\n'; };
    cmd.replay('lint-pass');
    console.log = origLog;
    // lint pass uses chalk.green('pass')
    expect(output).toContain('pass');
  });

  // ---- _printResults: lint passed=false shows warn ----

  it('_printResults shows lint warn when lint.passed is false', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'verify-lint-warn.json', {
      id: 'lint-warn',
      type: 'verify',
      status: 'pass',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      results: { lint: { passed: false } },
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    let output = '';
    const origLog = console.log;
    console.log = (msg) => { output += msg + '\n'; };
    cmd.replay('lint-warn');
    console.log = origLog;
    // lint fail uses chalk.yellow('warn')
    expect(output).toContain('warn');
  });

  // ---- replay with json option outputs JSON ----

  it('replay with json option outputs JSON format', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'verify-replay-json.json', {
      id: 'replay-json-id',
      type: 'verify',
      status: 'pass',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      results: { tests: { passed: true } },
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    let output = '';
    const origLog = console.log;
    console.log = (msg) => { output += msg; };
    cmd.replay('replay-json-id', { json: true });
    console.log = origLog;

    const parsed = JSON.parse(output);
    expect(parsed.id).toBe('replay-json-id');
  });

  // ---- _printDetail status yellow for non-pass/fail ----

  it('replay shows status in yellow for unknown status', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'verify-status-unknown.json', {
      id: 'status-unknown',
      type: 'verify',
      status: 'timeout',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    let output = '';
    const origLog = console.log;
    console.log = (msg) => { output += msg + '\n'; };
    cmd.replay('status-unknown');
    console.log = origLog;
    expect(output).toContain('TIMEOUT');
  });

  // ---- _printDetail with workspaces shows them ----

  it('replay shows workspaces when present', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'verify-with-ws.json', {
      id: 'ws-replay',
      type: 'verify',
      status: 'pass',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      results: {
        tests: {
          passed: true,
          workspaces: [
            { workspaceName: 'packages/api' },
            { workspaceName: 'packages/web' },
          ],
        },
      },
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    let output = '';
    const origLog = console.log;
    console.log = (msg) => { output += msg + '\n'; };
    cmd.replay('ws-replay');
    console.log = origLog;
    expect(output).toContain('packages/api');
    expect(output).toContain('packages/web');
    expect(output).toContain('Workspaces:');
  });

  // ---- _printDetail with metadata shows OS and Node ----

  it('replay shows metadata with OS and Node version', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'verify-meta.json', {
      id: 'meta-test',
      type: 'verify',
      status: 'pass',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      metadata: { os: 'linux', nodeVersion: 'v22.0.0' },
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    let output = '';
    const origLog = console.log;
    console.log = (msg) => { output += msg + '\n'; };
    cmd.replay('meta-test');
    console.log = origLog;
    expect(output).toContain('linux');
    expect(output).toContain('v22.0.0');
    expect(output).toContain('Metadata:');
  });

  // ---- _formatTime catch branch ----

  it('_formatTime returns sliced string on invalid date', () => {
    const cmd = new GraphHistoryCommand(tmpDir);
    // new Date with an unparseable value can throw in some environments;
    // test with a very long string to exercise the catch path
    const result = cmd._formatTime('not-a-date');
    // toLocaleString on invalid date returns "Invalid Date" in most environments,
    // but we just want to ensure it doesn't throw
    expect(typeof result).toBe('string');
  });

  // ---- scanEvidence with no stddDir returns empty ----

  it('returns empty when stdd directory does not exist', () => {
    // tmpDir exists but has no stdd/ subdirectory
    const cmd = new GraphHistoryCommand(tmpDir);
    expect(cmd.scanEvidence()).toEqual([]);
  });

  // ---- change evidence dir does not exist (no evidence dir in change) ----

  it('skips change with missing evidence directory', () => {
    const stddDir = makeStddDir();
    const changesDir = path.join(stddDir, 'changes', 'empty-change');
    fs.mkdirSync(changesDir, { recursive: true });
    // no evidence subdirectory

    const cmd = new GraphHistoryCommand(tmpDir);
    const entries = cmd.scanEvidence();
    expect(entries).toEqual([]);
  });

  // ---- _toOutput includes workspaces ----

  it('_toOutput returns workspaces array', () => {
    const cmd = new GraphHistoryCommand(tmpDir);
    const result = cmd._toOutput({
      id: 'test',
      type: 'verify',
      status: 'pass',
      timestamp: '2026-01-01',
      changeName: 'chg',
      workspaces: ['packages/a', 'packages/b'],
    });
    expect(result).toEqual({
      id: 'test',
      type: 'verify',
      status: 'pass',
      timestamp: '2026-01-01',
      changeName: 'chg',
      workspaces: ['packages/a', 'packages/b'],
    });
  });

  // ---- _toOutput defaults workspaces to empty array ----

  it('_toOutput defaults workspaces to empty array when undefined', () => {
    const cmd = new GraphHistoryCommand(tmpDir);
    const result = cmd._toOutput({
      id: 'test',
      type: 'verify',
      status: 'pass',
      timestamp: '2026-01-01',
      changeName: null,
    });
    expect(result.workspaces).toEqual([]);
  });

  // ---- Constitution exists but neither details nor issues ----

  it('handles constitution with no details or issues gracefully', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'guard-no-details.json', {
      id: 'no-details',
      type: 'guard',
      status: 'pass',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      results: {
        constitution: {
          status: 'pass',
        },
      },
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    const entries = cmd.scanEvidence();
    expect(entries.length).toBe(1);
    expect(entries[0].workspaces).toEqual([]);
  });

  // ---- _printResults with tests null/undefined (no test results at all) ----

  it('_printResults handles missing tests gracefully', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'verify-no-tests.json', {
      id: 'no-tests',
      type: 'verify',
      status: 'pass',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      results: {},
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    let output = '';
    const origLog = console.log;
    console.log = (msg) => { output += msg + '\n'; };
    cmd.replay('no-tests');
    console.log = origLog;
    expect(output).toContain('no-tests');
    expect(output).not.toContain('Tests:');
  });

  // ---- workspace filtering excludes non-matching evidence ----

  it('workspace filter excludes evidence not matching workspace', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'verify-ws-filter.json', {
      id: 'ws-filter-test',
      type: 'verify',
      status: 'pass',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      metadata: { workspace: { name: '@demo/api', path: 'packages/api', root: '/tmp/packages/api' } },
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    const entries = cmd.scanEvidence({ workspace: 'packages/other' });
    expect(entries).toEqual([]);
  });

  // ---- explicit workspace refs from extractEvidenceWorkspaceRefs used when present ----

  it('uses explicit workspace refs from metadata over inferred when present', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'verify-explicit.json', {
      id: 'explicit-ws',
      type: 'verify',
      status: 'pass',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      metadata: {
        workspace: { name: '@demo/api', path: 'packages/api', root: '/tmp/packages/api' },
      },
      results: {
        tests: {
          passed: true,
          workspaces: [{ workspaceName: 'packages/other' }],
        },
      },
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    const entries = cmd.scanEvidence();
    // extractWorkspacesFromEvidence should return explicit refs first
    // since metadata.workspace has path 'packages/api' which is not absolute
    expect(entries[0].workspaces).toEqual(expect.arrayContaining(['packages/api']));
  });

  // ---- _printResults: tasks not all done ----

  it('_printResults shows FAIL when tasks not all done', () => {
    const stddDir = makeStddDir();
    const evidenceDir = path.join(stddDir, 'evidence');
    writeEvidence(evidenceDir, 'verify-tasks-fail.json', {
      id: 'tasks-fail',
      type: 'verify',
      status: 'fail',
      timestamp: '2026-01-01T00:00:00.000Z',
      unixTimestamp: 1735689600000,
      results: {
        tasks: { allDone: false, done: 2, total: 5 },
      },
    });

    const cmd = new GraphHistoryCommand(tmpDir);
    let output = '';
    const origLog = console.log;
    console.log = (msg) => { output += msg + '\n'; };
    cmd.replay('tasks-fail');
    console.log = origLog;
    expect(output).toContain('Tasks:');
    expect(output).toContain('FAIL');
    expect(output).toContain('2/5');
  });

  // ---- cleanup temp dirs used in this suite ----

  afterAll(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
