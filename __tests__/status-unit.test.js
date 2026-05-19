/**
 * Unit tests for StatusCommand internal methods.
 * Focuses on: showOverallStatus, showChangeStatus, getProgressBar,
 * buildOverallStatusPayload, getDetailedStatus.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { StatusCommand } = require('../src/cli/commands/status');

jest.mock('chalk', () => {
  const fn = (...args) => args.join('');
  fn.bold = fn;
  fn.green = fn;
  fn.yellow = fn;
  fn.cyan = fn;
  fn.dim = fn;
  fn.red = fn;
  return fn;
});

function makeTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-status-unit-'));
}

function makeStddDir(root) {
  const stdd = path.join(root, 'stdd');
  fs.mkdirSync(path.join(stdd, 'specs'), { recursive: true });
  fs.mkdirSync(path.join(stdd, 'changes'), { recursive: true });
  fs.mkdirSync(path.join(stdd, 'memory'), { recursive: true });
  fs.writeFileSync(path.join(stdd, 'config.yaml'), 'version: 1\n');
  return stdd;
}

function makeChange(stddDir, name, opts = {}) {
  const dir = path.join(stddDir, 'changes', name);
  fs.mkdirSync(dir, { recursive: true });

  if (opts.proposal) {
    fs.writeFileSync(path.join(dir, 'proposal.md'), opts.proposal);
  }
  if (opts.specs) {
    const specsDir = path.join(dir, 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
    fs.writeFileSync(path.join(specsDir, 'feature.md'), opts.specs);
  }
  if (opts.design) {
    fs.writeFileSync(path.join(dir, 'design.md'), opts.design);
  }
  if (opts.tasks) {
    fs.writeFileSync(path.join(dir, 'tasks.md'), opts.tasks);
  }
  return dir;
}

describe('StatusCommand', () => {
  let cmd;
  let logSpy;

  beforeEach(() => {
    cmd = new StatusCommand();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  // --- getProgressBar ---

  describe('getProgressBar', () => {
    it('returns 0% bar when completed is 0', () => {
      const bar = cmd.getProgressBar(0, 10);
      expect(bar).toContain('0%');
    });

    it('returns 50% bar', () => {
      const bar = cmd.getProgressBar(5, 10);
      expect(bar).toContain('50%');
    });

    it('returns 100% bar when all completed', () => {
      const bar = cmd.getProgressBar(10, 10);
      expect(bar).toContain('100%');
    });

    it('handles zero total gracefully', () => {
      const bar = cmd.getProgressBar(0, 0);
      expect(bar).toContain('0%');
    });
  });

  // --- getDetailedStatus ---

  describe('getDetailedStatus', () => {
    it('detects phase 1 when no artifacts exist', async () => {
      const root = makeTmp();
      const stdd = makeStddDir(root);
      const dir = makeChange(stdd, 'blank');

      const status = await cmd.getDetailedStatus(dir, { silent: true });

      expect(status.hasProposal).toBe(false);
      expect(status.hasSpecs).toBe(false);
      expect(status.hasDesign).toBe(false);
      expect(status.hasTasks).toBe(false);
      expect(status.phase).toContain('Phase 1');
    });

    it('detects phase 2 when proposal exists but no specs', async () => {
      const root = makeTmp();
      const stdd = makeStddDir(root);
      makeChange(stdd, 'partial', { proposal: '# Proposal: My Feature\n' });

      const status = await cmd.getDetailedStatus(
        path.join(stdd, 'changes', 'partial'), { silent: true }
      );

      expect(status.hasProposal).toBe(true);
      expect(status.hasSpecs).toBe(false);
      expect(status.phase).toContain('Phase 2');
      expect(status.title).toBe('My Feature');
    });

    it('detects phase 3 when specs exist but no design', async () => {
      const root = makeTmp();
      const stdd = makeStddDir(root);
      makeChange(stdd, 'specd', {
        proposal: '# Proposal: Feat\n',
        specs: 'Feature: something\n',
      });

      const status = await cmd.getDetailedStatus(
        path.join(stdd, 'changes', 'specd'), { silent: true }
      );

      expect(status.hasSpecs).toBe(true);
      expect(status.hasDesign).toBe(false);
      expect(status.phase).toContain('Phase 3');
    });

    it('detects phase 4 when design exists but tasks incomplete', async () => {
      const root = makeTmp();
      const stdd = makeStddDir(root);
      makeChange(stdd, 'building', {
        proposal: '# Proposal: Feat\n',
        specs: 'Feature: x\n',
        design: '# Design\n',
        tasks: '- [x] Task 1\n- [ ] Task 2\n',
      });

      const status = await cmd.getDetailedStatus(
        path.join(stdd, 'changes', 'building'), { silent: true }
      );

      expect(status.hasDesign).toBe(true);
      expect(status.hasTasks).toBe(true);
      expect(status.tasksCompleted).toBe(1);
      expect(status.totalTasks).toBe(2);
      expect(status.phase).toContain('Phase 4');
    });

    it('detects phase 5 when all tasks complete', async () => {
      const root = makeTmp();
      const stdd = makeStddDir(root);
      makeChange(stdd, 'done', {
        proposal: '# Proposal: Feat\n',
        specs: 'Feature: x\n',
        design: '# Design\n',
        tasks: '- [x] Task 1\n- [x] Task 2\n',
      });

      const status = await cmd.getDetailedStatus(
        path.join(stdd, 'changes', 'done'), { silent: true }
      );

      expect(status.tasksCompleted).toBe(2);
      expect(status.totalTasks).toBe(2);
      expect(status.phase).toContain('Phase 5');
    });
  });

  // --- buildOverallStatusPayload ---

  describe('buildOverallStatusPayload', () => {
    it('counts specs, changes, and memory files', async () => {
      const root = makeTmp();
      const stdd = makeStddDir(root);
      fs.writeFileSync(path.join(stdd, 'specs', 'auth.md'), '');
      fs.writeFileSync(path.join(stdd, 'specs', 'billing.md'), '');
      makeChange(stdd, 'feat-a', { proposal: '# P\n' });
      fs.writeFileSync(path.join(stdd, 'memory', 'note.md'), '');

      const payload = await cmd.buildOverallStatusPayload(stdd, { silent: true });

      expect(payload.initialized).toBe(true);
      expect(payload.specs).toBe(2);
      expect(payload.changes).toBe(1);
      expect(payload.memory).toBe(1);
      expect(payload.currentChanges).toHaveLength(1);
      expect(payload.currentChanges[0].name).toBe('feat-a');
    });
  });

  // --- showOverallStatus ---

  describe('showOverallStatus', () => {
    it('outputs JSON for uninitialized project', async () => {
      const root = makeTmp();
      const stdd = path.join(root, 'stdd');

      await cmd.showOverallStatus(stdd, { json: true });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      const json = JSON.parse(output);
      expect(json.initialized).toBe(false);
    });

    it('outputs JSON with specs count for initialized project', async () => {
      const root = makeTmp();
      const stdd = makeStddDir(root);
      fs.writeFileSync(path.join(stdd, 'specs', 'core.md'), '');

      await cmd.showOverallStatus(stdd, { json: true });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      const json = JSON.parse(output);
      expect(json.initialized).toBe(true);
      expect(json.specs).toBe(1);
    });

    it('prints text output for initialized project', async () => {
      const root = makeTmp();
      const stdd = makeStddDir(root);

      await cmd.showOverallStatus(stdd, { json: false });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('STDD initialized');
      expect(output).toContain('Specs');
    });

    it('prints uninitialized warning for non-JSON non-initialized project', async () => {
      const root = makeTmp();
      const stdd = path.join(root, 'stdd');

      await cmd.showOverallStatus(stdd, { json: false });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('not initialized');
    });

    it('shows change details with title and tasks progress', async () => {
      const root = makeTmp();
      const stdd = makeStddDir(root);
      makeChange(stdd, 'detailed-change', {
        proposal: '# Proposal: Super Feature\n',
        specs: 'Feature: x\n',
        design: '# Design\n',
        tasks: '- [x] Task 1\n- [ ] Task 2\n',
      });

      await cmd.showOverallStatus(stdd, { json: false });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Super Feature');
      expect(output).toContain('Tasks');
    });

    it('shows overflow message when more than 5 changes exist', async () => {
      const root = makeTmp();
      const stdd = makeStddDir(root);
      for (let i = 1; i <= 7; i++) {
        makeChange(stdd, `feat-${i}`, { proposal: `# Proposal: Feature ${i}\n` });
      }

      await cmd.showOverallStatus(stdd, { json: false });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('more');
    });
  });

  // --- showChangeStatus ---

  describe('showChangeStatus', () => {
    it('throws for non-existent change', async () => {
      const root = makeTmp();
      const stdd = makeStddDir(root);

      await expect(cmd.showChangeStatus(stdd, 'ghost', {}))
        .rejects.toThrow("Change 'ghost' not found.");
    });

    it('outputs JSON for an existing change', async () => {
      const root = makeTmp();
      const stdd = makeStddDir(root);
      makeChange(stdd, 'my-feat', { proposal: '# Proposal: Feat\n' });

      await cmd.showChangeStatus(stdd, 'my-feat', { json: true });

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      const json = JSON.parse(output);
      expect(json.change).toBe('my-feat');
      expect(json.hasProposal).toBe(true);
    });

    it('shows text output with tasks progress', async () => {
      const root = makeTmp();
      const stdd = makeStddDir(root);
      makeChange(stdd, 'with-tasks', {
        proposal: '# Proposal: Tasked\n',
        tasks: '- [x] Task 1\n- [ ] Task 2\n',
      });

      logSpy.mockClear();
      await cmd.showChangeStatus(stdd, 'with-tasks', {});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('with-tasks');
      expect(output).toContain('proposal.md');
      expect(output).toContain('tasks.md');
    });

    it('shows task progress bar in text mode', async () => {
      const root = makeTmp();
      const stdd = makeStddDir(root);
      makeChange(stdd, 'progress', {
        proposal: '# Proposal: P\n',
        specs: 'Feature: x\n',
        design: '# Design\n',
        tasks: '- [x] Done\n- [ ] Todo\n',
      });

      logSpy.mockClear();
      await cmd.showChangeStatus(stdd, 'progress', {});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Tasks');
      expect(output).toContain('1/2');
    });

    it('shows phase in text mode', async () => {
      const root = makeTmp();
      const stdd = makeStddDir(root);
      makeChange(stdd, 'phased', {
        proposal: '# Proposal: P\n',
        specs: 'Feature: x\n',
        design: '# Design\n',
        tasks: '- [x] Done\n',
      });

      logSpy.mockClear();
      await cmd.showChangeStatus(stdd, 'phased', {});

      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Phase');
    });
  });

  // --- countItems ---

  describe('countItems', () => {
    it('counts non-hidden items in a directory', async () => {
      const root = makeTmp();
      fs.mkdirSync(path.join(root, 'visible'));
      fs.writeFileSync(path.join(root, '.hidden'), '');
      fs.writeFileSync(path.join(root, 'file.txt'), '');

      const count = await cmd.countItems(root);
      expect(count).toBe(2);
    });

    it('returns 0 for nonexistent dir', async () => {
      const count = await cmd.countItems('/nonexistent/path');
      expect(count).toBe(0);
    });
  });

  // --- getActiveChanges ---

  describe('getActiveChanges', () => {
    it('lists active non-archive directories', async () => {
      const root = makeTmp();
      const changesDir = path.join(root, 'changes');
      fs.mkdirSync(path.join(changesDir, 'feat-a'), { recursive: true });
      fs.mkdirSync(path.join(changesDir, 'feat-b'), { recursive: true });
      fs.mkdirSync(path.join(changesDir, 'archive'), { recursive: true });
      fs.mkdirSync(path.join(changesDir, '.hidden'), { recursive: true });

      const changes = await cmd.getActiveChanges(changesDir);
      expect(changes).toContain('feat-a');
      expect(changes).toContain('feat-b');
      expect(changes).not.toContain('archive');
      expect(changes).not.toContain('.hidden');
    });

    it('returns empty for nonexistent dir', async () => {
      const changes = await cmd.getActiveChanges('/nonexistent');
      expect(changes).toEqual([]);
    });
  });
});
