const {
  COMMAND_ONLY_ENTRIES,
  COMMAND_FILE_BACKED_ENTRIES,
  SKILL_DRIVEN_ENTRIES,
  readFile,
  getCanonicalSlashEntries,
  getCommandFileEntriesSet,
  getSkillDirEntriesSet,
  getSlashEntriesFromCommandFiles,
  getSlashEntriesFromSkillDirs
} = require('./docs-contracts');

describe('Documentation taxonomy consistency', () => {
  it('keeps the documented command/skill counts in sync with the repository', () => {
    const commandEntries = getSlashEntriesFromCommandFiles();
    const skillEntries = getSlashEntriesFromSkillDirs();

    expect(commandEntries).toHaveLength(19);
    expect(skillEntries).toHaveLength(38);
  });

  it('keeps the slash-entry taxonomy aligned with the repository', () => {
    const commandFileEntries = getCommandFileEntriesSet();
    const skillEntries = getSkillDirEntriesSet();
    const canonicalEntries = getCanonicalSlashEntries();
    const expectedCanonicalEntries = [
      ...COMMAND_ONLY_ENTRIES,
      ...COMMAND_FILE_BACKED_ENTRIES,
      ...SKILL_DRIVEN_ENTRIES
    ].sort();

    expect(expectedCanonicalEntries).toEqual(canonicalEntries);

    for (const entry of COMMAND_ONLY_ENTRIES) {
      expect(commandFileEntries.has(entry)).toBe(true);
      expect(skillEntries.has(entry)).toBe(false);
    }

    for (const entry of COMMAND_FILE_BACKED_ENTRIES) {
      expect(commandFileEntries.has(entry)).toBe(true);
    }

    for (const entry of SKILL_DRIVEN_ENTRIES) {
      expect(skillEntries.has(entry)).toBe(true);
    }
  });

  it('keeps Chinese slash-entry docs aligned with canonical slash entries', () => {
    const canonicalEntries = getCanonicalSlashEntries();
    const docsToCheck = ['README.md', 'USAGE.md', 'docs/commands.md'];

    for (const file of docsToCheck) {
      const text = readFile(file);
      const missing = canonicalEntries.filter(entry => !text.includes(entry));

      expect(missing).toEqual([]);
    }
  });

  it('keeps CLAUDE.md taxonomy notes aligned with the repository', () => {
    const text = readFile('CLAUDE.md');

    expect(text).toContain('19 个 /stdd:* 斜杠命令');
    expect(text).toContain('38 个 Skill 定义目录');
    expect(text).toContain('入口 taxonomy（防漂移约定）');
    expect(text).toContain('command-only 快捷入口（4）');
    expect(text).toContain('command-file-backed 入口（15）');
    expect(text).toContain('skill-driven 入口（其余 25 个）');

    for (const entry of [...COMMAND_ONLY_ENTRIES, ...COMMAND_FILE_BACKED_ENTRIES]) {
      expect(text).toContain(entry);
    }
  });

  it('keeps AGENTS.md and CLAUDE_CODE_GUIDE.md high-level taxonomy notes aligned', () => {
    const agents = readFile('AGENTS.md');
    const guide = readFile('CLAUDE_CODE_GUIDE.md');

    expect(agents).toContain('全部能力入口 (42 个 = 38 Skills + 4 Command-only 快捷入口)');
    expect(agents).toContain('快捷入口 (4，仅有 Command 文件，无独立 Skill 目录)');
    expect(agents).toContain('辅助功能 (12)');
    expect(agents).toContain('constitution');

    expect(guide).toContain('.claude/commands/stdd/{指令名称}.md');
    expect(guide).toContain('.claude/skills/stdd-{指令名称}/SKILL.md');
    expect(guide).toContain('new`、`ff`、`continue`、`explore`');
    expect(guide).toContain('不要假定存在同名 Skill 目录');
  });
});
