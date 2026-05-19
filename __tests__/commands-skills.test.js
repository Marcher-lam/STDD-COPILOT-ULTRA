const fs = require('fs');
const path = require('path');
const os = require('os');

describe('CommandsCommand', () => {
  let tmpDir;
  let CommandsCommand;
  let originalDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-commands-test-'));
    originalDir = process.cwd();

    // Create a mock commands dir
    const commandsDir = path.join(tmpDir, 'src', 'cli', 'templates', 'commands');
    fs.mkdirSync(commandsDir, { recursive: true });
    fs.writeFileSync(path.join(commandsDir, 'init.md'), '# Init Command\nInitialize STDD');
    fs.writeFileSync(path.join(commandsDir, 'apply.md'), '# Apply Command\nApply changes');

    // Override the COMMANDS_DIR by re-requiring with a different approach
    jest.resetModules();
    jest.doMock('chalk', () => ({
      bold: (s) => s,
      cyan: (s) => s,
      dim: (s) => s,
    }));

    // Create the command pointing to our test dir
    jest.doMock('../src/cli/commands/commands', () => {
      const mod = jest.requireActual('../src/cli/commands/commands');
      // Can't easily override the const, so we test the real one
      return mod;
    });

    CommandsCommand = require('../src/cli/commands/commands').CommandsCommand;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    process.chdir(originalDir);
  });

  test('execute returns array of commands', () => {
    const cmd = new CommandsCommand();
    const result = cmd.execute({ json: true });
    expect(Array.isArray(result)).toBe(true);
  });

  test('each command has name and title', () => {
    const cmd = new CommandsCommand();
    const result = cmd.execute({ json: true });
    for (const entry of result) {
      expect(entry.name).toBeDefined();
      expect(entry.title).toBeDefined();
    }
  });

  test('non-json mode outputs to console', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation();
    const cmd = new CommandsCommand();
    cmd.execute({});
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('SkillsCommand', () => {
  let SkillsCommand;

  beforeEach(() => {
    jest.resetModules();
    jest.doMock('chalk', () => ({
      bold: (s) => s,
      cyan: (s) => s,
      dim: (s) => s,
    }));
    SkillsCommand = require('../src/cli/commands/skills').SkillsCommand;
  });

  test('execute returns array of skills', () => {
    const cmd = new SkillsCommand();
    const result = cmd.execute({ json: true });
    expect(Array.isArray(result)).toBe(true);
  });

  test('each skill has name', () => {
    const cmd = new SkillsCommand();
    const result = cmd.execute({ json: true });
    for (const skill of result) {
      expect(skill.name).toBeDefined();
      expect(typeof skill.name).toBe('string');
    }
  });

  test('skills are sorted alphabetically', () => {
    const cmd = new SkillsCommand();
    const result = cmd.execute({ json: true });
    if (result.length > 1) {
      const names = result.map(s => s.name);
      const sorted = [...names].sort();
      expect(names).toEqual(sorted);
    }
  });

  test('non-json mode outputs to console', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation();
    const cmd = new SkillsCommand();
    cmd.execute({});
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
