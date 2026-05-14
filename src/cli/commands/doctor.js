/**
 * STDD CLI - Doctor Command
 * Diagnose STDD Copilot health in the current project
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { TechStackDetector } = require('../../utils/tech-stack-detector');

const CHECKS = [
  { name: 'STDD directory', id: 'stddDir', severity: 'error' },
  { name: 'config.yaml', id: 'configYaml', severity: 'error' },
  { name: 'AGENTS.md', id: 'agentsMd', severity: 'warning' },
  { name: 'changes directory', id: 'changesDir', severity: 'warning' },
  { name: 'specs directory', id: 'specsDir', severity: 'warning' },
  { name: 'test command configured', id: 'testConfig', severity: 'warning' },
  { name: 'git hooks installed', id: 'gitHooks', severity: 'info' },
  { name: 'husky configured', id: 'husky', severity: 'info' },
  { name: 'Node.js >= 20', id: 'nodeVersion', severity: 'error' },
  { name: 'package.json present', id: 'packageJson', severity: 'warning' },
];

class DoctorCommand {
  constructor(cwd) {
    this.cwd = cwd || process.cwd();
  }

  execute(options = {}) {
    const results = [];

    for (const check of CHECKS) {
      const result = this[check.id]();
      results.push({ ...result, id: check.id, severity: check.severity });
    }

    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
      const hasErrors = results.some(r => r.status === 'fail');
      if (hasErrors) process.exitCode = 1;
      return;
    }

    this.printResults(results);

    const hasErrors = results.some(r => r.status === 'fail');
    if (hasErrors) process.exitCode = 1;
  }

  stddDir() {
    const dir = path.join(this.cwd, 'stdd');
    if (fs.existsSync(dir)) {
      return { status: 'pass', message: 'STDD directory exists' };
    }
    return { status: 'fail', message: 'STDD directory missing. Run `stdd init` first.' };
  }

  configYaml() {
    const file = path.join(this.cwd, 'stdd', 'config.yaml');
    if (fs.existsSync(file)) {
      return { status: 'pass', message: 'stdd/config.yaml present' };
    }
    return { status: 'fail', message: 'stdd/config.yaml missing' };
  }

  agentsMd() {
    const file = path.join(this.cwd, 'AGENTS.md');
    if (fs.existsSync(file)) {
      return { status: 'pass', message: 'AGENTS.md present' };
    }
    return { status: 'warn', message: 'AGENTS.md missing (run `stdd init`)' };
  }

  changesDir() {
    const dir = path.join(this.cwd, 'stdd', 'changes');
    if (fs.existsSync(dir)) {
      return { status: 'pass', message: 'stdd/changes/ directory present' };
    }
    return { status: 'warn', message: 'stdd/changes/ directory missing' };
  }

  specsDir() {
    const dir = path.join(this.cwd, 'stdd', 'specs');
    if (fs.existsSync(dir)) {
      return { status: 'pass', message: 'stdd/specs/ directory present' };
    }
    return { status: 'warn', message: 'stdd/specs/ directory missing' };
  }

  testConfig() {
    const yaml = require('js-yaml');
    const file = path.join(this.cwd, 'stdd', 'config.yaml');
    if (!fs.existsSync(file)) {
      return { status: 'warn', message: 'Cannot check test command (config.yaml missing)' };
    }
    try {
      const cfg = yaml.load(fs.readFileSync(file, 'utf-8'));
      if (cfg && cfg.test && cfg.test.command) {
        return { status: 'pass', message: `Test command: ${cfg.test.command}` };
      }
      return { status: 'warn', message: 'No test command in config.yaml' };
    } catch {
      return { status: 'warn', message: 'Cannot parse config.yaml' };
    }
  }

  gitHooks() {
    const hook = path.join(this.cwd, '.git', 'hooks', 'pre-commit');
    if (!fs.existsSync(hook)) {
      // check husky
      const husky = path.join(this.cwd, '.husky', 'pre-commit');
      if (fs.existsSync(husky)) {
        const content = fs.readFileSync(husky, 'utf-8');
        if (content.includes('stdd')) {
          return { status: 'pass', message: 'Git hook (husky) present' };
        }
      }
      return { status: 'warn', message: 'Git pre-commit hook not installed (run `stdd hooks install --git`)' };
    }
    const content = fs.readFileSync(hook, 'utf-8');
    if (content.includes('stdd')) {
      return { status: 'pass', message: 'Git pre-commit hook installed' };
    }
    return { status: 'warn', message: 'Git pre-commit hook does not contain stdd guard' };
  }

  husky() {
    const huskyDir = path.join(this.cwd, '.husky');
    if (fs.existsSync(huskyDir)) {
      return { status: 'pass', message: 'Husky present' };
    }
    // check package.json for husky
    const pkgFile = path.join(this.cwd, 'package.json');
    if (fs.existsSync(pkgFile)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf-8'));
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        if (deps.husky) {
          return { status: 'info', message: 'Husky in dependencies but .husky/ directory not found' };
        }
      } catch {}
    }
    return { status: 'info', message: 'Husky not detected' };
  }

  nodeVersion() {
    const major = parseInt(process.version.slice(1).split('.')[0]);
    if (major >= 20) {
      return { status: 'pass', message: `Node.js ${process.version} (>= 20)` };
    }
    return { status: 'fail', message: `Node.js ${process.version} (need >= 20)` };
  }

  packageJson() {
    const file = path.join(this.cwd, 'package.json');
    if (fs.existsSync(file)) {
      return { status: 'pass', message: 'package.json present' };
    }
    return { status: 'warn', message: 'package.json not found' };
  }

  printResults(results) {
    console.log(chalk.bold('\n🏥 STDD Copilot Doctor\n'));
    const statusIcon = {
      pass: chalk.green('✅'),
      fail: chalk.red('❌'),
      warn: chalk.yellow('⚠️'),
      info: chalk.dim('ℹ️'),
    };

    for (const r of results) {
      console.log(`  ${statusIcon[r.status] || '  '}  ${r.message}`);
    }

    const failCount = results.filter(r => r.status === 'fail').length;
    const warnCount = results.filter(r => r.status === 'warn').length;
    console.log('');
    if (failCount > 0) {
      console.log(chalk.red(`Found ${failCount} critical issue(s) that should be fixed.`));
    }
    if (warnCount > 0) {
      console.log(chalk.yellow(`${warnCount} warning(s).`));
    }
    if (failCount === 0 && warnCount === 0) {
      console.log(chalk.green('Everything looks good!'));
    }
    console.log('');
  }
}

module.exports = { DoctorCommand };
