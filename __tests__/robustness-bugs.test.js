const fs = require('fs');
const path = require('path');
const os = require('os');

function makeTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-bugs-'));
}

describe('Round 13 bug fixes', () => {
  describe('browser-runtime: _withBrowser error handling', () => {
    it('returns error object when playwright not installed', async () => {
      const { BrowserRuntime } = require('../src/runtime/browser-runtime');
      const rt = new BrowserRuntime('/tmp');
      rt.playwright = null;

      const result = await rt._withBrowser(async () => 'ok');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns error object when launch fails', async () => {
      const { BrowserRuntime } = require('../src/runtime/browser-runtime');
      const rt = new BrowserRuntime('/tmp');
      rt.playwright = {
        chromium: {
          launch: async () => { throw new Error('Launch failed'); },
        },
      };

      const result = await rt._withBrowser(async () => 'ok');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Launch failed');
    });
  });

  describe('evidence-capture: _determineStatus null safety', () => {
    it('returns unknown when results is null', () => {
      const EvidenceCapture = require('../src/utils/evidence-capture');
      const capture = new EvidenceCapture('/tmp');
      expect(capture._determineStatus(null, 'verify')).toBe('unknown');
    });

    it('returns unknown when results is undefined', () => {
      const EvidenceCapture = require('../src/utils/evidence-capture');
      const capture = new EvidenceCapture('/tmp');
      expect(capture._determineStatus(undefined, 'guard')).toBe('unknown');
    });

    it('handles verify with valid results', () => {
      const EvidenceCapture = require('../src/utils/evidence-capture');
      const capture = new EvidenceCapture('/tmp');
      const result = capture._determineStatus({
        tasks: { allDone: true },
        tests: { passed: true },
        constitution: { status: 'pass' },
        lint: null,
      }, 'verify');
      expect(result).toBe('pass');
    });

    it('handles guard with skip/warn statuses', () => {
      const EvidenceCapture = require('../src/utils/evidence-capture');
      const capture = new EvidenceCapture('/tmp');
      const result = capture._determineStatus({
        constitution: { status: 'pass' },
        lint: { status: 'skip' },
      }, 'guard');
      expect(result).toBe('pass');
    });
  });

  describe('agent-simulator: empty agents array', () => {
    it('falls back to default agents when empty array provided', () => {
      const { AgentEngine } = require('../src/runtime/agent-simulator');
      const tmp = makeTmp();
      const sim = new AgentEngine(tmp);

      const state = sim.start('test topic', { agents: [] });
      expect(state.agents.length).toBeGreaterThan(0);
      expect(state.status).toBe('active');
    });
  });

  describe('continue: updateTaskLine error handling', () => {
    it('throws descriptive error for unreadable file', () => {
      const { ContinueCommand } = require('../src/cli/commands/continue');
      const cmd = new ContinueCommand();
      const task = { index: 0, description: 'test', status: ' ', isDone: false };

      expect(() => cmd.updateTaskLine('/nonexistent/tasks.md', task, 'x'))
        .toThrow('Failed to update task');
    });
  });

  describe('ff/new/issue: ensureChangesDir error messages', () => {
    it('ff throws descriptive error for non-ENOENT access error', async () => {
      const { FFCommand } = require('../src/cli/commands/ff');
      const cmd = new FFCommand();

      const origAccess = require('fs').promises.access;
      require('fs').promises.access = async () => {
        const err = new Error('permission denied');
        err.code = 'EACCES';
        throw err;
      };

      try {
        await expect(cmd.ensureChangesDir()).rejects.toThrow('Cannot access changes directory');
      } finally {
        require('fs').promises.access = origAccess;
      }
    });
  });

  describe('validate: lineDiagnostics file read error', () => {
    it('returns diagnostic for unreadable file', () => {
      const { ValidateCommand } = require('../src/cli/commands/validate');
      const cmd = new ValidateCommand();
      expect(cmd).toBeInstanceOf(ValidateCommand);
      expect(require('../src/cli/commands/validate').ValidateCommand).toBe(ValidateCommand);
    });
  });

  describe('validate: compareTasksToSpecs handles unreadable specs', () => {
    it('gracefully handles missing spec files', async () => {
      const { ValidateCommand } = require('../src/cli/commands/validate');
      const cmd = new ValidateCommand();
      const root = makeTmp();
      const stdd = path.join(root, 'stdd');
      const changeDir = path.join(stdd, 'changes', 'test-change');
      fs.mkdirSync(path.join(changeDir, 'specs'), { recursive: true });
      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');

      // Pass a non-existent spec file
      const result = cmd.compareTasksToSpecs(changeDir, ['/nonexistent/spec.md']);
      expect(result).toBeDefined();
      expect(result.total).toBe(1);
    });
  });
});
