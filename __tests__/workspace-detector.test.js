const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  detectWorkspaces,
  loadWorkspaceRegistry,
  resolveWorkspace,
  collectSourceDirs,
} = require('../src/utils/workspace-detector');

describe('workspace detector', () => {
  let tempDirs = [];

  function createProject(setupFn) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-workspace-detector-'));
    tempDirs.push(root);
    if (setupFn) setupFn(root);
    return root;
  }

  function writePackageJson(dir, pkg) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg));
  }

  afterAll(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects pnpm-workspace.yaml packages globs', () => {
    const project = createProject((root) => {
      fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n  - apps/*\n');
      writePackageJson(path.join(root, 'packages', 'api'), { name: '@acme/api' });
      writePackageJson(path.join(root, 'apps', 'web'), { name: '@acme/web' });
    });

    const workspaces = detectWorkspaces(project);

    expect(workspaces.map(w => w.name).sort()).toEqual(['@acme/api', '@acme/web']);
    expect(workspaces[0]).toHaveProperty('root');
    expect(workspaces[0]).toHaveProperty('sourceDir');
    expect(workspaces[0]).toHaveProperty('packageJsonPath');
  });

  it('detects package.json workspaces array and object forms', () => {
    const arrayProject = createProject((root) => {
      fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ workspaces: ['packages/*'] }));
      writePackageJson(path.join(root, 'packages', 'core'), { name: 'core' });
    });
    const objectProject = createProject((root) => {
      fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ workspaces: { packages: ['apps/*'] } }));
      writePackageJson(path.join(root, 'apps', 'site'), { name: 'site' });
    });

    expect(detectWorkspaces(arrayProject).map(w => w.name)).toEqual(['core']);
    expect(detectWorkspaces(objectProject).map(w => w.name)).toEqual(['site']);
  });

  it('falls back to apps and packages directories with package.json', () => {
    const project = createProject((root) => {
      writePackageJson(path.join(root, 'packages', 'api'), { name: 'api' });
      fs.mkdirSync(path.join(root, 'packages', 'docs'), { recursive: true });
    });

    const workspaces = detectWorkspaces(project);

    expect(workspaces.map(w => w.name)).toEqual(['api']);
  });

  it('loads workspace registry from stdd/config.yaml', () => {
    const project = createProject((root) => {
      fs.mkdirSync(path.join(root, 'stdd'), { recursive: true });
      fs.writeFileSync(path.join(root, 'stdd', 'config.yaml'), `workspaces:
  enabled: true
  items:
    - name: "@acme/api"
      root: "packages/api"
      source_root: "packages/api/src"
      package_json: "packages/api/package.json"
`);
    });

    const workspaces = loadWorkspaceRegistry(project);

    expect(workspaces.map(w => w.name)).toEqual(['@acme/api']);
    expect(workspaces[0].root).toBe(path.join(project, 'packages', 'api'));
    expect(workspaces[0].sourceDir).toBe(path.join(project, 'packages', 'api', 'src'));
    expect(workspaces[0].packageJsonPath).toBe(path.join(project, 'packages', 'api', 'package.json'));
  });

  it('returns empty array when no workspaces found anywhere', () => {
    const project = createProject();

    const workspaces = detectWorkspaces(project, { refresh: true });

    expect(workspaces).toEqual([]);
  });

  it('skips directories without package.json during glob expansion', () => {
    const project = createProject((root) => {
      fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
      fs.mkdirSync(path.join(root, 'packages', 'no-pkg'), { recursive: true });
      fs.mkdirSync(path.join(root, 'packages', 'has-pkg'), { recursive: true });
      writePackageJson(path.join(root, 'packages', 'has-pkg'), { name: 'has-pkg' });
    });

    const workspaces = detectWorkspaces(project, { refresh: true });

    expect(workspaces.map(w => w.name)).toEqual(['has-pkg']);
  });

  it('falls back to apps/* and packages/* when configured patterns yield nothing', () => {
    const project = createProject((root) => {
      fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - libs/*\n');
      writePackageJson(path.join(root, 'apps', 'web'), { name: 'web-app' });
      writePackageJson(path.join(root, 'packages', 'shared'), { name: 'shared-pkg' });
    });

    const workspaces = detectWorkspaces(project, { refresh: true });

    expect(workspaces.map(w => w.name).sort()).toEqual(['shared-pkg', 'web-app']);
  });

  it('uses directory basename when package.json has no name field', () => {
    const project = createProject((root) => {
      fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
      writePackageJson(path.join(root, 'packages', 'my-lib'), {});
    });

    const workspaces = detectWorkspaces(project, { refresh: true });

    expect(workspaces.map(w => w.name)).toEqual(['my-lib']);
  });

  it('returns workspaces sorted by root path', () => {
    const project = createProject((root) => {
      fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
      writePackageJson(path.join(root, 'packages', 'zebra'), { name: 'z-pkg' });
      writePackageJson(path.join(root, 'packages', 'alpha'), { name: 'a-pkg' });
    });

    const workspaces = detectWorkspaces(project, { refresh: true });

    expect(workspaces.map(w => w.name)).toEqual(['a-pkg', 'z-pkg']);
  });

  it('handles patterns pointing to nonexistent parent directories', () => {
    const project = createProject((root) => {
      fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - nonexistent/*\n');
    });

    const workspaces = detectWorkspaces(project, { refresh: true });

    expect(workspaces).toEqual([]);
  });

  it('handles invalid JSON in package.json gracefully via readJson', () => {
    const project = createProject((root) => {
      fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
      const pkgDir = path.join(root, 'packages', 'bad');
      fs.mkdirSync(pkgDir, { recursive: true });
      fs.writeFileSync(path.join(pkgDir, 'package.json'), 'not-valid-json{{{');
    });

    const workspaces = detectWorkspaces(project, { refresh: true });

    expect(workspaces.length).toBe(1);
    expect(workspaces[0].name).toBe('bad');
  });

  it('deduplicates workspace roots from overlapping patterns', () => {
    const project = createProject((root) => {
      fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n  - packages/*\n');
      writePackageJson(path.join(root, 'packages', 'core'), { name: 'core' });
    });

    const workspaces = detectWorkspaces(project, { refresh: true });

    expect(workspaces.map(w => w.name)).toEqual(['core']);
    expect(workspaces.length).toBe(1);
  });

  it('prefers registry and refresh=true forces dynamic detection', () => {
    const project = createProject((root) => {
      fs.mkdirSync(path.join(root, 'stdd'), { recursive: true });
      fs.writeFileSync(path.join(root, 'stdd', 'config.yaml'), `workspaces:
  enabled: true
  items:
    - name: "registered"
      root: "custom/registered"
      source_root: "custom/registered/src"
      package_json: "custom/registered/package.json"
`);
      fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
      writePackageJson(path.join(root, 'packages', 'dynamic'), { name: 'dynamic' });
    });

    expect(detectWorkspaces(project).map(w => w.name)).toEqual(['registered']);
    expect(detectWorkspaces(project, { refresh: true }).map(w => w.name)).toEqual(['dynamic']);
  });

  // --- resolveWorkspace coverage (lines 136-151) ---

  describe('resolveWorkspace', () => {
    it('returns null when selector is falsy', () => {
      const project = createProject((root) => {
        fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
        writePackageJson(path.join(root, 'packages', 'core'), { name: 'core' });
      });

      expect(resolveWorkspace(project, null)).toBeNull();
      expect(resolveWorkspace(project, undefined)).toBeNull();
      expect(resolveWorkspace(project, '')).toBeNull();
    });

    it('resolves workspace by name', () => {
      const project = createProject((root) => {
        fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
        writePackageJson(path.join(root, 'packages', 'core'), { name: 'my-core' });
      });

      const ws = resolveWorkspace(project, 'my-core');
      expect(ws).not.toBeNull();
      expect(ws.name).toBe('my-core');
    });

    it('resolves workspace by relative path', () => {
      const project = createProject((root) => {
        fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
        writePackageJson(path.join(root, 'packages', 'core'), { name: 'core' });
      });

      const ws = resolveWorkspace(project, 'packages/core');
      expect(ws).not.toBeNull();
      expect(ws.name).toBe('core');
    });

    it('resolves workspace by absolute path', () => {
      const project = createProject((root) => {
        fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
        writePackageJson(path.join(root, 'packages', 'core'), { name: 'core' });
      });

      const absPath = path.join(project, 'packages', 'core');
      const ws = resolveWorkspace(project, absPath);
      expect(ws).not.toBeNull();
      expect(ws.root).toBe(path.resolve(absPath));
    });

    it('returns null when no workspace matches selector', () => {
      const project = createProject((root) => {
        fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
        writePackageJson(path.join(root, 'packages', 'core'), { name: 'core' });
      });

      expect(resolveWorkspace(project, 'nonexistent')).toBeNull();
    });
  });

  // --- collectSourceDirs coverage (lines 157-184) ---

  describe('collectSourceDirs', () => {
    it('returns resolved sourceDir when sourceDir option provided', () => {
      const project = createProject();
      const dirs = collectSourceDirs(project, { sourceDir: 'lib' });
      expect(dirs).toEqual([path.resolve(project, 'lib')]);
    });

    it('returns workspace sourceDir when workspace option provided', () => {
      const project = createProject((root) => {
        fs.mkdirSync(path.join(root, 'my-pkg', 'src'), { recursive: true });
      });
      const workspace = {
        root: path.join(project, 'my-pkg'),
        sourceDir: path.join(project, 'my-pkg', 'src'),
      };
      const dirs = collectSourceDirs(project, { workspace });
      expect(dirs).toEqual([path.resolve(project, 'my-pkg', 'src')]);
    });

    it('includes test dirs when includeTests and workspace provided', () => {
      const project = createProject((root) => {
        fs.mkdirSync(path.join(root, 'my-pkg', 'src'), { recursive: true });
        fs.mkdirSync(path.join(root, 'my-pkg', 'tests'), { recursive: true });
      });
      const workspace = {
        root: path.join(project, 'my-pkg'),
        sourceDir: path.join(project, 'my-pkg', 'src'),
      };
      const dirs = collectSourceDirs(project, { workspace, includeTests: true });
      expect(dirs).toContain(path.resolve(project, 'my-pkg', 'tests'));
      expect(dirs).toContain(path.resolve(project, 'my-pkg', 'src'));
    });

    it('falls back to cwd/src when no workspace or sourceDir', () => {
      const project = createProject((root) => {
        fs.mkdirSync(path.join(root, 'src'), { recursive: true });
      });
      const dirs = collectSourceDirs(project, { refresh: true });
      expect(dirs).toEqual([path.join(project, 'src')]);
    });

    it('uses provided workspaces array instead of detecting', () => {
      const project = createProject((root) => {
        fs.mkdirSync(path.join(root, 'custom', 'src'), { recursive: true });
      });
      const workspaces = [
        { root: path.join(project, 'custom'), sourceDir: path.join(project, 'custom', 'src') },
      ];
      const dirs = collectSourceDirs(project, { workspaces });
      expect(dirs).toEqual([path.resolve(project, 'custom', 'src')]);
    });

    it('deduplicates source dirs', () => {
      const project = createProject((root) => {
        fs.mkdirSync(path.join(root, 'src'), { recursive: true });
        fs.mkdirSync(path.join(root, 'ws', 'src'), { recursive: true });
      });
      const workspaces = [
        { root: path.join(project, 'ws'), sourceDir: path.join(project, 'ws', 'src') },
      ];
      const dirs = collectSourceDirs(project, { workspaces });
      // ws/src and cwd/src should both be present, deduplicated
      const unique = [...new Set(dirs)];
      expect(dirs.length).toBe(unique.length);
    });
  });

  // --- Edge cases for internal functions ---

  describe('normalizeWorkspacePatterns edge cases (line 14)', () => {
    it('handles pnpm-workspace.yaml with non-array packages field', () => {
      const project = createProject((root) => {
        fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages: "not-an-array"\n');
        writePackageJson(path.join(root, 'apps', 'web'), { name: 'web' });
      });

      // Should fall back to apps/* and packages/* since configured patterns yield nothing
      const workspaces = detectWorkspaces(project, { refresh: true });
      expect(workspaces.map(w => w.name)).toEqual(['web']);
    });

    it('handles pnpm-workspace.yaml with packages containing non-string entries', () => {
      const project = createProject((root) => {
        fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - 123\n  - null\n  - ""\n  - "   "\n  - "packages/*"\n');
        writePackageJson(path.join(root, 'packages', 'core'), { name: 'core' });
      });

      const workspaces = detectWorkspaces(project, { refresh: true });
      expect(workspaces.map(w => w.name)).toEqual(['core']);
    });
  });

  describe('expandOneLevelGlob non-glob patterns (line 20)', () => {
    it('ignores patterns that are not /* globs', () => {
      const project = createProject((root) => {
        // Write workspaces as array with a non-glob pattern
        fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({
          workspaces: ['packages/core', 'packages/*'],
        }));
        writePackageJson(path.join(root, 'packages', 'core'), { name: 'core' });
        writePackageJson(path.join(root, 'packages', 'other'), { name: 'other' });
      });

      const workspaces = detectWorkspaces(project, { refresh: true });
      // 'packages/core' (non-glob) should be ignored, only 'packages/*' matches
      expect(workspaces.map(w => w.name)).toContain('other');
    });
  });

  describe('registryItemToWorkspace edge cases (lines 69, 72-78)', () => {
    it('handles null items in registry gracefully', () => {
      const project = createProject((root) => {
        fs.mkdirSync(path.join(root, 'stdd'), { recursive: true });
        fs.writeFileSync(path.join(root, 'stdd', 'config.yaml'), `workspaces:
  enabled: true
  items:
    - null
    - name: "valid"
      root: "packages/valid"
`);
        writePackageJson(path.join(root, 'packages', 'valid'), { name: 'valid' });
      });

      const workspaces = loadWorkspaceRegistry(project);
      expect(workspaces.map(w => w.name)).toEqual(['valid']);
    });

    it('handles item without root field', () => {
      const project = createProject((root) => {
        fs.mkdirSync(path.join(root, 'stdd'), { recursive: true });
        fs.writeFileSync(path.join(root, 'stdd', 'config.yaml'), `workspaces:
  enabled: true
  items:
    - name: "no-root"
`);
      });

      const workspaces = loadWorkspaceRegistry(project);
      expect(workspaces).toEqual([]);
    });

    it('uses item.sourceDir when source_root not present', () => {
      const project = createProject((root) => {
        fs.mkdirSync(path.join(root, 'stdd'), { recursive: true });
        fs.writeFileSync(path.join(root, 'stdd', 'config.yaml'), `workspaces:
  enabled: true
  items:
    - name: "custom"
      root: "pkg"
      sourceDir: "pkg/lib"
      packageJsonPath: "pkg/pkg.json"
`);
      });

      const workspaces = loadWorkspaceRegistry(project);
      expect(workspaces.length).toBe(1);
      expect(workspaces[0].sourceDir).toBe(path.join(project, 'pkg', 'lib'));
      expect(workspaces[0].packageJsonPath).toBe(path.join(project, 'pkg', 'pkg.json'));
    });

    it('uses directory basename as name when item has no name', () => {
      const project = createProject((root) => {
        fs.mkdirSync(path.join(root, 'stdd'), { recursive: true });
        fs.writeFileSync(path.join(root, 'stdd', 'config.yaml'), `workspaces:
  enabled: true
  items:
    - root: "my-package"
`);
      });

      const workspaces = loadWorkspaceRegistry(project);
      expect(workspaces.length).toBe(1);
      expect(workspaces[0].name).toBe('my-package');
    });
  });

  describe('loadWorkspaceRegistry edge cases (lines 87, 89)', () => {
    it('handles invalid YAML in config.yaml', () => {
      const project = createProject((root) => {
        fs.mkdirSync(path.join(root, 'stdd'), { recursive: true });
        fs.writeFileSync(path.join(root, 'stdd', 'config.yaml'), '::invalid: [yaml');
      });

      const workspaces = loadWorkspaceRegistry(project);
      expect(workspaces).toEqual([]);
    });

    it('returns empty when workspaces.enabled is false', () => {
      const project = createProject((root) => {
        fs.mkdirSync(path.join(root, 'stdd'), { recursive: true });
        fs.writeFileSync(path.join(root, 'stdd', 'config.yaml'), `workspaces:
  enabled: false
  items:
    - name: "should-not-load"
      root: "pkg"
`);
      });

      const workspaces = loadWorkspaceRegistry(project);
      expect(workspaces).toEqual([]);
    });

    it('returns empty when workspaces has no items array', () => {
      const project = createProject((root) => {
        fs.mkdirSync(path.join(root, 'stdd'), { recursive: true });
        fs.writeFileSync(path.join(root, 'stdd', 'config.yaml'), `workspaces:
  enabled: true
`);
      });

      const workspaces = loadWorkspaceRegistry(project);
      expect(workspaces).toEqual([]);
    });
  });
});
