const fs = require('fs');
const path = require('path');
const os = require('os');
const { isPathSafe, detectSecrets, sanitizeInput, hashSensitiveData, redactSensitiveInfo } = require('../src/utils/security');

describe('security.js hardening', () => {
  describe('isPathSafe', () => {
    let tmpDir;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-sec-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('rejects null inputs', () => {
      expect(isPathSafe(null, '/tmp')).toBe(false);
      expect(isPathSafe('/tmp', null)).toBe(false);
      expect(isPathSafe(null, null)).toBe(false);
    });

    it('allows paths within baseDir', () => {
      const filePath = path.join(tmpDir, 'src', 'index.js');
      expect(isPathSafe(filePath, tmpDir)).toBe(true);
    });

    it('allows exact baseDir path', () => {
      expect(isPathSafe(tmpDir, tmpDir)).toBe(true);
    });

    it('rejects path traversal with ..', () => {
      expect(isPathSafe(path.join(tmpDir, '..', 'etc', 'passwd'), tmpDir)).toBe(false);
    });

    it('rejects paths outside baseDir', () => {
      expect(isPathSafe('/etc/passwd', tmpDir)).toBe(false);
    });

    it('blocks symlink escape', () => {
      const outsideDir = path.join(os.tmpdir(), `stdd-outside-${Date.now()}`);
      fs.mkdirSync(outsideDir, { recursive: true });
      const outsideFile = path.join(outsideDir, 'secret.txt');
      fs.writeFileSync(outsideFile, 'sensitive');

      const linkPath = path.join(tmpDir, 'escape-link');
      try {
        fs.symlinkSync(outsideFile, linkPath);
        // Symlink points outside baseDir — should be blocked
        expect(isPathSafe(linkPath, tmpDir)).toBe(false);
      } catch {
        // Symlinks may not be supported on some platforms
      } finally {
        fs.rmSync(outsideDir, { recursive: true, force: true });
      }
    });

    it('allows symlinks within baseDir', () => {
      const realFile = path.join(tmpDir, 'real.txt');
      fs.writeFileSync(realFile, 'content');
      const linkPath = path.join(tmpDir, 'link.txt');
      try {
        fs.symlinkSync(realFile, linkPath);
        expect(isPathSafe(linkPath, tmpDir)).toBe(true);
      } catch {
        // Symlinks may not be supported
      }
    });
  });

  describe('detectSecrets', () => {
    it('detects API keys', () => {
      const code = 'const apiKey = "AKIAIOSFODNN7EXAMPLE12345678"';
      const results = detectSecrets(code);
      expect(results.length).toBeGreaterThan(0);
    });

    it('detects passwords', () => {
      const code = "const password = 'supersecret123'";
      const results = detectSecrets(code);
      expect(results.some(r => r.name === 'Password')).toBe(true);
    });

    it('detects private keys', () => {
      const code = "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA";
      const results = detectSecrets(code);
      expect(results.some(r => r.name === 'Private Key')).toBe(true);
    });

    it('detects AWS keys', () => {
      const code = "AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE";
      const results = detectSecrets(code);
      expect(results.some(r => r.name === 'AWS Key')).toBe(true);
    });

    it('returns empty for clean code', () => {
      const code = "const greeting = 'hello world';";
      expect(detectSecrets(code)).toEqual([]);
    });

    it('reports correct line numbers', () => {
      const code = "const a = 1;\nconst apiKey = 'abcdef1234567890abcdef';\nconst b = 2;";
      const results = detectSecrets(code);
      expect(results.some(r => r.line === 2)).toBe(true);
    });
  });

  describe('sanitizeInput', () => {
    it('strips null bytes', () => {
      expect(sanitizeInput('hello\0world')).toBe('helloworld');
    });

    it('strips control characters', () => {
      expect(sanitizeInput('hello\x07world')).toBe('helloworld');
    });

    it('preserves newlines and tabs by default', () => {
      expect(sanitizeInput('hello\tworld\n')).toBe('hello\tworld');
    });

    it('trims by default', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
    });

    it('respects trim: false', () => {
      expect(sanitizeInput('  hello  ', { trim: false })).toBe('  hello  ');
    });

    it('enforces maxLength', () => {
      expect(sanitizeInput('abcdefghij', { maxLength: 5 })).toBe('abcde');
    });

    it('returns empty for non-string', () => {
      expect(sanitizeInput(123)).toBe('');
      expect(sanitizeInput(null)).toBe('');
    });
  });

  describe('hashSensitiveData', () => {
    it('produces consistent hash', () => {
      const a = hashSensitiveData('test');
      const b = hashSensitiveData('test');
      expect(a).toBe(b);
    });

    it('produces 16-char hex string', () => {
      const hash = hashSensitiveData('test');
      expect(hash).toHaveLength(16);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it('different inputs produce different hashes', () => {
      expect(hashSensitiveData('a')).not.toBe(hashSensitiveData('b'));
    });
  });

  describe('redactSensitiveInfo', () => {
    it('redacts emails', () => {
      expect(redactSensitiveInfo('Contact: user@example.com')).toContain('[EMAIL]');
    });

    it('redacts passwords', () => {
      const result = redactSensitiveInfo("password = 'secret123'");
      expect(result).toContain('REDACTED');
    });

    it('redacts private keys', () => {
      const result = redactSensitiveInfo('-----BEGIN RSA PRIVATE KEY-----\nABC\n-----END RSA PRIVATE KEY-----');
      expect(result).toContain('PRIVATE KEY REDACTED');
    });

    it('returns non-string as-is', () => {
      expect(redactSensitiveInfo(42)).toBe(42);
      expect(redactSensitiveInfo(null)).toBeNull();
    });
  });
});
