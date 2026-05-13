const fs = require('fs');
const path = require('path');
const os = require('os');
const { WorkspaceCommand } = require('../src/cli/commands/workspace');

describe('WorkspaceCommand', () => {
  let tempDirs = [];
  let logSpy;

  function createProject(setupFn) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-workspace-command-'));
    tempDirs.push(root);
    fs.mkdirSync(path.join(root, 'stdd'), { recursive: true });
    if (setupFn) setupFn(root);
    return root;
  }

  function writePackageJson(dir, pkg = {}) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg));
  }

  function writeRegistry(root, items) {
    const lines = [
      'version: "1.0"',
      'workspaces:',
      '  enabled: true',
      '  items:'
    ];
    for (const item of items) {
      lines.push(`    - name: "${item.name}"`);
      lines.push(`      root: "${item.root}"`);
      lines.push(`      source_root: "${item.source_root}"`);
      lines.push(`      package_json: "${item.package_json}"`);
      for (const [key, value] of Object.entries(item)) {
        if (!['name', 'root', 'source_root', 'package_json'].includes(key)) {
          lines.push(`      ${key}: ${value}`);
        }
      }
    }
    fs.writeFileSync(path.join(root, 'stdd', 'config.yaml'), `${lines.join('\n')}\n`);
  }

  beforeEach(() => {
    process.exitCode = undefined;
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    if (logSpy) logSpy.mockRestore();
    process.exitCode = undefined;
  });

  afterAll(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('lists registry workspaces', () => {
    const project = createProject((root) => {
      writeRegistry(root, [{
        name: '@scope/api',
        root: 'packages/api',
        source_root: 'packages/api/src',
        package_json: 'packages/api/package.json',
      }]);
    });

    const result = new WorkspaceCommand().list({ cwd: project });

    expect(result.source).toBe('registry');
    expect(result.workspaces.map(w => w.name)).toEqual(['@scope/api']);
    expect(logSpy.mock.calls.some(call => String(call[0]).includes('@scope/api'))).toBe(true);
  });

  it('passes validation for a valid registry', () => {
    const project = createProject((root) => {
      fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
      writePackageJson(path.join(root, 'packages', 'api'), { name: '@scope/api' });
      fs.mkdirSync(path.join(root, 'packages', 'api', 'src'), { recursive: true });
      writeRegistry(root, [{
        name: '@scope/api',
        root: 'packages/api',
        source_root: 'packages/api/src',
        package_json: 'packages/api/package.json',
      }]);
    });

    const result = new WorkspaceCommand().validate({ cwd: project });

    expect(result.ok).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(process.exitCode).toBeUndefined();
  });

  it('detects stale root and missing package_json with non-zero exit code', () => {
    const project = createProject((root) => {
      fs.mkdirSync(path.join(root, 'packages', 'nopkg'), { recursive: true });
      writeRegistry(root, [
        {
          name: '@scope/stale',
          root: 'packages/stale',
          source_root: 'packages/stale/src',
          package_json: 'packages/stale/package.json',
        },
        {
          name: '@scope/nopkg',
          root: 'packages/nopkg',
          source_root: 'packages/nopkg/src',
          package_json: 'packages/nopkg/package.json',
        }
      ]);
    });

    const result = new WorkspaceCommand().validate({ cwd: project });

    expect(result.ok).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(process.exitCode).toBe(1);
    expect(result.issues.stale.map(w => w.name)).toEqual(['@scope/stale']);
    expect(result.issues.missingPackageJson.map(w => w.name)).toEqual(['@scope/nopkg']);
  });

  it('detects dynamically added workspace', () => {
    const project = createProject((root) => {
      fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
      writePackageJson(path.join(root, 'packages', 'api'), { name: '@scope/api' });
      writePackageJson(path.join(root, 'packages', 'web'), { name: '@scope/web' });
      writeRegistry(root, [{
        name: '@scope/api',
        root: 'packages/api',
        source_root: 'packages/api/src',
        package_json: 'packages/api/package.json',
      }]);
    });

    const result = new WorkspaceCommand().validate({ cwd: project });

    expect(result.ok).toBe(true);
    expect(result.issues.new.map(w => w.name)).toEqual(['@scope/web']);
  });

  it('does not write config during repair dry-run', () => {
    const project = createProject((root) => {
      fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
      fs.writeFileSync(path.join(root, 'stdd', 'config.yaml'), 'version: "1.0"\n');
      writePackageJson(path.join(root, 'packages', 'api'), { name: '@scope/api' });
    });
    const configPath = path.join(project, 'stdd', 'config.yaml');
    const before = fs.readFileSync(configPath, 'utf8');

    const result = new WorkspaceCommand().repair({ cwd: project, dryRun: true });

    expect(result.changed).toBe(true);
    expect(fs.readFileSync(configPath, 'utf8')).toBe(before);
  });

  it('repairs new workspaces and preserves existing custom fields', () => {
    const project = createProject((root) => {
      fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
      writePackageJson(path.join(root, 'packages', 'api'), { name: '@scope/api' });
      writePackageJson(path.join(root, 'packages', 'web'), { name: '@scope/web' });
      writeRegistry(root, [{
        name: '@scope/api',
        root: 'packages/api',
        source_root: 'custom/api/src',
        package_json: 'packages/api/package.json',
        owner: 'platform',
      }]);
    });

    const result = new WorkspaceCommand().repair({ cwd: project });
    const content = fs.readFileSync(path.join(project, 'stdd', 'config.yaml'), 'utf8');

    expect(result.changed).toBe(true);
    expect(content).toContain('name: "@scope/web"');
    expect(content).toContain('root: "packages/web"');
    expect(content).toContain('owner: platform');
    expect(content).toContain('source_root: "packages/api/src"');
  });
});
