const { commandRegistry } = require('../src/cli/registry/command-registry');

describe('commandRegistry deep coverage', () => {
  test('every entry has required fields', () => {
    for (const cmd of commandRegistry) {
      expect(typeof cmd.name).toBe('string');
      expect(cmd.name.length).toBeGreaterThan(0);
      expect(typeof cmd.description).toBe('string');
      expect(cmd.description.length).toBeGreaterThan(0);
    }
  });

  test('options arrays have correct shape when present', () => {
    for (const cmd of commandRegistry) {
      if (cmd.options) {
        expect(Array.isArray(cmd.options)).toBe(true);
        for (const opt of cmd.options) {
          expect(typeof opt.flags).toBe('string');
          expect(typeof opt.description).toBe('string');
        }
      }
    }
  });

  test('subcommand entries have valid nested structure', () => {
    const withSubs = commandRegistry.filter(c => c.subcommands);
    expect(withSubs.length).toBeGreaterThan(0);

    for (const parent of withSubs) {
      for (const sub of parent.subcommands) {
        expect(sub.name).toBeDefined();
        expect(sub.description).toBeDefined();
        if (sub.options) {
          for (const opt of sub.options) {
            expect(typeof opt.flags).toBe('string');
          }
        }
      }
    }
  });

  test('action strings are non-empty when present', () => {
    for (const cmd of commandRegistry) {
      if (cmd.action) {
        expect(typeof cmd.action).toBe('string');
        expect(cmd.action.length).toBeGreaterThan(0);
      }
      if (cmd.subcommands) {
        for (const sub of cmd.subcommands) {
          if (sub.action) {
            expect(typeof sub.action).toBe('string');
            expect(sub.action.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  test('init command mapper resolves path correctly', () => {
    const initCmd = commandRegistry.find(c => c.name === 'init [path]');
    expect(initCmd).toBeDefined();
    expect(typeof initCmd.mapper).toBe('function');
    const result = initCmd.mapper('my-project', { force: true });
    expect(result[0]).toContain('my-project');
    expect(result[1]).toEqual({ force: true });
  });

  test('init command mapper defaults to cwd', () => {
    const initCmd = commandRegistry.find(c => c.name === 'init [path]');
    const result = initCmd.mapper(undefined, {});
    expect(result[0]).toBe(process.cwd());
  });

  test('spinner and success functions work when defined', () => {
    const withFnSpinner = commandRegistry.filter(c => typeof c.spinner === 'function');
    for (const cmd of withFnSpinner) {
      const result = cmd.spinner('test-name');
      expect(typeof result).toBe('string');
      expect(result).toContain('test-name');
    }

    const withFnSuccess = commandRegistry.filter(c => typeof c.success === 'function');
    for (const cmd of withFnSuccess) {
      const result = cmd.success({ changeName: 'test-change' });
      expect(typeof result).toBe('string');
    }
  });

  test('new change subcommand has spinner and success functions', () => {
    const newCmd = commandRegistry.find(c => c.name === 'new');
    expect(newCmd).toBeDefined();
    expect(newCmd.subcommands).toBeDefined();
    const changeSub = newCmd.subcommands.find(s => s.name === 'change <name>');
    expect(changeSub).toBeDefined();
    expect(typeof changeSub.spinner).toBe('function');
    expect(typeof changeSub.success).toBe('function');
    expect(changeSub.spinner('dark-mode')).toContain('dark-mode');
    expect(changeSub.success('dark-mode')).toContain('dark-mode');
  });

  test('ff command success function handles result object', () => {
    const ffCmd = commandRegistry.find(c => c.name === 'ff <description>');
    expect(ffCmd).toBeDefined();
    expect(typeof ffCmd.success).toBe('function');
    const msg = ffCmd.success({ changeName: 'add-feature' });
    expect(msg).toContain('add-feature');
  });

  test('product-proposal has spinner and success strings', () => {
    const pp = commandRegistry.find(c => c.name === 'product-proposal');
    expect(pp).toBeDefined();
    expect(typeof pp.spinner).toBe('string');
    expect(typeof pp.success).toBe('string');
  });

  test('helpText entries are non-empty strings when present', () => {
    for (const cmd of commandRegistry) {
      if (cmd.helpText) {
        expect(typeof cmd.helpText).toBe('string');
        expect(cmd.helpText.length).toBeGreaterThan(0);
      }
    }
  });

  test('contains expected core commands', () => {
    const names = commandRegistry.map(c => c.name.split(' ')[0]);
    const core = ['init', 'update', 'apply', 'verify', 'archive', 'guard', 'metrics'];
    for (const name of core) {
      expect(names).toContain(name);
    }
  });

  test('alias is defined for list command', () => {
    const listCmd = commandRegistry.find(c => c.name === 'list');
    expect(listCmd).toBeDefined();
    expect(listCmd.alias).toBe('ls');
  });

  test('method field on subcommands works correctly', () => {
    const newCmd = commandRegistry.find(c => c.name === 'new');
    const changeSub = newCmd.subcommands.find(s => s.name === 'change <name>');
    expect(changeSub.method).toBe('createChange');
  });
});
