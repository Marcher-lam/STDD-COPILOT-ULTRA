const chalk = require('chalk');
const { WaiverManager } = require('./waiver-manager');

class WaiverManagerCommand {
  constructor(cwd = process.cwd()) {
    this.manager = new WaiverManager(cwd);
  }

  execute(action = 'list', options = {}) {
    switch (action || 'list') {
      case 'list':
        return this.list(options);
      case 'add':
      case 'waive':
        return this.add(options);
      case 'remove':
      case 'delete':
        return this.remove(options);
      default:
        throw new Error(`Unknown waiver-manager action: ${action}. Supported: list, add, remove.`);
    }
  }

  list(options = {}) {
    const waivers = this.manager.list();
    if (options.json) {
      console.log(JSON.stringify({ waivers }, null, 2));
      return waivers;
    }

    console.log(chalk.bold('\nConstitution Waivers\n'));
    if (waivers.length === 0) {
      console.log('  No waivers found.\n');
      return waivers;
    }

    for (const waiver of waivers) {
      console.log(`  Article ${chalk.cyan(String(waiver.article))}: ${waiver.reason}`);
      console.log(chalk.dim(`    valid until ${waiver.valid_until || waiver.validUntil}\n`));
    }
    return waivers;
  }

  add(options = {}) {
    const result = this.manager.add({
      article: options.article,
      reason: options.reason,
      days: options.days ? Number(options.days) : 30,
      force: Boolean(options.force),
    });

    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(chalk.green(`Waiver added for Article ${result.article}.`));
    return result;
  }

  remove(options = {}) {
    if (!options.article) throw new Error('--article is required.');
    const removed = this.manager.remove(options.article);
    const result = { removed };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(chalk.green(`Removed ${removed} waiver(s).`));
    return result;
  }
}

module.exports = { WaiverManagerCommand };
