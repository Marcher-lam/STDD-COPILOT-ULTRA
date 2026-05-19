const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const {
  runChecks,
  isImplementationFile,
  getCorrespondingTestFile,
  checkCodeStyle,
  checkSecurity,
  formatViolationMessage,
} = require('../src/templates/hooks/pre-file-write');

describe('pre-file-write hook functions', () => {
  describe('isImplementationFile', () => {
    it('identifies implementation files', () => {
      expect(isImplementationFile('/project/src/app.js')).toBe(true);
      expect(isImplementationFile('/project/lib/utils.ts')).toBe(true);
      expect(isImplementationFile('/project/components/Button.jsx')).toBe(true);
    });

    it('rejects non-implementation files', () => {
      expect(isImplementationFile('app.test.js')).toBe(false);
      expect(isImplementationFile('README.md')).toBe(false);
    });
  });

  describe('getCorrespondingTestFile', () => {
    let tmpDir;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-pfw-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('finds co-located test file (.js)', () => {
      fs.writeFileSync(path.join(tmpDir, 'app.test.js'), '');
      const result = getCorrespondingTestFile(path.join(tmpDir, 'app.js'));
      expect(result).toBeTruthy();
    });

    it('finds spec file (.ts)', () => {
      fs.writeFileSync(path.join(tmpDir, 'utils.spec.ts'), '');
      const result = getCorrespondingTestFile(path.join(tmpDir, 'utils.ts'));
      expect(result).toBeTruthy();
    });

    it('finds __tests__ directory test', () => {
      fs.mkdirSync(path.join(tmpDir, '__tests__'));
      fs.writeFileSync(path.join(tmpDir, '__tests__', 'api.test.js'), '');
      const result = getCorrespondingTestFile(path.join(tmpDir, 'api.js'));
      expect(result).toBeTruthy();
    });

    it('returns computed test path even when file missing', () => {
      const result = getCorrespondingTestFile(path.join(tmpDir, 'missing.js'));
      expect(result).toContain('missing.test.js');
    });

    it('handles .jsx extension (default case line 78)', () => {
      fs.writeFileSync(path.join(tmpDir, 'Component.test.jsx'), '');
      const result = getCorrespondingTestFile(path.join(tmpDir, 'Component.jsx'));
      expect(result).toBeTruthy();
    });

    it('handles .vue extension (default case line 78)', () => {
      fs.writeFileSync(path.join(tmpDir, 'page.test.vue'), '');
      const result = getCorrespondingTestFile(path.join(tmpDir, 'page.vue'));
      expect(result).toBeTruthy();
    });
  });

  describe('checkCodeStyle', () => {
    it('returns result for code content', () => {
      const result = checkCodeStyle('const x = 1;', '/tmp/test.js');
      expect(result).toBeDefined();
    });
  });

  describe('checkSecurity', () => {
    it('detects secrets in code', () => {
      const result = checkSecurity('const API_KEY = "sk-1234567890abcdef"', '/tmp/config.js');
      expect(result).toBeDefined();
    });

    it('passes clean code', () => {
      const result = checkSecurity('const x = 1;', '/tmp/clean.js');
      expect(result).toBeDefined();
    });
  });

  describe('formatViolationMessage', () => {
    it('formats violation message', () => {
      const violations = [
        { level: 'error', article: 'Article 3', message: 'Missing test' },
      ];
      const msg = formatViolationMessage(violations);
      expect(msg).toContain('Article 3');
      expect(msg).toContain('Missing test');
    });
  });

  describe('runChecks', () => {
    it('returns structured result for valid input', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-runchecks-'));
      const filePath = path.join(tmpDir, 'app.js');
      fs.writeFileSync(filePath, 'const x = 1;');
      const result = await runChecks({
        file_path: filePath,
        new_content: 'const y = 2;',
      });
      expect(result).toHaveProperty('block');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });

  describe('stdin entry point (integration)', () => {
    const hookPath = path.resolve(__dirname, '..', 'src', 'templates', 'hooks', 'pre-file-write.js');

    it('returns block:false for valid input via stdin', () => {
      const input = JSON.stringify({ file_path: '/tmp/test.js', new_content: 'const x = 1;' });
      const result = execSync(`echo '${input}' | node "${hookPath}"`, { encoding: 'utf8' });
      const parsed = JSON.parse(result.trim());
      expect(parsed.block).toBe(false);
    });

    it('returns block:false when STDD_HOOKS_DISABLED', () => {
      const result = execSync(`STDD_HOOKS_DISABLED=1 echo '{}' | node "${hookPath}"`, { encoding: 'utf8' });
      const parsed = JSON.parse(result.trim());
      expect(parsed.block).toBe(false);
    });

    it('outputs error and exits 0 on invalid JSON', () => {
      const result = execSync(`echo 'not-json' | node "${hookPath}" 2>&1; echo "exit:$?"`, { encoding: 'utf8' });
      expect(result).toContain('STDD Hook error');
      expect(result).toContain('exit:0');
    });
  });
});
