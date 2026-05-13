const fs = require('fs');
const path = require('path');
const { detectWorkspaces, resolveWorkspace } = require('./workspace-detector');

function readPackageJson(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
  } catch {
    return null;
  }
}

function detectPackageManager(cwd) {
  if (fs.existsSync(path.join(cwd, 'pnpm-workspace.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

function buildTestCommand(packageManager) {
  if (packageManager === 'pnpm') return 'pnpm test';
  if (packageManager === 'yarn') return 'yarn test';
  return 'npm test';
}

function hasTestScript(pkg) {
  return !!(pkg && pkg.scripts && pkg.scripts.test);
}

function createCommand(command, cwd, workspaceName, source) {
  return { command, cwd, workspaceName, source };
}

function resolveTestCommands(cwd, options = {}) {
  if (options.workspace) {
    const workspace = typeof options.workspace === 'string'
      ? resolveWorkspace(cwd, options.workspace)
      : options.workspace;
    if (!workspace) return [];

    if (options.testCommand) {
      return [createCommand(options.testCommand, workspace.root, workspace.name, 'workspace')];
    }

    const pkg = readPackageJson(workspace.root);
    if (!hasTestScript(pkg)) return [];
    return [createCommand(
      buildTestCommand(detectPackageManager(cwd)),
      workspace.root,
      (pkg && pkg.name) || workspace.name,
      'workspace'
    )];
  }

  if (options.testCommand) {
    return [createCommand(options.testCommand, cwd, 'root', 'root')];
  }

  if (options.configCommand) {
    return [createCommand(options.configCommand, cwd, 'root', 'root')];
  }

  const packageManager = detectPackageManager(cwd);
  const rootPkg = readPackageJson(cwd);
  if (hasTestScript(rootPkg)) {
    return [createCommand(buildTestCommand(packageManager), cwd, (rootPkg && rootPkg.name) || 'root', 'root')];
  }

  return detectWorkspaces(cwd)
    .map(workspace => ({ workspace, pkg: readPackageJson(workspace.root) }))
    .filter(item => hasTestScript(item.pkg))
    .map(item => createCommand(
      buildTestCommand(packageManager),
      item.workspace.root,
      (item.pkg && item.pkg.name) || item.workspace.name,
      'workspace'
    ));
}

function detectTestCommand(cwd) {
  const commands = resolveTestCommands(cwd);
  return commands.length > 0 ? commands[0].command : null;
}

module.exports = {
  resolveTestCommands,
  detectTestCommand,
  _detectPackageManager: detectPackageManager,
};
