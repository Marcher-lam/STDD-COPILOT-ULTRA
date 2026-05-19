const fs = require('fs');
const path = require('path');
const os = require('os');
const { SessionProgress, progress, active, setActive, clearActive } = require('../src/utils/session-progress');

describe('SessionProgress', () => {
  let tmpDir;
  let stddDir;
  let sp;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-progress-'));
    stddDir = path.join(tmpDir, 'stdd');
    fs.mkdirSync(stddDir, { recursive: true });
    sp = new SessionProgress(stddDir);
  });

  afterEach(() => {
    clearActive();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('is inactive when stdd dir does not exist', () => {
    const inactive = new SessionProgress('/nonexistent');
    const entry = inactive.start('test');
    expect(entry.id).toBeDefined();
    expect(inactive._active).toBe(false);
  });

  describe('start', () => {
    test('creates start entry with id, timestamp, and command', () => {
      const entry = sp.start('init');
      expect(entry.id).toMatch(/^\d+-[0-9a-f]+$/);
      expect(entry.ev).toBe('start');
      expect(entry.cmd).toBe('init');
      expect(entry.ts).toBeDefined();
      expect(entry.pid).toBe(process.pid);
    });

    test('accepts extra args', () => {
      const entry = sp.start('new', { change: 'dark-mode' });
      expect(entry.args).toEqual({ change: 'dark-mode' });
    });
  });

  describe('complete', () => {
    test('appends complete entry', () => {
      const entry = sp.start('init');
      sp.complete(entry.id);
      const all = sp.readAll();
      expect(all).toHaveLength(2);
      expect(all[1].ev).toBe('complete');
      expect(all[1].id).toBe(entry.id);
    });

    test('accepts extra metadata', () => {
      const entry = sp.start('init');
      sp.complete(entry.id, { duration: 500 });
      const all = sp.readAll();
      expect(all[1].duration).toBe(500);
    });
  });

  describe('fail', () => {
    test('appends fail entry with error message', () => {
      const entry = sp.start('init');
      sp.fail(entry.id, 'Something broke');
      const all = sp.readAll();
      expect(all[1].ev).toBe('fail');
      expect(all[1].err).toBe('Something broke');
    });

    test('handles Error objects', () => {
      const entry = sp.start('init');
      sp.fail(entry.id, new Error('Oops'));
      const all = sp.readAll();
      expect(all[1].err).toBe('Oops');
    });
  });

  describe('interrupt', () => {
    test('appends interrupt entry with signal', () => {
      const entry = sp.start('init');
      sp.interrupt(entry.id, 'SIGINT');
      const all = sp.readAll();
      expect(all[1].ev).toBe('interrupt');
      expect(all[1].sig).toBe('SIGINT');
    });
  });

  describe('checkpoint', () => {
    test('appends checkpoint entry', () => {
      const entry = sp.start('init');
      sp.checkpoint(entry.id, { phase: 'spec' });
      const all = sp.readAll();
      expect(all[1].ev).toBe('cp');
      expect(all[1].phase).toBe('spec');
    });
  });

  describe('readAll', () => {
    test('returns empty array when no file exists', () => {
      fs.rmSync(path.join(stddDir, 'progress.jsonl'), { force: true });
      expect(sp.readAll()).toEqual([]);
    });

    test('handles malformed lines gracefully', () => {
      const filePath = path.join(stddDir, 'progress.jsonl');
      fs.appendFileSync(filePath, 'bad json\n');
      fs.appendFileSync(filePath, JSON.stringify({ ev: 'start', id: '1' }) + '\n');
      const all = sp.readAll();
      expect(all).toHaveLength(1);
    });
  });

  describe('readLast', () => {
    test('returns last N entries', () => {
      for (let i = 0; i < 5; i++) {
        const e = sp.start(`cmd-${i}`);
        sp.complete(e.id);
      }
      const last = sp.readLast(3);
      expect(last).toHaveLength(3);
    });
  });

  describe('findLastIncomplete', () => {
    test('returns null when all complete', () => {
      const entry = sp.start('init');
      sp.complete(entry.id);
      expect(sp.findLastIncomplete()).toBeNull();
    });

    test('returns last incomplete entry', () => {
      const e1 = sp.start('init');
      sp.complete(e1.id);
      const e2 = sp.start('new');
      const incomplete = sp.findLastIncomplete();
      expect(incomplete.id).toBe(e2.id);
    });

    test('returns last incomplete when multiple incomplete', () => {
      sp.start('init');
      sp.start('new');
      const incomplete = sp.findLastIncomplete();
      expect(incomplete.cmd).toBe('new');
    });
  });

  describe('getResumeContext', () => {
    test('returns null when no incomplete', () => {
      expect(sp.getResumeContext()).toBeNull();
    });

    test('returns context with checkpoints and failure status', () => {
      const entry = sp.start('verify');
      sp.checkpoint(entry.id, { phase: 'tests' });
      const ctx = sp.getResumeContext();
      expect(ctx.start.id).toBe(entry.id);
      expect(ctx.checkpoints).toHaveLength(1);
      expect(ctx.failed).toBe(false);
    });
  });

  describe('summary', () => {
    test('returns summary statistics', () => {
      const e1 = sp.start('init');
      sp.complete(e1.id);
      const e2 = sp.start('new');
      sp.fail(e2.id, 'error');
      sp.start('verify');

      const s = sp.summary();
      expect(s.total).toBe(3);
      expect(s.completed).toBe(1);
      expect(s.failed).toBe(1);
      expect(s.incomplete).toBe(1);
    });
  });

  describe('clear', () => {
    test('empties the progress file', () => {
      sp.start('init');
      sp.clear();
      expect(sp.readAll()).toEqual([]);
    });
  });

  describe('truncate', () => {
    test('truncates when exceeding MAX_ENTRIES', () => {
      for (let i = 0; i < 10; i++) {
        const entry = sp.start(`cmd-${i}`);
        sp.complete(entry.id);
      }
      const entries = sp.readAll();
      expect(entries.length).toBe(20);
    });
  });
});

describe('Singleton helpers', () => {
  afterEach(() => {
    clearActive();
  });

  test('active/setActive/clearActive manage global state', () => {
    expect(active()).toBeNull();
    const entry = { id: 'test-123' };
    setActive(entry);
    expect(active()).toEqual(entry);
    clearActive();
    expect(active()).toBeNull();
  });

  test('progress() creates singleton instance', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-prog-'));
    try {
      const p1 = progress(dir);
      const p2 = progress(dir);
      expect(p1).toBe(p2);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
