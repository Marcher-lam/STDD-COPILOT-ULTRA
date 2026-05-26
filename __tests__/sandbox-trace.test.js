const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  validateSandbox, isSandboxBlocked, SANDBOX_BLOCKED_BINS,
} = require('../src/utils/command-runner');
const { SessionProgress } = require('../src/utils/session-progress');
const EvidenceCapture = require('../src/utils/evidence-capture');

describe('Sandbox Mode', () => {
  describe('isSandboxBlocked', () => {
    test('blocks dangerous binaries', () => {
      expect(isSandboxBlocked('rm')).toBe(true);
      expect(isSandboxBlocked('sudo')).toBe(true);
      expect(isSandboxBlocked('curl')).toBe(true);
      expect(isSandboxBlocked('docker')).toBe(true);
      expect(isSandboxBlocked('npm')).toBe(true);
    });

    test('allows safe binaries', () => {
      expect(isSandboxBlocked('node')).toBe(false);
      expect(isSandboxBlocked('jest')).toBe(false);
      expect(isSandboxBlocked('git')).toBe(false);
      expect(isSandboxBlocked('echo')).toBe(false);
    });

    test('handles full paths', () => {
      expect(isSandboxBlocked('/usr/bin/rm')).toBe(true);
      expect(isSandboxBlocked('/usr/local/bin/node')).toBe(false);
      expect(isSandboxBlocked('C:\\System32\\sudo')).toBe(true);
    });
  });

  describe('validateSandbox', () => {
    test('passes when sandbox is false', () => {
      expect(() => validateSandbox('rm', { sandbox: false })).not.toThrow();
      expect(() => validateSandbox('rm', {})).not.toThrow();
    });

    test('throws when sandbox blocks binary', () => {
      expect(() => validateSandbox('rm', { sandbox: true })).toThrow(/blocked in sandbox/);
      expect(() => validateSandbox('curl', { sandbox: true })).toThrow(/blocked in sandbox/);
    });

    test('allows safe binaries in sandbox', () => {
      expect(() => validateSandbox('node', { sandbox: true })).not.toThrow();
      expect(() => validateSandbox('jest', { sandbox: true })).not.toThrow();
    });

    test('blocks system write paths in sandbox', () => {
      expect(() => validateSandbox('node', {
        sandbox: true,
        cwd: '/project',
        _args: ['/etc/passwd'],
      })).toThrow(/outside the allowed workspace/);
    });

    test('allows cwd-relative paths in sandbox', () => {
      expect(() => validateSandbox('node', {
        sandbox: true,
        cwd: '/project',
        _args: ['src/index.js'],
      })).not.toThrow();
    });
  });
});

describe('TraceID / SpanID', () => {
  describe('SessionProgress trace', () => {
    let tempDir;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-trace-'));
      const stddDir = path.join(tempDir, 'stdd');
      fs.mkdirSync(stddDir, { recursive: true });
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    test('generates traceId', () => {
      const sp = new SessionProgress(path.join(tempDir, 'stdd'));
      const traceId = sp.generateTraceId();
      expect(traceId).toMatch(/^trace-[0-9a-f]{16}$/);
    });

    test('generates unique spanIds', () => {
      const sp = new SessionProgress(path.join(tempDir, 'stdd'));
      const s1 = sp.generateSpanId();
      const s2 = sp.generateSpanId();
      expect(s1).toMatch(/^span-[0-9a-f]{8}$/);
      expect(s1).not.toBe(s2);
    });

    test('injects traceId and spanId into progress entries', () => {
      const sp = new SessionProgress(path.join(tempDir, 'stdd'));
      sp.generateTraceId();
      sp.start('test-cmd');

      const entries = sp.readAll();
      const startEntry = entries.find(e => e.ev === 'start');
      expect(startEntry).toBeTruthy();
      expect(startEntry.traceId).toMatch(/^trace-/);
      expect(startEntry.spanId).toMatch(/^span-/);
    });

    test('setTraceId propagates external trace ID', () => {
      const sp = new SessionProgress(path.join(tempDir, 'stdd'));
      sp.setTraceId('external-trace-123');
      sp.start('cmd');

      const entries = sp.readAll();
      expect(entries[0].traceId).toBe('external-trace-123');
    });

    test('auto-generates traceId on first append if not set', () => {
      const sp = new SessionProgress(path.join(tempDir, 'stdd'));
      sp.start('cmd');

      const entries = sp.readAll();
      expect(entries[0].traceId).toMatch(/^trace-/);
    });

    test('traceId persists across multiple entries', () => {
      const sp = new SessionProgress(path.join(tempDir, 'stdd'));
      sp.start('cmd1');
      sp.complete('id1');

      const entries = sp.readAll();
      const traceId = entries[0].traceId;
      expect(entries[1].traceId).toBe(traceId);
    });
  });

  describe('EvidenceCapture trace', () => {
    test('captureVerify includes traceId and spanId', () => {
      const ec = new EvidenceCapture();
      ec.setTraceId('test-trace-abc');

      const report = ec.captureVerify('verify', {
        tasks: { allDone: true },
        tests: { passed: true },
        constitution: { status: 'pass' },
      });

      expect(report.traceId).toBe('test-trace-abc');
      expect(report.spanId).toMatch(/^span-/);
    });

    test('captureVerify uses metadata traceId as fallback', () => {
      const ec = new EvidenceCapture();
      const report = ec.captureVerify('verify', {
        tasks: { allDone: true },
        tests: { passed: true },
        constitution: { status: 'pass' },
      }, { traceId: 'fallback-trace' });

      expect(report.traceId).toBe('fallback-trace');
    });

    test('captureVerify generates unique spanIds', () => {
      const ec = new EvidenceCapture();
      ec.setTraceId('trace-x');

      const r1 = ec.captureVerify('verify', { tasks: { allDone: true }, tests: { passed: true }, constitution: { status: 'pass' } });
      const r2 = ec.captureVerify('verify', { tasks: { allDone: true }, tests: { passed: true }, constitution: { status: 'pass' } });

      expect(r1.spanId).not.toBe(r2.spanId);
      expect(r1.traceId).toBe(r2.traceId);
    });

    test('captureVerify traceId is null when not set', () => {
      const ec = new EvidenceCapture();
      const report = ec.captureVerify('verify', {
        tasks: { allDone: true },
        tests: { passed: true },
        constitution: { status: 'pass' },
      });

      expect(report.traceId).toBeNull();
      expect(report.spanId).toMatch(/^span-/);
    });
  });
});
