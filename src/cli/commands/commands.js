const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const COMMANDS_DIR = path.join(__dirname, '..', '..', 'templates', 'commands');

class CommandsCommand {
  execute(options = {}) {
    const commands = [];

    if (fs.existsSync(COMMANDS_DIR)) {
      const entries = fs.readdirSync(COMMANDS_DIR)
        .filter(f => f.endsWith('.md'))
        .map(f => {
          const name = f.replace(/\.md$/, '');
          const content = fs.readFileSync(path.join(COMMANDS_DIR, f), 'utf8');
          // Try frontmatter description first
          const descMatch = content.match(/^description:\s*(.+)$/m);
          if (descMatch) {
            return { name, title: descMatch[1].trim().replace(/^['"]|['"]$/g, '') };
          }
          // Fallback to first # heading
          const firstLine = content.split('\n').find(l => l.trim().startsWith('#'));
          const title = firstLine ? firstLine.replace(/^#+\s*/, '').trim() : name;
          return { name, title };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      commands.push(...entries);
    }

    if (options.json) {
      console.log(JSON.stringify(commands, null, 2));
      return commands;
    }

    console.log(chalk.bold(`\nSTDD Slash Commands (${commands.length})\n`));
    console.log(chalk.dim('  These are Claude Code slash commands, not CLI commands.\n'));
    for (const cmd of commands) {
      console.log(`  ${chalk.cyan(`/stdd:${cmd.name}`)} — ${cmd.title}`);
    }
    console.log('');

    return commands;
  }
}

module.exports = { CommandsCommand };
