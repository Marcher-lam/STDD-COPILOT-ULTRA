const { BrowserCommand } = require('../src/cli/commands/browser');

jest.mock('../src/runtime/browser-controller', () => ({
  BrowserController: jest.fn().mockImplementation(() => ({
    snapshot: jest.fn(),
    inspect: jest.fn(),
  })),
}));
jest.mock('../src/runtime/browser-doctor', () => ({
  BrowserDoctor: jest.fn().mockImplementation(() => ({
    check: jest.fn(),
  })),
}));
jest.mock('chalk', () => {
  const fn = (...args) => args.join('');
  fn.bold = fn;
  fn.green = fn;
  fn.yellow = fn;
  fn.cyan = fn;
  fn.red = fn;
  fn.dim = fn;
  return fn;
});

describe('BrowserCommand', () => {
  let logSpy;
  let errorSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('exports BrowserCommand class', () => {
    expect(BrowserCommand).toBeDefined();
    expect(typeof BrowserCommand).toBe('function');
  });

  it('constructs with cwd and controller', () => {
    const cmd = new BrowserCommand('/tmp');
    expect(cmd.cwd).toBe('/tmp');
    expect(cmd.controller).toBeDefined();
  });

  describe('execute', () => {
    it('delegates snapshot action', async () => {
      const cmd = new BrowserCommand('/tmp');
      cmd.snapshot = jest.fn().mockResolvedValue({ url: 'http://test' });
      await cmd.execute('snapshot', 'http://test.com');
      expect(cmd.snapshot).toHaveBeenCalledWith('http://test.com', {});
    });

    it('delegates inspect action', async () => {
      const cmd = new BrowserCommand('/tmp');
      cmd.inspect = jest.fn().mockResolvedValue({});
      await cmd.execute('inspect', 'http://test.com');
      expect(cmd.inspect).toHaveBeenCalledWith('http://test.com', {});
    });

    it('delegates doctor action', async () => {
      const cmd = new BrowserCommand('/tmp');
      cmd.doctor = jest.fn();
      await cmd.execute('doctor', null, {});
      expect(cmd.doctor).toHaveBeenCalledWith({});
    });

    it('prints usage for unknown action', () => {
      const cmd = new BrowserCommand('/tmp');
      cmd.execute('unknown');
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Usage'));
    });
  });

  describe('snapshot', () => {
    it('returns result on success', async () => {
      const cmd = new BrowserCommand('/tmp');
      cmd.controller.snapshot.mockResolvedValue({
        relativePath: 'snap.html',
        url: 'http://test.com',
        title: 'Test',
      });
      const result = await cmd.snapshot('http://test.com');
      expect(result.relativePath).toBe('snap.html');
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Snapshot saved'));
    });

    it('handles not installed error', async () => {
      const cmd = new BrowserCommand('/tmp');
      cmd.controller.snapshot.mockRejectedValue(new Error('playwright not installed'));
      await cmd.snapshot('http://test.com');
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Browser Error'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Tip'));
      expect(process.exitCode).toBe(1);
    });

    it('handles generic error', async () => {
      const cmd = new BrowserCommand('/tmp');
      cmd.controller.snapshot.mockRejectedValue(new Error('timeout'));
      await cmd.snapshot('http://test.com');
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('timeout'));
      expect(process.exitCode).toBe(1);
    });
  });

  describe('inspect', () => {
    it('returns result on success', async () => {
      const cmd = new BrowserCommand('/tmp');
      cmd.controller.inspect.mockResolvedValue({ title: 'Inspected' });
      const result = await cmd.inspect('http://test.com');
      expect(result.title).toBe('Inspected');
    });

    it('handles error', async () => {
      const cmd = new BrowserCommand('/tmp');
      cmd.controller.inspect.mockRejectedValue(new Error('network error'));
      await cmd.inspect('http://test.com');
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Inspection Error'));
      expect(process.exitCode).toBe(1);
    });
  });

  describe('doctor', () => {
    it('outputs JSON when options.json', () => {
      const { BrowserDoctor } = require('../src/runtime/browser-doctor');
      const mockResult = {
        checks: [{ name: 'playwright', status: 'pass' }],
        suggestions: [],
        status: 'pass',
      };
      BrowserDoctor.mockImplementation(() => ({
        check: jest.fn().mockReturnValue(mockResult),
      }));

      const cmd = new BrowserCommand('/tmp');
      const result = cmd.doctor({ json: true });
      expect(result.status).toBe('pass');
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('pass'));
    });

    it('prints check results in text mode', () => {
      const { BrowserDoctor } = require('../src/runtime/browser-doctor');
      const mockResult = {
        checks: [
          { name: 'playwright', status: 'pass' },
          { name: 'browsers', status: 'fail', message: 'not installed' },
        ],
        suggestions: ['npx playwright install'],
        status: 'fail',
      };
      BrowserDoctor.mockImplementation(() => ({
        check: jest.fn().mockReturnValue(mockResult),
      }));

      const cmd = new BrowserCommand('/tmp');
      const result = cmd.doctor({});
      expect(result.status).toBe('fail');
      expect(process.exitCode).toBe(1);
    });

    it('handles all-pass scenario', () => {
      const { BrowserDoctor } = require('../src/runtime/browser-doctor');
      const mockResult = {
        checks: [{ name: 'playwright', status: 'pass' }],
        suggestions: [],
        status: 'pass',
      };
      BrowserDoctor.mockImplementation(() => ({
        check: jest.fn().mockReturnValue(mockResult),
      }));

      const cmd = new BrowserCommand('/tmp');
      const prevExitCode = process.exitCode;
      cmd.doctor({});
      expect(process.exitCode).toBe(prevExitCode);
    });
  });
});
