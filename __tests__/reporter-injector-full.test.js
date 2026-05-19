const fs = require('fs');
const path = require('path');
const os = require('os');
const { injectReporter, _detectFramework, _resolveReporter } = require('../src/utils/reporter-injector');

describe('reporter-injector', () => {
  describe('_detectFramework', () => {
    it('detects jest from devDependencies', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-ri-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
        devDependencies: { jest: '^29.0.0' },
      }));
      expect(_detectFramework(tmpDir)).toBe('jest');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('detects vitest over jest', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-ri-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
        devDependencies: { vitest: '^1.0.0', jest: '^29.0.0' },
      }));
      expect(_detectFramework(tmpDir)).toBe('vitest');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('detects ts-jest', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-ri-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
        devDependencies: { 'ts-jest': '^29.0.0' },
      }));
      expect(_detectFramework(tmpDir)).toBe('jest');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('detects pytest from requirements.txt', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-ri-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
      fs.writeFileSync(path.join(tmpDir, 'requirements.txt'), 'pytest>=7.0\nrequests\n');
      expect(_detectFramework(tmpDir)).toBe('pytest');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('detects pytest from pyproject.toml', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-ri-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
      fs.writeFileSync(path.join(tmpDir, 'pyproject.toml'), '[tool.pytest]\n');
      expect(_detectFramework(tmpDir)).toBe('pytest');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('returns null when no framework detected', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-ri-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
      expect(_detectFramework(tmpDir)).toBeNull();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('returns null when no package.json', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-ri-'));
      expect(_detectFramework(tmpDir)).toBeNull();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });

  describe('_resolveReporter', () => {
    it('returns null for unknown framework', () => {
      expect(_resolveReporter('unknown')).toBeNull();
    });

    it('returns null for null framework', () => {
      expect(_resolveReporter(null)).toBeNull();
    });
  });

  describe('injectReporter', () => {
    it('returns original command when no framework', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-ri-'));
      const result = injectReporter('npm test', tmpDir);
      expect(result.command).toBe('npm test');
      expect(result.env).toBeUndefined();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('returns original command when no reporter found', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-ri-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
        devDependencies: { mocha: '^10.0.0' },
      }));
      const result = injectReporter('npm test', tmpDir);
      expect(result.command).toBe('npm test');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('injects reporter for jest when reporter exists', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-ri-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
        devDependencies: { jest: '^29.0.0' },
      }));
      // Create a local reporter
      const reporterDir = path.join(tmpDir, 'stdd', 'reporters');
      fs.mkdirSync(reporterDir, { recursive: true });
      fs.writeFileSync(path.join(reporterDir, 'jest.js'), '// reporter');

      const origCwd = process.cwd;
      process.cwd = () => tmpDir;
      const result = injectReporter('npx jest', tmpDir);
      expect(result.command).toContain('--reporters=');
      expect(result.command).toContain('jest.js');
      expect(result.env).toBeUndefined();
      process.cwd = origCwd;

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('injects reporter for vitest when reporter exists', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-ri-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
        devDependencies: { vitest: '^1.0.0' },
      }));
      const reporterDir = path.join(tmpDir, 'stdd', 'reporters');
      fs.mkdirSync(reporterDir, { recursive: true });
      fs.writeFileSync(path.join(reporterDir, 'vitest.js'), '// reporter');

      const origCwd = process.cwd;
      process.cwd = () => tmpDir;
      const result = injectReporter('npx vitest', tmpDir);
      expect(result.command).toContain('--reporter=');
      expect(result.command).toContain('vitest.js');
      process.cwd = origCwd;

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('injects reporter for pytest when reporter exists', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-ri-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
      fs.writeFileSync(path.join(tmpDir, 'requirements.txt'), 'pytest>=7.0\n');
      const reporterDir = path.join(tmpDir, 'stdd', 'reporters');
      fs.mkdirSync(reporterDir, { recursive: true });
      fs.writeFileSync(path.join(reporterDir, 'pytest_plugin.py'), '# plugin');

      const origCwd = process.cwd;
      process.cwd = () => tmpDir;
      const result = injectReporter('pytest', tmpDir);
      expect(result.command).toContain('-p pytest_plugin');
      expect(result.env).toBeDefined();
      expect(result.env.PYTHONPATH).toBeDefined();
      process.cwd = origCwd;

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });
});
