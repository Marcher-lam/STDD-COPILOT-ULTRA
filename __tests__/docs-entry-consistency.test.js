const fs = require('fs');
const path = require('path');

function readFile(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

function getSlashEntriesFromCommandFiles() {
  const dir = path.join(__dirname, '..', '.claude', 'commands', 'stdd');
  return fs.readdirSync(dir)
    .filter(name => name.endsWith('.md'))
    .map(name => `/stdd:${name.replace(/\.md$/, '')}`)
    .sort();
}

function getSlashEntriesFromSkillDirs() {
  const dir = path.join(__dirname, '..', '.claude', 'skills');
  return fs.readdirSync(dir)
    .filter(name => name.startsWith('stdd-'))
    .map(name => `/stdd:${name.replace(/^stdd-/, '')}`)
    .sort();
}

function getCanonicalSlashEntries() {
  return [...new Set([
    ...getSlashEntriesFromCommandFiles(),
    ...getSlashEntriesFromSkillDirs()
  ])].sort();
}

describe('Documentation entry consistency', () => {
  it('keeps the documented command/skill counts in sync with the repository', () => {
    const commandEntries = getSlashEntriesFromCommandFiles();
    const skillEntries = getSlashEntriesFromSkillDirs();

    expect(commandEntries).toHaveLength(19);
    expect(skillEntries).toHaveLength(38);
  });

  it('keeps README.md, USAGE.md, and docs/commands.md aligned with canonical slash entries', () => {
    const canonicalEntries = getCanonicalSlashEntries();
    const docsToCheck = ['README.md', 'USAGE.md', 'docs/commands.md'];

    for (const file of docsToCheck) {
      const text = readFile(file);
      const missing = canonicalEntries.filter(entry => !text.includes(entry));

      expect(missing).toEqual([]);
    }
  });
});
