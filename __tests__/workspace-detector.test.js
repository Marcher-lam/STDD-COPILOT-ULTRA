const fs = require('fs');
const path = require('path');
const os = require('os');
const { detectWorkspaces, loadWorkspaceRegistry } = require('../src/utils/workspace-detector');

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
});
