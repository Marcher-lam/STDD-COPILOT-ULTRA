const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');

const COMMAND_ONLY_ENTRIES = [
  '/stdd:new',
  '/stdd:ff',
  '/stdd:continue',
  '/stdd:explore'
];

const COMMAND_FILE_BACKED_ENTRIES = [
  '/stdd:init',
  '/stdd:propose',
  '/stdd:clarify',
  '/stdd:confirm',
  '/stdd:spec',
  '/stdd:plan',
  '/stdd:apply',
  '/stdd:execute',
  '/stdd:verify',
  '/stdd:archive',
  '/stdd:final-doc',
  '/stdd:graph',
  '/stdd:brainstorm',
  '/stdd:issue',
  '/stdd:constitution'
];

const SKILL_DRIVEN_ENTRIES = [
  '/stdd:api-spec',
  '/stdd:certainty',
  '/stdd:commit',
  '/stdd:complexity',
  '/stdd:context',
  '/stdd:contract',
  '/stdd:factory',
  '/stdd:guard',
  '/stdd:help',
  '/stdd:iterate',
  '/stdd:learn',
  '/stdd:memory',
  '/stdd:metrics',
  '/stdd:mock',
  '/stdd:mutation',
  '/stdd:outside-in',
  '/stdd:parallel',
  '/stdd:prp',
  '/stdd:roles',
  '/stdd:schema',
  '/stdd:supervisor',
  '/stdd:turbo',
  '/stdd:user-test',
  '/stdd:validate',
  '/stdd:vision'
];

const CANONICAL_CLI_ENTRIES = [
  'stdd init',
  'stdd init /path/to/project',
  'stdd init --force',
  'stdd list',
  'stdd list --specs',
  'stdd list --archived',
  'stdd list --json',
  'stdd status',
  'stdd status add-dark-mode',
  'stdd new change add-dark-mode',
  'stdd new spec auth',
  'stdd skills',
  'stdd skills --phase 4',
  'stdd commands',
  'stdd constitution',
  'stdd constitution show 2',
  'stdd constitution check',
  'stdd hooks install',
  'stdd hooks verify',
  'stdd hooks status',
  'stdd hooks disable',
  'stdd hooks enable'
];

function readFile(relativePath) {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

function getSlashEntriesFromCommandFiles() {
  const dir = path.join(REPO_ROOT, '.claude', 'commands', 'stdd');
  return fs.readdirSync(dir)
    .filter(name => name.endsWith('.md'))
    .map(name => `/stdd:${name.replace(/\.md$/, '')}`)
    .sort();
}

function getSlashEntriesFromSkillDirs() {
  const dir = path.join(REPO_ROOT, '.claude', 'skills');
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

function getSkillDirEntriesSet() {
  return new Set(getSlashEntriesFromSkillDirs());
}

function getCommandFileEntriesSet() {
  return new Set(getSlashEntriesFromCommandFiles());
}

module.exports = {
  COMMAND_ONLY_ENTRIES,
  COMMAND_FILE_BACKED_ENTRIES,
  SKILL_DRIVEN_ENTRIES,
  CANONICAL_CLI_ENTRIES,
  readFile,
  getCanonicalSlashEntries,
  getCommandFileEntriesSet,
  getSkillDirEntriesSet,
  getSlashEntriesFromCommandFiles,
  getSlashEntriesFromSkillDirs
};
