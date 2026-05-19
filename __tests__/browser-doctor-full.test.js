const fs = require('fs');
const path = require('path');
const os = require('os');

jest.mock('child_process', () => ({
  spawnSync: jest.fn(),
}));

const { BrowserDoctor, detectPackageManager, installCommandFor } = require('../src/runtime/browser-doctor');

describe('BrowserDoctor', () => {
  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('detectPackageManager', () => {
    it('detects npm as default', () => {
      const pm = detectPackageManager('/nonexistent');
      expect(pm).toBe('npm');
    });
  });

  describe('installCommandFor', () => {
    it('returns pnpm command', () => {
      expect(installCommandFor('pnpm')).toBe('pnpm add -D playwright');
    });

    it('returns yarn command', () => {
      expect(installCommandFor('yarn')).toBe('yarn add -D playwright');
    });

    it('returns bun command', () => {
      expect(installCommandFor('bun')).toBe('bun add -d playwright');
    });

    it('returns npm command as default', () => {
      expect(installCommandFor('npm')).toBe('npm install -D playwright');
      expect(installCommandFor('unknown')).toBe('npm install -D playwright');
    });
  });

  describe('check', () => {
    it('fails when playwright package not installed', () => {
      const doctor = new BrowserDoctor('/nonexistent');
      const result = doctor.check();
      expect(result.status).toBe('fail');
      expect(result.checks[0].name).toBe('playwright package');
      expect(result.checks[0].status).toBe('fail');
      expect(result.suggestions).toContain('npx playwright install');
    });

    it('returns package manager in result', () => {
      const doctor = new BrowserDoctor();
      const result = doctor.check();
      expect(result.packageManager).toBeDefined();
    });

    it('skips launch check when options.launch is false', () => {
      const doctor = new BrowserDoctor();
      // Mock _checkPackage to pass
      doctor._checkPackage = jest.fn().mockReturnValue({ name: 'playwright package', status: 'pass' });
      doctor._checkBrowserBinary = jest.fn().mockReturnValue({ name: 'chromium binary', status: 'pass' });
      doctor._checkLaunch = jest.fn();

      const result = doctor.check({ launch: false });
      expect(doctor._checkLaunch).not.toHaveBeenCalled();
      expect(result.checks.length).toBe(2);
    });

    it('fails on missing browser binary', () => {
      const doctor = new BrowserDoctor();
      doctor._checkPackage = jest.fn().mockReturnValue({ name: 'playwright package', status: 'pass' });
      doctor._checkBrowserBinary = jest.fn().mockReturnValue({ name: 'chromium binary', status: 'fail', message: 'not installed' });

      const result = doctor.check();
      expect(result.status).toBe('fail');
      expect(result.suggestions).toContain('npx playwright install');
    });
  });

  describe('_checkBrowserBinary', () => {
    it('returns fail when playwright throws', () => {
      const doctor = new BrowserDoctor();
      doctor._loadPlaywright = jest.fn().mockImplementation(() => { throw new Error('module not found'); });
      const result = doctor._checkBrowserBinary();
      expect(result.status).toBe('fail');
      expect(result.name).toBe('chromium binary');
    });

    it('returns fail when chromium API unavailable', () => {
      const doctor = new BrowserDoctor();
      doctor._loadPlaywright = jest.fn().mockReturnValue({});
      const result = doctor._checkBrowserBinary();
      expect(result.status).toBe('fail');
      expect(result.message).toContain('unavailable');
    });

    it('returns fail when executable path does not exist', () => {
      const doctor = new BrowserDoctor();
      doctor._loadPlaywright = jest.fn().mockReturnValue({
        chromium: { executablePath: () => '/nonexistent/path/chromium' },
      });
      const result = doctor._checkBrowserBinary();
      expect(result.status).toBe('fail');
      expect(result.message).toContain('not installed');
    });

    it('returns pass when binary exists', () => {
      const tmpFile = path.join(os.tmpdir(), `chromium-test-${Date.now()}`);
      fs.writeFileSync(tmpFile, 'test');
      const doctor = new BrowserDoctor();
      doctor._loadPlaywright = jest.fn().mockReturnValue({
        chromium: { executablePath: () => tmpFile },
      });
      const result = doctor._checkBrowserBinary();
      expect(result.status).toBe('pass');
      expect(result.path).toBe(tmpFile);
      fs.unlinkSync(tmpFile);
    });
  });

  describe('_checkLaunch', () => {
    const { spawnSync } = require('child_process');

    it('returns pass when spawn succeeds', () => {
      spawnSync.mockReturnValue({ status: 0 });
      const doctor = new BrowserDoctor();
      const result = doctor._checkLaunch();
      expect(result.status).toBe('pass');
      expect(result.name).toBe('headless launch');
    });

    it('returns fail when spawn fails', () => {
      spawnSync.mockReturnValue({ status: 1, stderr: 'launch error' });
      const doctor = new BrowserDoctor();
      const result = doctor._checkLaunch();
      expect(result.status).toBe('fail');
      expect(result.message).toContain('launch error');
    });

    it('falls back to stdout when stderr empty', () => {
      spawnSync.mockReturnValue({ status: 1, stderr: '', stdout: 'stdout error' });
      const doctor = new BrowserDoctor();
      const result = doctor._checkLaunch();
      expect(result.message).toContain('stdout error');
    });

    it('uses default message when both empty', () => {
      spawnSync.mockReturnValue({ status: 1, stderr: '', stdout: '' });
      const doctor = new BrowserDoctor();
      const result = doctor._checkLaunch();
      expect(result.message).toContain('Unable to launch');
    });
  });
});
