const { BrowserController } = require('../../runtime/browser-controller');
const { BrowserDoctor } = require('../../runtime/browser-doctor');
const chalk = require('chalk');

class BrowserCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.controller = new BrowserController();
  }

  execute(action, target, options = {}) {
    if (action === 'snapshot') {
      return this.snapshot(target, options);
    } else if (action === 'inspect') {
      return this.inspect(target, options);
    } else if (action === 'doctor') {
      return this.doctor(options);
    } else {
      console.log(chalk.yellow("Usage: stdd browser <snapshot|inspect|doctor> <url>"));
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
      console.error(chalk.red(`Browser Error: ${error.message}`));
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
      console.error(chalk.red(`Inspection Error: ${error.message}`));
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
}

module.exports = { BrowserCommand };
