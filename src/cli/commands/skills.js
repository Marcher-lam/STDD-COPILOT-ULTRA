const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const SKILLS_DIR = path.join(__dirname, '..', '..', 'templates', 'skills', 'stdd');

class SkillsCommand {
  execute(options = {}) {
    if (!fs.existsSync(SKILLS_DIR)) {
      console.log(chalk.yellow('No skills directory found.'));
      return [];
    }

    const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => {
        const skillPath = path.join(SKILLS_DIR, e.name, 'SKILL.md');
        let description = '';
        if (fs.existsSync(skillPath)) {
          const content = fs.readFileSync(skillPath, 'utf8');
          // Strip YAML frontmatter if present
          const stripped = content.replace(/^---[\s\S]*?---\n?/, '');
          const firstLine = stripped.split('\n').find(l => l.trim() && !l.startsWith('#') && !l.startsWith('>') && l.trim() !== '---');
          if (firstLine) description = firstLine.trim().replace(/^[-*>]?\s*/, '');
          // Fallback: try to extract from frontmatter description field
          if (!description) {
            const descMatch = content.match(/^description:\s*(.+)$/m);
            if (descMatch) description = descMatch[1].trim().replace(/^['"]|['"]$/g, '');
          }
        }
        return { name: e.name, description };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    if (options.json) {
      console.log(JSON.stringify(entries, null, 2));
      return entries;
    }

    console.log(chalk.bold(`\nSTDD Skills (${entries.length})\n`));
    for (const skill of entries) {
      console.log(`  ${chalk.cyan(`/stdd:${skill.name}`)}${skill.description ? chalk.dim(` — ${skill.description}`) : ''}`);
    }
    console.log('');

    return entries;
  }
}

module.exports = { SkillsCommand };
