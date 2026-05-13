/**
 * STDD Reporter Injector
 * Auto-detects the test framework and injects reporter paths into test commands.
 */

const fs = require('fs');
const path = require('path');

const STDD_REPORTERS = path.resolve(__dirname, '../../stdd/reporters');

function _readPackageJson(cwd) {
  const pkgPath = path.join(cwd, 'package.json');
  try {
    return JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  } catch {
    return {};
  }
}

function _detectFramework(cwd) {
  const pkg = _readPackageJson(cwd);
  const deps = {
    ...((pkg && pkg.dependencies) || {}),
    ...((pkg && pkg.devDependencies) || {}),
  };
  if (deps['vitest']) return 'vitest';
  if (deps['jest'] || deps['ts-jest']) return 'jest';

  if (
    fs.existsSync(path.join(cwd, 'pyproject.toml')) ||
    fs.existsSync(path.join(cwd, 'requirements.txt')) ||
    fs.existsSync(path.join(cwd, 'setup.py'))
  ) {
    const files = ['pyproject.toml', 'requirements.txt', 'setup.py'];
    for (const f of files) {
      const fp = path.join(cwd, f);
      if (fs.existsSync(fp)) {
        try {
          const content = fs.readFileSync(fp, 'utf-8').toLowerCase();
          if (content.includes('pytest')) return 'pytest';
        } catch {
          // ignore
        }
      }
    }
  }

  return null;
}

function _resolveReporter(framework) {
  const map = { vitest: 'vitest.js', jest: 'jest.js', pytest: 'pytest_plugin.py' };
  const name = map[framework];
  if (!name) return null;
  const localPath = path.join(process.cwd(), 'stdd', 'reporters', name);
  if (fs.existsSync(localPath)) return localPath;
  const bundledPath = path.join(STDD_REPORTERS, name);
  if (fs.existsSync(bundledPath)) return bundledPath;
  return null;
}

function injectReporter(testCmd, cwd) {
  const framework = _detectFramework(cwd);
  if (!framework) {
    return { command: testCmd, env: undefined };
  }

  const reporterPath = _resolveReporter(framework);
  if (!reporterPath) {
    return { command: testCmd, env: undefined };
  }

  if (framework === 'pytest') {
    const rDir = path.dirname(reporterPath);
    const env = {
      ...process.env,
      PYTHONPATH: process.env.PYTHONPATH
        ? `${rDir}${path.delimiter}${process.env.PYTHONPATH}`
        : rDir,
    };
    return { command: testCmd + ' -p pytest_plugin', env };
  }

  if (framework === 'vitest') {
    return { command: testCmd + ' --reporter=' + reporterPath, env: undefined };
  }

  if (framework === 'jest') {
    return { command: testCmd + ' --reporters=' + reporterPath, env: undefined };
  }

  return { command: testCmd, env: undefined };
}

module.exports = { injectReporter, _detectFramework, _resolveReporter, STDD_REPORTERS };
