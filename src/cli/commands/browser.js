const { BrowserController } = require('../../runtime/browser-controller');
const { BrowserDoctor } = require('../../runtime/browser-doctor');
const { VisualRegression } = require('../../utils/visual-regression');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const logger = createLogger('browser');

class BrowserCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.controller = new BrowserController();
    this.visualRegression = new VisualRegression(cwd);
  }

  execute(action, target, options = {}) {
    if (action === 'snapshot') {
      return this.snapshot(target, options);
    } else if (action === 'inspect') {
      return this.inspect(target, options);
    } else if (action === 'doctor') {
      return this.doctor(options);
    } else if (action === 'compare') {
      return this.compare(target, options);
    } else if (action === 'update-baseline') {
      return this.updateBaseline(target, options);
    } else {
      console.log(chalk.yellow("Usage: stdd browser <snapshot|inspect|doctor|compare|update-baseline> <url>"));
    }
  }

  async snapshot(url, options) {
    try {
      console.log(chalk.cyan(`Taking browser snapshot of: ${url}`));
      const result = await this.controller.snapshot({ ...options, url });
      console.log(chalk.green(`Snapshot saved: ${result.relativePath}`));
      console.log(chalk.dim(`URL: ${result.url}`));
      console.log(chalk.dim(`Title: ${result.title}`));
      return result;
    } catch (error) {
      logger.error(`Browser Error: ${error.message}`);
      if (error.message.includes("not installed")) {
        console.log(chalk.yellow("Tip: Run `npm install playwright` to enable built-in browser drive."));
      }
      process.exitCode = 1;
    }
  }

  async inspect(url, options) {
    try {
      console.log(chalk.cyan(`Inspecting page: ${url}`));
      const result = await this.controller.inspect({ ...options, url });
      console.log(chalk.green(`Inspection Complete:`));
      console.log(chalk.dim(`Title: ${result.title}`));
      return result;
    } catch (error) {
      logger.error(`Inspection Error: ${error.message}`);
      process.exitCode = 1;
    }
  }

  doctor(options = {}) {
    const result = new BrowserDoctor(this.cwd).check(options);
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return result;
    }

    console.log(chalk.bold('\nBrowser Doctor'));
    for (const check of result.checks) {
      const label = check.status === 'pass' ? chalk.green('PASS') : chalk.red('FAIL');
      console.log(`  ${label} ${check.name}${check.message ? ` - ${check.message}` : ''}`);
    }
    if (result.suggestions.length) {
      console.log(chalk.yellow('\nSuggested fixes:'));
      result.suggestions.forEach(command => console.log(`  ${command}`));
    }
    if (result.status !== 'pass') process.exitCode = 1;
    return result;
  }

  async compare(url, options = {}) {
    if (!url) {
      console.log(chalk.red('Error: URL is required for comparison.'));
      console.log(chalk.yellow('Usage: stdd browser compare <url> [--name <name>] [--threshold <ratio>]'));
      process.exitCode = 1;
      return;
    }

    const name = options.name || this._urlToName(url);
    const threshold = parseFloat(options.threshold) || 0.01;

    try {
      console.log(chalk.cyan(`Visual regression check: ${url}`));
      console.log(chalk.dim(`  Snapshot name: ${name} | Threshold: ${(threshold * 100).toFixed(1)}%`));

      const result = await this.visualRegression.runVisualCheck(url, name, { threshold });

      if (result.status === 'baseline_created') {
        console.log(chalk.yellow(`\n  ⚠ ${result.message}`));
        console.log(chalk.dim(`  Baseline: ${result.baselinePath}`));
        return result;
      }

      const pct = (result.diffRatio * 100).toFixed(3);
      if (result.passed) {
        console.log(chalk.green(`\n  ✓ Visual check passed (diff: ${pct}% ≤ ${(threshold * 100).toFixed(1)}%)`));
      } else {
        console.log(chalk.red(`\n  ✗ Visual check FAILED (diff: ${pct}% > ${(threshold * 100).toFixed(1)}%)`));
        if (result.diffImagePath) {
          console.log(chalk.dim(`  Diff image: ${result.diffImagePath}`));
        }
        if (result.sizeMismatch) {
          console.log(chalk.red(`  Size mismatch: ${result.baselineSize.width}x${result.baselineSize.height} vs ${result.currentSize.width}x${result.currentSize.height}`));
        }
        if (result.fallback) {
          console.log(chalk.dim(`  Note: ${result.note}`));
        }
        process.exitCode = 1;
      }
      return result;
    } catch (error) {
      logger.error(`Visual regression error: ${error.message}`);
      if (error.message.includes('not installed')) {
        console.log(chalk.yellow('Tip: Run `npm install playwright` to enable visual regression.'));
      }
      process.exitCode = 1;
    }
  }

  async updateBaseline(url, options = {}) {
    if (!url) {
      console.log(chalk.red('Error: URL is required for baseline update.'));
      console.log(chalk.yellow('Usage: stdd browser update-baseline <url> [--name <name>]'));
      process.exitCode = 1;
      return;
    }

    const name = options.name || this._urlToName(url);

    try {
      console.log(chalk.cyan(`Updating baseline for: ${url}`));
      console.log(chalk.dim(`  Snapshot name: ${name}`));

      const { BrowserController } = require('../../runtime/browser-controller');
      const controller = new BrowserController();
      const snapshot = await controller.snapshot({ url });

      const imageBuffer = require('fs').readFileSync(snapshot.filePath);
      const baselinePath = this.visualRegression.saveBaseline(imageBuffer, name);

      console.log(chalk.green(`\n  ✓ Baseline updated: ${baselinePath}`));
      return { status: 'baseline_updated', name, baselinePath };
    } catch (error) {
      logger.error(`Baseline update error: ${error.message}`);
      process.exitCode = 1;
    }
  }

  _urlToName(url) {
    try {
      const u = new URL(url);
      return u.hostname.replace(/\./g, '-') + u.pathname.replace(/[/\\]/g, '-').replace(/-+$/, '') || 'index';
    } catch {
      return 'snapshot';
    }
  }
}

module.exports = { BrowserCommand };
