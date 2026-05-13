const path = require('path');
const { detectWorkspaces, resolveWorkspace } = require('./workspace-detector');

function normalizePath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '');
}

function workspaceToScope(cwd, workspace) {
  if (!workspace) return null;
  const relRoot = normalizePath(path.relative(cwd, workspace.root)) || workspace.name;
  return {
    name: workspace.name,
    root: workspace.root,
    path: relRoot,
  };
}

function resolveWorkspaceScope(cwd, selector) {
  if (!selector) return null;
  const workspace = typeof selector === 'string' ? resolveWorkspace(cwd, selector) : selector;
  return workspaceToScope(cwd, workspace);
}

function detectWorkspaceScopes(cwd) {
  return detectWorkspaces(cwd).map(workspace => workspaceToScope(cwd, workspace));
}

function commandToWorkspaceScope(cwd, testCommand) {
  if (!testCommand || testCommand.source !== 'workspace') return null;
  return {
    name: testCommand.workspaceName,
    root: testCommand.cwd,
    path: normalizePath(path.relative(cwd, testCommand.cwd)) || testCommand.workspaceName,
  };
}

function workspaceMatchesScope(scope, selector) {
  if (!scope || !selector) return false;
  const normalizedSelector = normalizePath(selector);
  return scope.name === selector ||
    normalizePath(scope.name) === normalizedSelector ||
    normalizePath(scope.path) === normalizedSelector ||
    normalizePath(scope.root) === normalizedSelector;
}

function workspaceFromPath(filePath) {
  const normalized = normalizePath(filePath);
  const parts = normalized.split('/');
  if (parts.length >= 2 && (parts[0] === 'packages' || parts[0] === 'apps')) {
    return parts[0] + '/' + parts[1];
  }
  return null;
}

function addScope(refs, value) {
  if (!value) return;
  if (typeof value === 'string') {
    refs.add(normalizePath(value));
    return;
  }
  for (const key of ['name', 'path', 'root', 'workspaceName', 'workspace']) {
    if (value[key]) refs.add(normalizePath(value[key]));
  }
  if (value.cwd) refs.add(normalizePath(value.cwd));
}

function extractEvidenceWorkspaceRefs(data) {
  const refs = new Set();
  const metadata = data.metadata || {};
  const results = data.results || {};

  addScope(refs, metadata.workspace);
  if (Array.isArray(metadata.workspaces)) metadata.workspaces.forEach(workspace => addScope(refs, workspace));
  addScope(refs, results.workspace);
  if (Array.isArray(results.workspaces)) results.workspaces.forEach(workspace => addScope(refs, workspace));

  const tests = results.tests;
  if (tests) {
    addScope(refs, tests.workspace);
    if (Array.isArray(tests.workspaces)) tests.workspaces.forEach(workspace => addScope(refs, workspace));
  }

  const guardCommands = results.testCommands && results.testCommands.details && results.testCommands.details.commands;
  if (Array.isArray(guardCommands)) guardCommands.forEach(command => addScope(refs, command.workspace || command));

  const issues = results.constitution && (results.constitution.details || results.constitution.issues);
  if (issues) {
    for (const issue of [...(issues.blocking || []), ...(issues.warning || [])]) {
      addScope(refs, issue.workspace);
      addScope(refs, issue.workspaceName);
      for (const key of ['file', 'path', 'filepath', 'filePath']) {
        const workspace = workspaceFromPath(issue[key]);
        if (workspace) refs.add(workspace);
      }
      const matches = String(issue.message || '').match(/[\w.-]+(?:\/[\w.-]+)+\.(?:js|jsx|ts|tsx|py|json|md|yml|yaml)/g) || [];
      matches.map(workspaceFromPath).filter(Boolean).forEach(workspace => refs.add(workspace));
    }
  }

  if (metadata.file) {
    const workspace = workspaceFromPath(metadata.file);
    if (workspace) refs.add(workspace);
  }

  return Array.from(refs).filter(Boolean).sort();
}

function evidenceMatchesWorkspace(data, selector) {
  if (!selector) return true;
  const normalizedSelector = normalizePath(selector);
  return extractEvidenceWorkspaceRefs(data).some(ref => {
    const normalized = normalizePath(ref);
    return normalized === normalizedSelector || normalized.endsWith('/' + normalizedSelector);
  });
}

module.exports = {
  normalizePath,
  workspaceToScope,
  resolveWorkspaceScope,
  detectWorkspaceScopes,
  commandToWorkspaceScope,
  workspaceMatchesScope,
  workspaceFromPath,
  extractEvidenceWorkspaceRefs,
  evidenceMatchesWorkspace,
};
