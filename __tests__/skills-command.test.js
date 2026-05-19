const fs = require('fs');
const { SkillsCommand } = require('../src/cli/commands/skills');

jest.mock('chalk', () => {
  const fn = (...args) => args.join('');
  fn.bold = fn;
  fn.green = fn;
  fn.yellow = fn;
  fn.cyan = fn;
  fn.dim = fn;
  return fn;
});

describe('SkillsCommand', () => {
  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('exports SkillsCommand class', () => {
    expect(SkillsCommand).toBeDefined();
    expect(typeof SkillsCommand).toBe('function');
  });

  it('returns entries from real skills directory', () => {
    const cmd = new SkillsCommand();
    const result = cmd.execute();
    expect(Array.isArray(result)).toBe(true);
    // Project has skills directories
    if (result.length > 0) {
      expect(result[0]).toHaveProperty('name');
    }
  });

  it('returns entries with JSON output', () => {
    const cmd = new SkillsCommand();
    const result = cmd.execute({ json: true });
    expect(Array.isArray(result)).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(expect.any(String));
    const output = logSpy.mock.calls[0][0];
    expect(output).toContain('[');
  });

  it('handles missing skills directory', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);

    const cmd = new SkillsCommand();
    const result = cmd.execute();
    expect(result).toEqual([]);

    fs.existsSync.mockRestore();
  });

  it('extracts description from YAML frontmatter description field', () => {
    const pathModule = require('path');

    // The actual SKILLS_DIR as resolved from src/cli/commands/skills.js
    const SKILLS_DIR = pathModule.resolve(__dirname, '..', 'src', 'cli', 'commands', '..', '..', 'templates', 'skills', 'stdd');
    const mockSkillPath = pathModule.join(SKILLS_DIR, 'mock-frontmatter-skill', 'SKILL.md');

    const origExistsSync = fs.existsSync;
    const origReaddirSync = fs.readdirSync;
    const origReadFileSync = fs.readFileSync;

    jest.spyOn(fs, 'existsSync').mockImplementation((p) => {
      if (p === SKILLS_DIR) return true;
      if (p === mockSkillPath) return true;
      return origExistsSync(p);
    });

    jest.spyOn(fs, 'readdirSync').mockImplementation((p, opts) => {
      if (p === SKILLS_DIR) {
        return [{ name: 'mock-frontmatter-skill', isDirectory: () => true }];
      }
      return origReaddirSync(p, opts);
    });

    jest.spyOn(fs, 'readFileSync').mockImplementation((p, enc) => {
      if (p === mockSkillPath) {
        // Only frontmatter description, no body text lines
        return '---\ndescription: "Frontmatter only skill"\n---\n';
      }
      return origReadFileSync(p, enc);
    });

    const cmd = new SkillsCommand();
    const result = cmd.execute();
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'mock-frontmatter-skill',
          description: 'Frontmatter only skill',
        }),
      ])
    );

    fs.existsSync.mockRestore();
    fs.readdirSync.mockRestore();
    fs.readFileSync.mockRestore();
  });
});
