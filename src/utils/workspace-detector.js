const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return null;
  }
}

function normalizeWorkspacePatterns(patterns) {
  if (!Array.isArray(patterns)) return [];
  return patterns.filter(p => typeof p === 'string' && p.trim()).map(p => p.trim());
}

function expandOneLevelGlob(cwd, pattern) {
  const normalized = pattern.replace(/\\/g, '/').replace(/\/$/, '');
  if (!normalized.endsWith('/*')) return [];

  const parentRel = normalized.slice(0, -2);
  const parent = path.join(cwd, parentRel);
  if (!fs.existsSync(parent)) return [];

  return fs.readdirSync(parent, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(parent, entry.name));
}

function packageJsonToWorkspace(root) {
  const packageJsonPath = path.join(root, 'package.json');
  if (!fs.existsSync(packageJsonPath)) return null;

  const pkg = readJson(packageJsonPath) || {};
  return {
    name: pkg.name || path.basename(root),
    root,
    sourceDir: path.join(root, 'src'),
    packageJsonPath,
  };
}

function detectConfiguredPatterns(cwd) {
  const patterns = [];

  const pnpmPath = path.join(cwd, 'pnpm-workspace.yaml');
  if (fs.existsSync(pnpmPath)) {
    try {
      const data = yaml.load(fs.readFileSync(pnpmPath, 'utf8'));
      patterns.push(...normalizeWorkspacePatterns(data && data.packages));
    } catch (_) {
      // ignore invalid workspace files
    }
  }

  const rootPkg = readJson(path.join(cwd, 'package.json'));
  const workspaces = rootPkg && rootPkg.workspaces;
  if (Array.isArray(workspaces)) {
    patterns.push(...normalizeWorkspacePatterns(workspaces));
  } else if (workspaces && Array.isArray(workspaces.packages)) {
    patterns.push(...normalizeWorkspacePatterns(workspaces.packages));
  }

  return patterns;
}

function registryItemToWorkspace(cwd, item) {
  if (!item || typeof item !== 'object') return null;

  const root = item.root && path.resolve(cwd, item.root);
  if (!root) return null;

  return {
    name: item.name || path.basename(root),
    root,
    sourceDir: path.resolve(cwd, item.source_root || item.sourceDir || path.join(item.root, 'src')),
    packageJsonPath: path.resolve(cwd, item.package_json || item.packageJsonPath || path.join(item.root, 'package.json')),
  };
}

function loadWorkspaceRegistry(cwd) {
  const configPath = path.join(cwd, 'stdd', 'config.yaml');
  if (!fs.existsSync(configPath)) return [];

  try {
    const data = yaml.load(fs.readFileSync(configPath, 'utf8')) || {};
    const workspaces = data.workspaces || {};
    if (workspaces.enabled === false || !Array.isArray(workspaces.items)) return [];

    return workspaces.items
      .map(item => registryItemToWorkspace(cwd, item))
      .filter(Boolean);
  } catch (_) {
    return [];
  }
}

function detectWorkspacesDynamically(cwd) {
  const workspaceRoots = new Set();
  const patterns = detectConfiguredPatterns(cwd);

  for (const pattern of patterns) {
    for (const root of expandOneLevelGlob(cwd, pattern)) {
      if (fs.existsSync(path.join(root, 'package.json'))) {
        workspaceRoots.add(path.resolve(root));
      }
    }
  }

  if (workspaceRoots.size === 0) {
    for (const fallback of ['apps/*', 'packages/*']) {
      for (const root of expandOneLevelGlob(cwd, fallback)) {
        if (fs.existsSync(path.join(root, 'package.json'))) {
          workspaceRoots.add(path.resolve(root));
        }
      }
    }
  }

  return Array.from(workspaceRoots)
    .sort()
    .map(root => packageJsonToWorkspace(root))
    .filter(Boolean);
}

function detectWorkspaces(cwd, options = {}) {
  if (!options.refresh) {
    const registered = loadWorkspaceRegistry(cwd);
    if (registered.length > 0) return registered;
  }

  return detectWorkspacesDynamically(cwd);
}

function normalizeRelativePath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '');
}

function resolveWorkspace(cwd, selector) {
  if (!selector) return null;
  const normalizedSelector = normalizeRelativePath(selector);
  const absSelector = path.resolve(cwd, selector);

  return detectWorkspaces(cwd).find(workspace => {
    const relRoot = normalizeRelativePath(path.relative(cwd, workspace.root));
    return workspace.name === selector ||
      relRoot === normalizedSelector ||
      path.resolve(workspace.root) === absSelector;
  }) || null;
}

/**
 * Collect source directories for the project.
 * Shared by metrics, guard, constitution-checker, tdd-init, constitution-fix.
 */
function collectSourceDirs(cwd, options = {}) {
  const { workspace, sourceDir, workspaces, includeTests = false } = options;

  if (sourceDir) return [path.resolve(cwd, sourceDir)];

  const dirs = [];

  if (workspace) {
    if (fs.existsSync(workspace.sourceDir)) dirs.push(path.resolve(workspace.sourceDir));
    if (includeTests) {
      const testsDir = path.join(workspace.root, 'tests');
      if (fs.existsSync(testsDir)) dirs.push(testsDir);
      const srcDir = path.join(workspace.root, 'src');
      if (fs.existsSync(srcDir) && !dirs.includes(path.resolve(srcDir))) dirs.push(srcDir);
    }
    return dirs;
  }

  const rootSrc = path.join(cwd, 'src');
  if (fs.existsSync(rootSrc)) dirs.push(rootSrc);

  const detectedWorkspaces = workspaces || detectWorkspaces(cwd);
  for (const ws of detectedWorkspaces) {
    if (fs.existsSync(ws.sourceDir)) dirs.push(ws.sourceDir);
  }

  return [...new Set(dirs.map(dir => path.resolve(dir)))];
}

module.exports = { detectWorkspaces, loadWorkspaceRegistry, resolveWorkspace, collectSourceDirs };
