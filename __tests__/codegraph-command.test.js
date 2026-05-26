const fs = require('fs');
const path = require('path');
const os = require('os');
const { CodeGraphCommand } = require('../src/cli/commands/codegraph');

function project() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-codegraph-command-'));
  fs.mkdirSync(path.join(cwd, 'stdd', 'memory'), { recursive: true });
  fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
  fs.writeFileSync(path.join(cwd, 'stdd', 'config.yaml'), `project: test\ncodegraph:\n  enabled: true\n  source_roots:\n    - src\n`);
  fs.writeFileSync(path.join(cwd, 'src', 'auth.js'), `export function login() {}`);
  return cwd;
}

describe('CodeGraphCommand', () => {
  let dirs = [];
  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
    dirs = [];
  });

  it('reports status as JSON', () => {
    const cwd = project(); dirs.push(cwd);
    const result = new CodeGraphCommand(cwd).execute('status', [], { json: true });
    expect(result.status).toBe('ok');
    expect(result.stats.files).toBe(1);
  });

  it('rebuilds the graph', () => {
    const cwd = project(); dirs.push(cwd);
    const result = new CodeGraphCommand(cwd).execute('rebuild', [], { json: true });
    expect(result.status).toBe('rebuilt');
    expect(result.stats.symbols).toBeGreaterThan(0);
  });

  it('syncs a single file', () => {
    const cwd = project(); dirs.push(cwd);
    const cmd = new CodeGraphCommand(cwd);
    cmd.execute('rebuild', [], { json: true });
    fs.writeFileSync(path.join(cwd, 'src', 'auth.js'), `export function logout() {}`);
    const result = cmd.execute('sync', [], { file: 'src/auth.js', json: true });
    expect(result.status).toBe('synced');
  });

  it('queries the graph', () => {
    const cwd = project(); dirs.push(cwd);
    const cmd = new CodeGraphCommand(cwd);
    cmd.execute('rebuild', [], { json: true });
    const result = cmd.execute('query', ['login'], { json: true });
    expect(result.results[0].name).toBe('login');
  });

  it('throws for unknown actions', () => {
    const cwd = project(); dirs.push(cwd);
    expect(() => new CodeGraphCommand(cwd).execute('nope', [], {})).toThrow('Unknown codegraph action');
  });
});
