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

  it('outputs validation as JSON when options.json is set', () => {
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

    const result = new WorkspaceCommand().validate({ cwd: project, json: true });

    expect(result.ok).toBe(true);
    // Verify JSON was output via console.log
    const jsonCalls = logSpy.mock.calls.filter(call => {
      try { JSON.parse(call[0]); return true; } catch { return false; }
    });
    expect(jsonCalls.length).toBeGreaterThan(0);
    const parsed = JSON.parse(jsonCalls[0][0]);
    expect(parsed.ok).toBe(true);
  });

  it('outputs list as JSON when options.json is set', () => {
    const project = createProject((root) => {
      writeRegistry(root, [{
        name: '@scope/api',
        root: 'packages/api',
        source_root: 'packages/api/src',
        package_json: 'packages/api/package.json',
      }]);
    });

    const result = new WorkspaceCommand().list({ cwd: project, json: true });

    expect(result.source).toBe('registry');
    const jsonCalls = logSpy.mock.calls.filter(call => {
      try { JSON.parse(call[0]); return true; } catch { return false; }
    });
    expect(jsonCalls.length).toBeGreaterThan(0);
  });

  it('prints empty workspace list message when no workspaces found', () => {
    const project = createProject();

    const result = new WorkspaceCommand().list({ cwd: project });

    expect(result.workspaces).toEqual([]);
    expect(logSpy.mock.calls.some(call => String(call[0]).includes('No workspaces found'))).toBe(true);
  });

  it('detects source_root missing from dynamic detection in validation', () => {
    const project = createProject((root) => {
      fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
      writePackageJson(path.join(root, 'packages', 'api'), { name: '@scope/api' });
      fs.mkdirSync(path.join(root, 'packages', 'api', 'src'), { recursive: true });
      // Register a workspace that dynamic detection won't find (different root path)
      writeRegistry(root, [{
        name: '@scope/old',
        root: 'legacy/old',
        source_root: 'legacy/old/src',
        package_json: 'legacy/old/package.json',
      }]);
      // Create the registered dirs so it's not stale, but dynamic detection won't find it
      fs.mkdirSync(path.join(root, 'legacy', 'old', 'src'), { recursive: true });
      writePackageJson(path.join(root, 'legacy', 'old'), { name: '@scope/old' });
    });

    const result = new WorkspaceCommand().validate({ cwd: project });

    // @scope/old is in registry but not dynamically detected (no pnpm workspace glob match)
    expect(result.issues.missing.map(w => w.name)).toEqual(['@scope/old']);
  });

  it('detects missing source_root in validation', () => {
    const project = createProject((root) => {
      fs.mkdirSync(path.join(root, 'packages', 'api'), { recursive: true });
      writePackageJson(path.join(root, 'packages', 'api'), { name: '@scope/api' });
      // source_root directory does NOT exist (no src dir)
      writeRegistry(root, [{
        name: '@scope/api',
        root: 'packages/api',
        source_root: 'packages/api/src',
        package_json: 'packages/api/package.json',
      }]);
    });

    const result = new WorkspaceCommand().validate({ cwd: project });

    expect(result.issues.sourceRootMissing.map(w => w.name)).toEqual(['@scope/api']);
  });

  it('repair with no existing config creates new config file', () => {
    const project = createProject((root) => {
      fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
      writePackageJson(path.join(root, 'packages', 'api'), { name: '@scope/api' });
      // No config.yaml exists
    });

    const result = new WorkspaceCommand().repair({ cwd: project });

    expect(result.changed).toBe(true);
    const content = fs.readFileSync(path.join(project, 'stdd', 'config.yaml'), 'utf8');
    expect(content).toContain('name: "@scope/api"');
  });

  it('repair with unchanged workspaces reports already up to date', () => {
    const project = createProject((root) => {
      fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
      writePackageJson(path.join(root, 'packages', 'api'), { name: '@scope/api' });
      fs.mkdirSync(path.join(root, 'packages', 'api', 'src'), { recursive: true });
      // Write a registry that matches what detection would produce
      writeRegistry(root, [{
        name: '@scope/api',
        root: 'packages/api',
        source_root: 'packages/api/src',
        package_json: 'packages/api/package.json',
      }]);
    });

    const result = new WorkspaceCommand().repair({ cwd: project });

    expect(result.changed).toBe(false);
    expect(logSpy.mock.calls.some(call => String(call[0]).includes('already up to date'))).toBe(true);
  });

  it('repair dry-run reports unchanged when already up to date', () => {
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

    const result = new WorkspaceCommand().repair({ cwd: project, dryRun: true });

    expect(result.changed).toBe(false);
    expect(logSpy.mock.calls.some(call => String(call[0]).includes('already up to date'))).toBe(true);
  });

  it('handles config.yaml with null workspaces field', () => {
    const project = createProject((root) => {
      fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
      writePackageJson(path.join(root, 'packages', 'api'), { name: '@scope/api' });
      fs.writeFileSync(path.join(root, 'stdd', 'config.yaml'), 'workspaces: null\n');
    });

    const result = new WorkspaceCommand().repair({ cwd: project });

    expect(result.changed).toBe(true);
    const content = fs.readFileSync(path.join(project, 'stdd', 'config.yaml'), 'utf8');
    expect(content).toContain('name: "@scope/api"');
  });

  it('handles config.yaml with string workspaces field (non-object)', () => {
    const project = createProject((root) => {
      fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
      writePackageJson(path.join(root, 'packages', 'api'), { name: '@scope/api' });
      fs.writeFileSync(path.join(root, 'stdd', 'config.yaml'), 'workspaces: "bad"\n');
    });

    const result = new WorkspaceCommand().repair({ cwd: project });

    expect(result.changed).toBe(true);
  });

  it('handles config.yaml with non-array items in workspaces', () => {
    const project = createProject((root) => {
      fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
      writePackageJson(path.join(root, 'packages', 'api'), { name: '@scope/api' });
      fs.writeFileSync(path.join(root, 'stdd', 'config.yaml'), 'workspaces:\n  enabled: true\n  items: "not-array"\n');
    });

    const result = new WorkspaceCommand().repair({ cwd: project });

    expect(result.changed).toBe(true);
  });

  it('replaces existing workspaces block in config.yaml', () => {
    const project = createProject((root) => {
      fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
      writePackageJson(path.join(root, 'packages', 'api'), { name: '@scope/api' });
      fs.writeFileSync(path.join(root, 'stdd', 'config.yaml'), [
        'version: "1.0"',
        'workspaces:',
        '  enabled: false',
        '  items:',
        '    - name: "old"',
        '      root: "old"',
        'other: value',
      ].join('\n') + '\n');
    });

    const result = new WorkspaceCommand().repair({ cwd: project });

    expect(result.changed).toBe(true);
    const content = fs.readFileSync(path.join(project, 'stdd', 'config.yaml'), 'utf8');
    expect(content).toContain('other: value');
    expect(content).toContain('name: "@scope/api"');
  });

  it('formatYamlScalar handles various value types', () => {
    const cmd = new WorkspaceCommand();

    expect(cmd.formatYamlScalar(true)).toBe('true');
    expect(cmd.formatYamlScalar(false)).toBe('false');
    expect(cmd.formatYamlScalar(42)).toBe('42');
    expect(cmd.formatYamlScalar(null)).toBe('null');
    expect(cmd.formatYamlScalar(undefined)).toBe('null');
    expect(cmd.formatYamlScalar('hello world')).toBe('"hello world"');
    expect(cmd.formatYamlScalar('simple-name')).toBe('simple-name');
    expect(cmd.formatYamlScalar('path/to/file')).toBe('path/to/file');
  });

  it('renderWorkspaceRegistryBlock with enabled=false', () => {
    const cmd = new WorkspaceCommand();
    const block = cmd.renderWorkspaceRegistryBlock({
      enabled: false,
      items: [{ name: 'test', root: 'r', source_root: 's', package_json: 'p' }],
    });
    expect(block).toContain('enabled: false');
    expect(block).toContain('name: "test"');
  });

  it('renderWorkspaceRegistryBlock with custom keys on items', () => {
    const cmd = new WorkspaceCommand();
    const block = cmd.renderWorkspaceRegistryBlock({
      enabled: true,
      items: [{ name: 'test', root: 'r', source_root: 's', package_json: 'p', owner: 'platform', count: 5 }],
    });
    expect(block).toContain('owner: platform');
    expect(block).toContain('count: 5');
  });

  it('uses process.cwd() when no cwd option given', () => {
    const result = new WorkspaceCommand().list({});
    expect(result.root).toBe(path.resolve(process.cwd()));
  });

  it('printValidationReport prints failure message for invalid registry', () => {
    const project = createProject((root) => {
      writeRegistry(root, [{
        name: '@scope/stale',
        root: 'packages/stale',
        source_root: 'packages/stale/src',
        package_json: 'packages/stale/package.json',
      }]);
    });

    new WorkspaceCommand().validate({ cwd: project });

    expect(logSpy.mock.calls.some(call => String(call[0]).includes('validation failed'))).toBe(true);
    expect(logSpy.mock.calls.some(call => String(call[0]).includes('Stale roots'))).toBe(true);
  });

  it('hasWorkspaceKey matches by name OR root', () => {
    const cmd = new WorkspaceCommand();
    const keys = new Set(['name:foo', 'root:bar']);
    expect(cmd.hasWorkspaceKey(keys, { name: 'foo', root: 'other' })).toBe(true);
    expect(cmd.hasWorkspaceKey(keys, { name: 'other', root: 'bar' })).toBe(true);
    expect(cmd.hasWorkspaceKey(keys, { name: 'other', root: 'other' })).toBe(false);
  });

  it('replaceWorkspaceRegistryBlock appends block when config does not end with newline', () => {
    const cmd = new WorkspaceCommand();
    // configContent not ending with \n
    const result = cmd.replaceWorkspaceRegistryBlock('version: "1.0"', 'workspaces:\n  enabled: true\n');
    expect(result).toContain('Monorepo Workspace Registry');
    expect(result).toContain('workspaces:');
    // There should be double newline separator since config doesn't end with \n
    expect(result).toContain('version: "1.0"\n\n# Monorepo');
  });

  it('updateWorkspaceRegistryBlock handles existing items with null entries', () => {
    const cmd = new WorkspaceCommand();
    const root = '/fake';
    const detected = [{ name: 'a', root: 'packages/a', sourceDir: '/fake/packages/a/src', packageJsonPath: '/fake/packages/a/package.json' }];
    const result = cmd.updateWorkspaceRegistryBlock('workspaces:\n  enabled: true\n  items:\n    - null\n', root, detected);
    expect(result).toContain('name: "a"');
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
