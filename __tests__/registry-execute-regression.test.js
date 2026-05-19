const fs = require('fs');
const path = require('path');
const os = require('os');
const { SpecGenerator } = require('../src/cli/commands/spec-generator');
const { TddInitCommand } = require('../src/cli/commands/tdd-init');
const { StartersCommand } = require('../src/cli/commands/starters');
const { ContractCommand } = require('../src/cli/commands/contract');

/**
 * Regression tests for bugs found during end-to-end workflow testing.
 * These commands crashed because CommandLoader dispatches via execute(),
 * but the target classes lacked an execute method.
 */
describe('Registry execute() regression tests', () => {
  let tempDir;
  let origCwd;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-regression-'));
    fs.mkdirSync(path.join(tempDir, 'stdd', 'changes', 'my-change', 'specs'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'stdd', 'changes', 'my-change', 'tasks.md'),
      '- [ ] TASK-001: Do something\n- [x] TASK-002: Done task\n'
    );
    fs.writeFileSync(
      path.join(tempDir, 'stdd', 'changes', 'my-change', 'proposal.md'),
      '# Proposal: test\n'
    );
    origCwd = process.cwd();
    process.chdir(tempDir);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(origCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log.mockRestore();
    console.error.mockRestore();
  });

  describe('SpecGenerator.execute()', () => {
    it('has execute method', () => {
      const gen = new SpecGenerator();
      expect(typeof gen.execute).toBe('function');
    });

    it('generates specs from tasks', async () => {
      const gen = new SpecGenerator();
      const result = await gen.execute('my-change');
      expect(result.generated.length).toBeGreaterThan(0);
    });
  });

  describe('TddInitCommand.execute() with undefined cwd', () => {
    it('does not crash when cwd is undefined', async () => {
      const cmd = new TddInitCommand();
      await expect(cmd.execute(undefined)).resolves.not.toThrow();
    });

    it('does not crash when cwd is null', async () => {
      const cmd = new TddInitCommand();
      await expect(cmd.execute(null)).resolves.not.toThrow();
    });
  });

  describe('StartersCommand.execute()', () => {
    it('has execute method', () => {
      const cmd = new StartersCommand();
      expect(typeof cmd.execute).toBe('function');
    });

    it('routes list subcommand', async () => {
      const cmd = new StartersCommand();
      await expect(cmd.execute('list')).resolves.not.toThrow();
    });

    it('defaults to list for unknown subcommand', async () => {
      const cmd = new StartersCommand();
      await expect(cmd.execute()).resolves.not.toThrow();
    });
  });

  describe('ContractCommand.execute()', () => {
    it('has execute method', () => {
      const cmd = new ContractCommand(tempDir);
      expect(typeof cmd.execute).toBe('function');
    });

    it('routes generate action', async () => {
      const cmd = new ContractCommand(tempDir);
      try {
        await cmd.execute('generate', 'my-change');
      } catch (e) {
        // Expected: api-spec not found is OK - we're testing routing not data
        expect(e.message).toMatch(/not found|spec/i);
      }
    });

    it('routes verify action', async () => {
      const cmd = new ContractCommand(tempDir);
      try {
        await cmd.execute('verify', 'my-change');
      } catch (e) {
        // Expected: contracts dir not found is OK - we're testing routing not data
        expect(e.message).toMatch(/not found|contract/i);
      }
    });

    it('throws for unknown action', async () => {
      const cmd = new ContractCommand(tempDir);
      await expect(cmd.execute('bogus', 'my-change')).rejects.toThrow('Unknown contract action');
    });
  });
});
