const fs = require('fs');
const path = require('path');
const os = require('os');

jest.mock('child_process', () => ({
  spawnSync: jest.fn(),
}));

const { SudoExecutor } = require('../src/runtime/sudolang-executor');

describe('SudoExecutor', () => {
  let logSpy;
  let errorSpy;
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-sudo-'));
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    jest.clearAllMocks();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('initializes with cwd and parser', () => {
      const executor = new SudoExecutor(tmpDir);
      expect(executor.cwd).toBe(tmpDir);
      expect(executor.parser).toBeDefined();
    });

    it('defaults to process.cwd()', () => {
      const executor = new SudoExecutor();
      expect(executor.cwd).toBe(process.cwd());
    });
  });

  describe('prepareEnv', () => {
    it('creates temp directory if not exists', () => {
      const executor = new SudoExecutor(tmpDir);
      executor.prepareEnv();
      expect(fs.existsSync(executor.tempDir)).toBe(true);
    });

    it('does not error if temp directory already exists', () => {
      const executor = new SudoExecutor(tmpDir);
      fs.mkdirSync(executor.tempDir, { recursive: true });
      expect(() => executor.prepareEnv()).not.toThrow();
    });
  });

  describe('generateTestScript', () => {
    it('generates assert-based test code', () => {
      const executor = new SudoExecutor(tmpDir);
      const code = executor.generateTestScript({});
      expect(code).toContain('require(\'assert\')');
      expect(code).toContain('Starting SudoLang Simulation');
    });

    it('generates interface validations', () => {
      const executor = new SudoExecutor(tmpDir);
      const code = executor.generateTestScript({
        interfaces: [{ name: 'UserService' }],
      });
      expect(code).toContain('Validating Interface: UserService');
      expect(code).toContain('typeof mockInstance');
    });

    it('generates constraint checks for unique', () => {
      const executor = new SudoExecutor(tmpDir);
      const code = executor.generateTestScript({
        constraints: [{ description: 'IDs must be unique', body: 'email should be unique' }],
      });
      expect(code).toContain('Checking Constraint: IDs must be unique');
      expect(code).toContain('Set');
    });

    it('generates constraint checks for positive', () => {
      const executor = new SudoExecutor(tmpDir);
      const code = executor.generateTestScript({
        constraints: [{ description: 'age must be positive', body: 'age should be positive' }],
      });
      expect(code).toContain('val > 0');
    });

    it('generates goal scenarios', () => {
      const executor = new SudoExecutor(tmpDir);
      const code = executor.generateTestScript({
        goals: [{ description: 'User can login' }],
      });
      expect(code).toContain('Simulating Goal: User can login');
      expect(code).toContain('success');
    });

    it('handles empty data', () => {
      const executor = new SudoExecutor(tmpDir);
      const code = executor.generateTestScript({
        interfaces: [],
        constraints: [],
        goals: [],
      });
      expect(code).toContain('require(\'assert\')');
    });
  });

  describe('run', () => {
    const { spawnSync } = require('child_process');

    it('returns success on zero exit code', () => {
      spawnSync.mockReturnValue({ status: 0 });
      const executor = new SudoExecutor(tmpDir);
      const result = executor.run({ interfaces: [], constraints: [], goals: [] });
      expect(result.success).toBe(true);
    });

    it('returns failure on non-zero exit code', () => {
      spawnSync.mockReturnValue({ status: 1 });
      const executor = new SudoExecutor(tmpDir);
      const result = executor.run({ interfaces: [], constraints: [], goals: [] });
      expect(result.success).toBe(false);
      expect(result.error).toContain('exit code 1');
    });

    it('cleans up temp test file', () => {
      spawnSync.mockReturnValue({ status: 0 });
      const executor = new SudoExecutor(tmpDir);
      executor.run({});
      // Temp file should be cleaned — list tempDir/stdd/runtime/tmp
      const tmpFiles = fs.readdirSync(executor.tempDir).filter(f => f.startsWith('sudo-test-'));
      expect(tmpFiles.length).toBe(0);
    });

    it('handles spawn error gracefully', () => {
      spawnSync.mockReturnValue({ status: null });
      const executor = new SudoExecutor(tmpDir);
      const result = executor.run({});
      // status null means signal killed or error
      expect(result.success).toBe(false);
    });
  });
});
