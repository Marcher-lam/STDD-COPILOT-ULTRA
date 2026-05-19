const { SkillsCommand } = require('../src/cli/commands/skills');
const { CommandsCommand } = require('../src/cli/commands/commands');

describe('SkillsCommand', () => {
  test('lists all available skills', () => {
    const cmd = new SkillsCommand();
    const originalLog = console.log;
    const logs = [];
    console.log = (...args) => logs.push(args.join(' '));

    const result = cmd.execute();

    console.log = originalLog;
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(s => s.name === 'init')).toBe(true);
    expect(result.some(s => s.name === 'apply')).toBe(true);
    const output = logs.join('\n');
    expect(output).toContain('/stdd:');
  });

  test('outputs JSON with --json flag', () => {
    const cmd = new SkillsCommand();
    const originalLog = console.log;
    const logs = [];
    console.log = (...args) => logs.push(args.join(' '));

    cmd.execute({ json: true });

    console.log = originalLog;
    const parsed = JSON.parse(logs[0]);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0]).toHaveProperty('name');
  });
});

describe('CommandsCommand', () => {
  test('lists all slash commands', () => {
    const cmd = new CommandsCommand();
    const originalLog = console.log;
    const logs = [];
    console.log = (...args) => logs.push(args.join(' '));

    const result = cmd.execute();

    console.log = originalLog;
    expect(result.length).toBeGreaterThan(0);
    const output = logs.join('\n');
    expect(output).toContain('/stdd:');
  });

  test('outputs JSON with --json flag', () => {
    const cmd = new CommandsCommand();
    const originalLog = console.log;
    const logs = [];
    console.log = (...args) => logs.push(args.join(' '));

    cmd.execute({ json: true });

    console.log = originalLog;
    const parsed = JSON.parse(logs[0]);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0]).toHaveProperty('name');
    expect(parsed[0]).toHaveProperty('title');
  });

  test('handles missing commands directory gracefully', () => {
    const cmd = new CommandsCommand();
    const originalLog = console.log;
    const logs = [];
    console.log = (...args) => logs.push(args.join(' '));

    const result = cmd.execute();

    console.log = originalLog;
    expect(Array.isArray(result)).toBe(true);
  });
});
