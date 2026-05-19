const fs = require('fs');
const path = require('path');
const os = require('os');

jest.mock('chalk', () => {
  const fn = (...args) => args.join('');
  fn.bold = fn;
  fn.green = fn;
  fn.yellow = fn;
  fn.red = fn;
  fn.cyan = fn;
  fn.blue = fn;
  fn.dim = fn;
  return fn;
});

const { ProgressCommand } = require('../src/cli/commands/progress');

function makeTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-prog-cmd-'));
}

function makeStdd(root) {
  const stdd = path.join(root, 'stdd');
  fs.mkdirSync(stdd, { recursive: true });
  return stdd;
}

describe('ProgressCommand', () => {
  let cmd;
  let logSpy;
  let errorSpy;
  let origCwd;
  let exitSpy;

  beforeEach(() => {
    cmd = new ProgressCommand();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    origCwd = process.cwd;
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => { process.exitCode = code; });
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
    process.cwd = origCwd;
    process.exitCode = 0;
  });

  describe('execute', () => {
    it('exits when stdd not initialized', () => {
      const root = makeTmp();
      process.cwd = () => root;
      cmd.execute();
      expect(process.exitCode).toBe(1);
      const output = errorSpy.mock.calls.map(c => c.join('')).join('\n');
      expect(output).toContain('STDD not initialized');
    });

    it('clears progress log with --clear', () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      const { SessionProgress } = require('../src/utils/session-progress');
      const p = new SessionProgress(stdd);
      p.start('test');
      process.cwd = () => root;

      cmd.execute({ clear: true });

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      expect(output).toContain('cleared');
    });

    it('shows summary with --summary', () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      const { SessionProgress } = require('../src/utils/session-progress');
      const p = new SessionProgress(stdd);
      const entry = p.start('init');
      p.complete(entry.id);
      process.cwd = () => root;

      cmd.execute({ summary: true });

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      expect(output).toContain('Commands:');
      expect(output).toContain('Completed');
    });

    it('shows summary JSON with --summary --json', () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      const { SessionProgress } = require('../src/utils/session-progress');
      const p = new SessionProgress(stdd);
      const entry = p.start('verify');
      p.fail(entry.id, 'tests failed');
      process.cwd = () => root;

      cmd.execute({ summary: true, json: true });

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      const json = JSON.parse(output);
      expect(json.total).toBe(1);
      expect(json.failed).toBe(1);
    });

    it('shows resume context with --resume', () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      const { SessionProgress } = require('../src/utils/session-progress');
      const p = new SessionProgress(stdd);
      p.start('apply', { change: 'feat-x' });
      process.cwd = () => root;

      cmd.execute({ resume: true });

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      expect(output).toContain('Resume Context');
      expect(output).toContain('apply');
    });

    it('shows no incomplete with --resume when complete', () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      const { SessionProgress } = require('../src/utils/session-progress');
      const p = new SessionProgress(stdd);
      const entry = p.start('init');
      p.complete(entry.id);
      process.cwd = () => root;

      cmd.execute({ resume: true });

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      expect(output).toContain('No incomplete');
    });

    it('shows history by default', () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      const { SessionProgress } = require('../src/utils/session-progress');
      const p = new SessionProgress(stdd);
      p.start('guard');
      process.cwd = () => root;

      cmd.execute({});

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      expect(output).toContain('Progress');
      expect(output).toContain('guard');
    });

    it('shows no progress when empty', () => {
      const root = makeTmp();
      makeStdd(root);
      process.cwd = () => root;

      cmd.execute({});

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      expect(output).toContain('No progress recorded');
    });

    it('shows history JSON with --json', () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      const { SessionProgress } = require('../src/utils/session-progress');
      const p = new SessionProgress(stdd);
      p.start('init');
      process.cwd = () => root;

      cmd.execute({ json: true });

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      const json = JSON.parse(output);
      expect(json[0].ev).toBe('start');
    });

    it('shows incomplete hint in summary', () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      const { SessionProgress } = require('../src/utils/session-progress');
      const p = new SessionProgress(stdd);
      p.start('apply', { change: 'feat-y' });
      process.cwd = () => root;

      cmd.execute({ summary: true });

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      expect(output).toContain('incomplete');
    });

    it('shows no incomplete for failed entry with --resume', () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      const { SessionProgress } = require('../src/utils/session-progress');
      const p = new SessionProgress(stdd);
      const entry = p.start('verify', { change: 'feat-z' });
      p.fail(entry.id, 'tests crashed');
      process.cwd = () => root;

      cmd.execute({ resume: true });

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      // fail marks entry as completed, so no incomplete found
      expect(output).toContain('No incomplete');
    });

    it('shows resume hint for continueable commands', () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      const { SessionProgress } = require('../src/utils/session-progress');
      const p = new SessionProgress(stdd);
      p.start('archive', { change: 'feat-w' });
      process.cwd = () => root;

      cmd.execute({ resume: true });

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      expect(output).toContain('stdd continue feat-w');
    });

    it('shows no hint for non-continueable commands', () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      const { SessionProgress } = require('../src/utils/session-progress');
      const p = new SessionProgress(stdd);
      p.start('guard');
      process.cwd = () => root;

      cmd.execute({ resume: true });

      const output = logSpy.mock.calls.map(c => c.join('')).join('\n');
      expect(output).toContain('No automatic resume');
    });
  });

  describe('_resumeHint', () => {
    it('returns continue hint for apply command', () => {
      expect(cmd._resumeHint({ start: { cmd: 'apply', args: { change: 'feat' } } }))
        .toBe('stdd continue feat');
    });

    it('returns continue hint without change', () => {
      expect(cmd._resumeHint({ start: { cmd: 'verify', args: {} } }))
        .toBe('stdd continue');
    });

    it('returns null for unknown command', () => {
      expect(cmd._resumeHint({ start: { cmd: 'init', args: {} } }))
        .toBeNull();
    });

    it('returns graph run hint for graph command', () => {
      expect(cmd._resumeHint({ start: { cmd: 'graph', args: { intent: 'hotfix', changeName: 'fix-1' } } }))
        .toBe('stdd graph run --intent hotfix --change-name fix-1');
    });

    it('returns graph run hint with default intent', () => {
      expect(cmd._resumeHint({ start: { cmd: 'graph', args: {} } }))
        .toBe('stdd graph run --intent feature');
    });

    it('returns constitution check hint', () => {
      expect(cmd._resumeHint({ start: { cmd: 'constitution', args: { action: 'check' } } }))
        .toBe('stdd constitution check');
    });

    it('returns constitution fix hint with article', () => {
      expect(cmd._resumeHint({ start: { cmd: 'constitution', args: { action: 'fix', article: '7' } } }))
        .toBe('stdd constitution fix --article 7');
    });

    it('returns new change hint', () => {
      expect(cmd._resumeHint({ start: { cmd: 'new', args: { change: 'add-auth' } } }))
        .toBe('stdd new change add-auth');
    });

    it('returns ff hint', () => {
      expect(cmd._resumeHint({ start: { cmd: 'ff', args: { change: 'my-feature' } } }))
        .toBe('stdd ff my-feature');
    });

    it('returns doctor deep hint', () => {
      expect(cmd._resumeHint({ start: { cmd: 'doctor', args: {} } }))
        .toBe('stdd doctor --deep');
    });
  });
});
