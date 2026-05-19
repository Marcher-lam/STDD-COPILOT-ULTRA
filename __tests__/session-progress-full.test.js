const fs = require('fs');
const path = require('path');
const os = require('os');
const { SessionProgress, progress, clearActive } = require('../src/utils/session-progress');

describe('SessionProgress', () => {
  let tmpDir;
  let stddDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-sp-'));
    stddDir = path.join(tmpDir, 'stdd');
    fs.mkdirSync(stddDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    clearActive();
  });

  it('is inactive when stddDir does not exist', () => {
    const sp = new SessionProgress('/nonexistent');
    expect(sp._active).toBe(false);
    sp.start('test'); // should be no-op
    expect(sp.readAll()).toEqual([]);
  });

  it('is inactive when stddDir is null', () => {
    const sp = new SessionProgress(null);
    expect(sp._active).toBeFalsy();
  });

  it('records start event', () => {
    const sp = new SessionProgress(stddDir);
    const entry = sp.start('apply', { change: 'test' });
    expect(entry.id).toBeDefined();
    expect(entry.ev).toBe('start');
    expect(entry.cmd).toBe('apply');
    expect(entry.args).toEqual({ change: 'test' });
  });

  it('records complete event', () => {
    const sp = new SessionProgress(stddDir);
    const entry = sp.start('verify');
    sp.complete(entry.id, { result: 'pass' });
    const all = sp.readAll();
    expect(all.length).toBe(2);
    expect(all[1].ev).toBe('complete');
    expect(all[1].result).toBe('pass');
  });

  it('records fail event with string error', () => {
    const sp = new SessionProgress(stddDir);
    const entry = sp.start('apply');
    sp.fail(entry.id, 'test failed');
    const all = sp.readAll();
    expect(all[1].ev).toBe('fail');
    expect(all[1].err).toBe('test failed');
  });

  it('records fail event with Error object', () => {
    const sp = new SessionProgress(stddDir);
    const entry = sp.start('apply');
    sp.fail(entry.id, new Error('something broke'));
    const all = sp.readAll();
    expect(all[1].err).toBe('something broke');
  });

  it('records interrupt event', () => {
    const sp = new SessionProgress(stddDir);
    const entry = sp.start('apply');
    sp.interrupt(entry.id, 'SIGINT');
    const all = sp.readAll();
    expect(all[1].ev).toBe('interrupt');
    expect(all[1].sig).toBe('SIGINT');
  });

  it('records checkpoint', () => {
    const sp = new SessionProgress(stddDir);
    const entry = sp.start('graph-run');
    sp.checkpoint(entry.id, { phase: 'apply', progress: 50 });
    const all = sp.readAll();
    expect(all[1].ev).toBe('cp');
    expect(all[1].phase).toBe('apply');
  });

  it('readLast returns last N entries', () => {
    const sp = new SessionProgress(stddDir);
    const e1 = sp.start('cmd1');
    sp.complete(e1.id);
    const e2 = sp.start('cmd2');
    sp.complete(e2.id);
    const last = sp.readLast(1);
    expect(last.length).toBe(1);
    expect(last[0].ev).toBe('complete');
  });

  it('findLastIncomplete returns null when all complete', () => {
    const sp = new SessionProgress(stddDir);
    const entry = sp.start('test');
    sp.complete(entry.id);
    expect(sp.findLastIncomplete()).toBeNull();
  });

  it('findLastIncomplete returns incomplete entry', () => {
    const sp = new SessionProgress(stddDir);
    sp.start('test');
    expect(sp.findLastIncomplete()).not.toBeNull();
    expect(sp.findLastIncomplete().cmd).toBe('test');
  });

  it('getResumeContext returns context for incomplete', () => {
    const sp = new SessionProgress(stddDir);
    const entry = sp.start('graph-run', { intent: 'feature' });
    sp.checkpoint(entry.id, { phase: 'spec' });
    const ctx = sp.getResumeContext();
    expect(ctx).not.toBeNull();
    expect(ctx.start.cmd).toBe('graph-run');
    expect(ctx.checkpoints.length).toBe(1);
    expect(ctx.failed).toBe(false);
  });

  it('getResumeContext returns null when all entries are done', () => {
    const sp = new SessionProgress(stddDir);
    const entry = sp.start('apply');
    sp.fail(entry.id, 'test error');
    // fail marks the entry as done, so findLastIncomplete returns null
    const ctx = sp.getResumeContext();
    expect(ctx).toBeNull();
  });

  it('summary returns correct counts', () => {
    const sp = new SessionProgress(stddDir);
    const e1 = sp.start('cmd1');
    sp.complete(e1.id);
    const e2 = sp.start('cmd2');
    sp.fail(e2.id, 'error');
    sp.start('cmd3'); // incomplete

    const s = sp.summary();
    expect(s.total).toBe(3);
    expect(s.completed).toBe(1);
    expect(s.failed).toBe(1);
    expect(s.incomplete).toBe(1);
  });

  it('clear removes all entries', () => {
    const sp = new SessionProgress(stddDir);
    sp.start('test');
    sp.clear();
    expect(sp.readAll()).toEqual([]);
  });

  it('truncate does nothing when under limit', () => {
    const sp = new SessionProgress(stddDir);
    sp.start('test');
    const before = sp.readAll().length;
    sp.truncate();
    expect(sp.readAll().length).toBe(before);
  });

  it('progress() returns singleton', () => {
    const origCwd = process.cwd;
    process.cwd = () => tmpDir;
    const p1 = progress(tmpDir);
    const p2 = progress(tmpDir);
    expect(p1).toBe(p2);
    process.cwd = origCwd;
  });
});
