const fs = require('fs');
const path = require('path');
const os = require('os');
const { collectSourceDirs } = require('../src/utils/workspace-detector');

function makeTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-csd-'));
}

function makeProject(root, opts = {}) {
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'root' }));

  if (opts.workspaces) {
    const pkgJson = { name: 'root', workspaces: ['packages/*'] };
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(pkgJson));
    for (const ws of opts.workspaces) {
      const wsDir = path.join(root, 'packages', ws);
      fs.mkdirSync(path.join(wsDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(wsDir, 'package.json'), JSON.stringify({ name: ws }));
    }
  }
}

describe('collectSourceDirs', () => {
  it('returns root src when no workspace', () => {
    const root = makeTmp();
    makeProject(root);

    const dirs = collectSourceDirs(root);
    expect(dirs).toHaveLength(1);
    expect(dirs[0]).toBe(path.resolve(root, 'src'));
  });

  it('returns empty when no src dir exists', () => {
    const root = makeTmp();
    fs.writeFileSync(path.join(root, 'package.json'), '{}');

    const dirs = collectSourceDirs(root);
    expect(dirs).toEqual([]);
  });

  it('returns single dir when sourceDir option provided', () => {
    const root = makeTmp();
    const customSrc = path.join(root, 'custom-src');
    fs.mkdirSync(customSrc, { recursive: true });

    const dirs = collectSourceDirs(root, { sourceDir: 'custom-src' });
    expect(dirs).toHaveLength(1);
    expect(dirs[0]).toBe(path.resolve(root, 'custom-src'));
  });

  it('returns workspace sourceDir when workspace provided', () => {
    const root = makeTmp();
    const wsSrc = path.join(root, 'packages', 'api', 'src');
    fs.mkdirSync(wsSrc, { recursive: true });
    const workspace = {
      name: 'api',
      root: path.join(root, 'packages', 'api'),
      sourceDir: wsSrc,
    };

    const dirs = collectSourceDirs(root, { workspace });
    expect(dirs).toHaveLength(1);
    expect(dirs[0]).toBe(path.resolve(wsSrc));
  });

  it('includes tests dir when includeTests is true and workspace provided', () => {
    const root = makeTmp();
    const wsRoot = path.join(root, 'packages', 'api');
    fs.mkdirSync(path.join(wsRoot, 'src'), { recursive: true });
    fs.mkdirSync(path.join(wsRoot, 'tests'), { recursive: true });
    const workspace = {
      name: 'api',
      root: wsRoot,
      sourceDir: path.join(wsRoot, 'src'),
    };

    const dirs = collectSourceDirs(root, { workspace, includeTests: true });
    expect(dirs.length).toBeGreaterThanOrEqual(1);
    expect(dirs.some(d => d.includes('tests'))).toBe(true);
  });

  it('collects workspace source dirs when workspaces array provided', () => {
    const root = makeTmp();
    makeProject(root, { workspaces: ['api', 'web'] });

    const dirs = collectSourceDirs(root, {
      workspaces: [
        { name: 'api', root: path.join(root, 'packages', 'api'), sourceDir: path.join(root, 'packages', 'api', 'src') },
        { name: 'web', root: path.join(root, 'packages', 'web'), sourceDir: path.join(root, 'packages', 'web', 'src') },
      ],
    });

    expect(dirs).toHaveLength(3); // root/src + api/src + web/src
  });

  it('deduplicates resolved paths', () => {
    const root = makeTmp();
    makeProject(root);
    const dirs = collectSourceDirs(root);
    const unique = new Set(dirs);
    expect(dirs).toContain(path.resolve(root, 'src'));
    expect(dirs.length).toBe(unique.size);
  });

  it('returns empty when workspace sourceDir does not exist', () => {
    const root = makeTmp();
    const workspace = {
      name: 'ghost',
      root: path.join(root, 'ghost'),
      sourceDir: path.join(root, 'ghost', 'nonexistent'),
    };

    const dirs = collectSourceDirs(root, { workspace });
    expect(dirs).toEqual([]);
  });
});
