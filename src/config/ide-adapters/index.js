/**
 * IDE Adapters
 * Generate IDE-specific configuration files for cross-platform support.
 * Supports: Claude Code, Cursor, Windsurf, VS Code (Copilot), Augment,
 *           Gemini CLI, Kiro, Codex CLI
 */

const fs = require('fs');
const path = require('path');

const STDD_WORKFLOW_BRIEF = [
  'Follow STDD lifecycle: propose -> clarify -> spec -> plan -> apply -> verify -> archive',
  'Run `stdd verify` before committing',
  'Use `stdd constitution` for quality gates',
  'Use `stdd roles consult <role> <topic>` for expert analysis',
].join('\n');

const ADAPTERS = {
  'claude-code': {
    name: 'Claude Code',
    id: 'claude-code',
    configDir: '.claude',
    templates: {
      'commands': (stddDir) => `# STDD Commands\nCommands are auto-generated from ${stddDir}/templates/commands/`,
      'CLAUDE.md': (stddDir, projectName) => `# ${projectName}\n\nThis project uses STDD Copilot Ultra for Smart Team-Driven Development.\n\n## Quick Reference\n- Init: \`stdd init\`\n- New change: \`stdd new <description>\`\n- Status: \`stdd status\`\n- Dashboard: \`stdd dashboard open\`\n- Story board: \`stdd story board\`\n- Roles consult: \`stdd roles consult <role> <topic>\`\n`,
    },
    generate(cwd, projectName, stddDir) {
      const dir = path.join(cwd, '.claude');
      fs.mkdirSync(dir, { recursive: true });
      fs.mkdirSync(path.join(dir, 'commands'), { recursive: true });
      const md = this.templates['CLAUDE.md'](stddDir, projectName);
      fs.writeFileSync(path.join(dir, 'CLAUDE.md'), md, 'utf8');
      return ['.claude/CLAUDE.md', '.claude/commands/'];
    },
  },
  'cursor': {
    name: 'Cursor',
    id: 'cursor',
    configDir: '.cursor',
    templates: {
      '.cursorrules': (stddDir, projectName) => `# ${projectName} - Cursor Rules\n\n## STDD Integration\nThis project uses STDD Copilot Ultra.\n\n### Workflow\n1. Use \`stdd new\` to start changes\n2. Follow STDD lifecycle: propose -> clarify -> spec -> plan -> apply -> verify -> archive\n3. Run \`stdd verify\` before committing\n4. Use \`stdd roles consult\` for expert analysis\n\n### Quality Gates\n- All changes must pass Constitution checks\n- Mutation testing required for complex changes\n- Evidence required for verification\n\n### Commands\n- \`stdd status\` - Check project status\n- \`stdd dashboard open\` - View dashboard\n- \`stdd story board\` - View agile board\n`,
    },
    generate(cwd, projectName, stddDir) {
      const rules = this.templates['.cursorrules'](stddDir, projectName);
      fs.writeFileSync(path.join(cwd, '.cursorrules'), rules, 'utf8');
      return ['.cursorrules'];
    },
  },
  'windsurf': {
    name: 'Windsurf',
    id: 'windsurf',
    templates: {
      '.windsurfrules': (stddDir, projectName) => `# ${projectName} - Windsurf Rules\n\n## STDD Workflow\nFollow the STDD lifecycle for all changes.\nUse \`stdd status\` and \`stdd dashboard\` to track progress.\n`,
    },
    generate(cwd, projectName, stddDir) {
      const rules = this.templates['.windsurfrules'](stddDir, projectName);
      fs.writeFileSync(path.join(cwd, '.windsurfrules'), rules, 'utf8');
      return ['.windsurfrules'];
    },
  },
  'vscode': {
    name: 'VS Code (Copilot)',
    id: 'vscode',
    configDir: '.vscode',
    templates: {
      'settings.json': () => JSON.stringify({
        'github.copilot.chat.codeGeneration.instructions': [
          { text: 'Follow STDD Copilot Ultra workflow: propose -> clarify -> spec -> plan -> apply -> verify -> archive' },
          { text: 'Run `stdd verify` before committing changes' },
          { text: 'Use `stdd constitution` for quality gate checks' },
        ],
      }, null, 2),
    },
    generate(cwd) {
      const dir = path.join(cwd, '.vscode');
      fs.mkdirSync(dir, { recursive: true });
      const settings = this.templates['settings.json']();
      const settingsPath = path.join(dir, 'settings.json');
      let existing = {};
      try { existing = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch (_) {}
      const merged = { ...existing, ...JSON.parse(settings) };
      fs.writeFileSync(settingsPath, JSON.stringify(merged, null, 2), 'utf8');
      return ['.vscode/settings.json'];
    },
  },
  'augment': {
    name: 'Augment Code',
    id: 'augment',
    configDir: '.augment',
    templates: {
      'AUGMENT.md': (stddDir, projectName) => `# ${projectName}\n\nThis project uses STDD Copilot Ultra.\n\n## Workflow\n${STDD_WORKFLOW_BRIEF}\n\n## Commands\n- \`stdd init\` — Initialize project\n- \`stdd new <desc>\` — Start a change\n- \`stdd status\` — View current state\n- \`stdd dashboard open\` — Open dashboard\n`,
    },
    generate(cwd, projectName, stddDir) {
      const dir = path.join(cwd, '.augment');
      fs.mkdirSync(dir, { recursive: true });
      const md = this.templates['AUGMENT.md'](stddDir, projectName);
      fs.writeFileSync(path.join(dir, 'AUGMENT.md'), md, 'utf8');
      return ['.augment/AUGMENT.md'];
    },
  },
  'gemini-cli': {
    name: 'Gemini CLI',
    id: 'gemini-cli',
    configDir: '.gemini',
    templates: {
      'GEMINI.md': (stddDir, projectName) => `# ${projectName}\n\nThis project uses STDD Copilot Ultra for Smart Team-Driven Development.\n\n## Workflow\n${STDD_WORKFLOW_BRIEF}\n\n## Commands\n- \`stdd init\` — Initialize project\n- \`stdd new <desc>\` — Start a change\n- \`stdd status\` — View current state\n- \`stdd roles consult <role> <topic>\` — Expert analysis\n- \`stdd dashboard open\` — Open dashboard\n\n## Quality Gates\nAll changes must pass Constitution checks (9 articles) before merge.\n`,
    },
    generate(cwd, projectName, stddDir) {
      const dir = path.join(cwd, '.gemini');
      fs.mkdirSync(dir, { recursive: true });
      const md = this.templates['GEMINI.md'](stddDir, projectName);
      fs.writeFileSync(path.join(dir, 'GEMINI.md'), md, 'utf8');
      return ['.gemini/GEMINI.md'];
    },
  },
  'kiro': {
    name: 'Kiro',
    id: 'kiro',
    configDir: '.kiro',
    templates: {
      'KIRO.md': (stddDir, projectName) => `# ${projectName}\n\nThis project uses STDD Copilot Ultra.\n\n## Workflow\n${STDD_WORKFLOW_BRIEF}\n\n## Design Specs\nSTDD manages DESIGN.md with design tokens and component specs.\nUse \`stdd design preview\` to generate HTML previews.\n`,
    },
    generate(cwd, projectName, stddDir) {
      const dir = path.join(cwd, '.kiro');
      fs.mkdirSync(dir, { recursive: true });
      const md = this.templates['KIRO.md'](stddDir, projectName);
      fs.writeFileSync(path.join(dir, 'KIRO.md'), md, 'utf8');
      return ['.kiro/KIRO.md'];
    },
  },
  'codex-cli': {
    name: 'Codex CLI',
    id: 'codex-cli',
    configDir: '.codex',
    templates: {
      'CODEX.md': (stddDir, projectName) => `# ${projectName}\n\nThis project uses STDD Copilot Ultra for Smart Team-Driven Development.\n\n## Workflow\n${STDD_WORKFLOW_BRIEF}\n\n## TDD Integration\nSTDD enforces a strict TDD cycle (Ralph Loop):\nRED -> CHECK -> GREEN -> MUTATION -> REFACTOR\nUse \`stdd apply\` and \`stdd verify\` to drive the cycle.\n\n## Agent Personas\n12 named personas available via \`stdd roles\`:\nMaya(PO), Alex(Dev), Sam(Tester), Rex(Reviewer), Wei(Architect), Shield(Security), Ops(DevOps), Luna(UX), Jordan(BA), Page(TechWriter), QC(QALead), Data(DataAnalyst)\n`,
    },
    generate(cwd, projectName, stddDir) {
      const dir = path.join(cwd, '.codex');
      fs.mkdirSync(dir, { recursive: true });
      const md = this.templates['CODEX.md'](stddDir, projectName);
      fs.writeFileSync(path.join(dir, 'CODEX.md'), md, 'utf8');
      return ['.codex/CODEX.md'];
    },
  },
};

function generateForIDE(ide, cwd, projectName, stddDir) {
  const adapter = ADAPTERS[ide];
  if (!adapter) throw new Error('Unknown IDE: ' + ide + '. Available: ' + Object.keys(ADAPTERS).join(', '));
  return adapter.generate(cwd, projectName, stddDir);
}

function generateAll(cwd, projectName, stddDir) {
  const results = {};
  for (const [ide, adapter] of Object.entries(ADAPTERS)) {
    try {
      results[ide] = adapter.generate(cwd, projectName, stddDir);
    } catch (e) {
      results[ide] = { error: e.message };
    }
  }
  return results;
}

function listAdapters() {
  return Object.entries(ADAPTERS).map(([id, a]) => ({ id, name: a.name }));
}

module.exports = { ADAPTERS, generateForIDE, generateAll, listAdapters };
