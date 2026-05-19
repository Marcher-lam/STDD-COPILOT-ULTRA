const fs = require('fs');
const path = require('path');
const os = require('os');
const { LearnCommand } = require('../src/cli/commands/learn');

function setupSrc() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-learn-'));
  const src = path.join(tmp, 'src');
  fs.mkdirSync(src);
  fs.writeFileSync(path.join(src, 'index.js'), 'const express = require("express");\nmodule.exports = { hello };\nasync function hello() { return await fetch("/api"); }\n');
  fs.writeFileSync(path.join(src, 'utils.js'), 'function add(a, b) { return a + b; }\n// TODO: refactor\n');
  return tmp;
}

function setupLib() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-learn-'));
  const lib = path.join(tmp, 'lib');
  fs.mkdirSync(lib);
  fs.writeFileSync(path.join(lib, 'helper.py'), 'def add(a, b):\n    return a + b\nimport pytest\n');
  return tmp;
}

describe('LearnCommand', () => {
  it('scan writes code-patterns.json and styleguide.md', () => {
    const tmp = setupSrc();
    const cmd = new LearnCommand(tmp);
    const result = cmd.execute('scan');
    expect(result.generatedAt).toBeDefined();
    expect(fs.existsSync(path.join(tmp, 'stdd', 'memory', 'learning', 'code-patterns.json'))).toBe(true);
    expect(fs.existsSync(path.join(tmp, 'stdd', 'memory', 'learning', 'styleguide.md'))).toBe(true);
  });

  it('status returns current patterns', () => {
    const tmp = setupSrc();
    const cmd = new LearnCommand(tmp);
    cmd.execute('scan');
    const result = cmd.execute('status');
    expect(result.patterns).toBeDefined();
    expect(result.feedbackCount).toBe(0);
  });

  it('good records feedback', () => {
    const tmp = setupSrc();
    const cmd = new LearnCommand(tmp);
    cmd.execute('scan');
    const result = cmd.execute('good', ['nice naming']);
    expect(result).toBeDefined();
  });

  it('bad records feedback', () => {
    const tmp = setupSrc();
    const cmd = new LearnCommand(tmp);
    cmd.execute('scan');
    const result = cmd.execute('bad', ['ugly code']);
    expect(result).toBeDefined();
  });

  it('throws on empty feedback', () => {
    const tmp = setupSrc();
    const cmd = new LearnCommand(tmp);
    cmd.execute('scan');
    expect(() => cmd.execute('good', [])).toThrow();
  });

  it('scan outputs json when options.json is true', () => {
    const tmp = setupSrc();
    const cmd = new LearnCommand(tmp);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const result = cmd.execute('scan', [], { json: true });
      expect(result.generatedAt).toBeDefined();
      // Verify JSON was logged
      expect(logSpy.mock.calls.some(call => {
        try { JSON.parse(call[0]); return true; } catch { return false; }
      })).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('scan outputs formatted text when options.json is false', () => {
    const tmp = setupSrc();
    const cmd = new LearnCommand(tmp);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      cmd.execute('scan', [], { json: false });
      expect(logSpy.mock.calls.some(call => String(call[0]).includes('Pattern Teaching Scan'))).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('status outputs json when options.json is true', () => {
    const tmp = setupSrc();
    const cmd = new LearnCommand(tmp);
    cmd.execute('scan');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      cmd.execute('status', [], { json: true });
      expect(logSpy.mock.calls.some(call => {
        try { const parsed = JSON.parse(call[0]); return parsed.patterns !== undefined; } catch { return false; }
      })).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('status shows missing patterns message when no scan done', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-learn-'));
    const cmd = new LearnCommand(tmp);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const result = cmd.execute('status', [], { json: false });
      expect(result.patterns).toBeNull();
      expect(logSpy.mock.calls.some(call => String(call[0]).includes('missing; run stdd learn scan'))).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('records feedback with json output', () => {
    const tmp = setupSrc();
    const cmd = new LearnCommand(tmp);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const result = cmd.execute('good', ['nice patterns'], { json: true });
      expect(result.kind).toBe('good');
      expect(result.feedback).toBe('nice patterns');
      expect(logSpy.mock.calls.some(call => {
        try { const parsed = JSON.parse(call[0]); return parsed.kind === 'good'; } catch { return false; }
      })).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('records suggest feedback', () => {
    const tmp = setupSrc();
    const cmd = new LearnCommand(tmp);
    const result = cmd.execute('suggest', ['use camelCase']);
    expect(result.kind).toBe('suggest');
  });

  it('execute with analyze-patterns alias triggers scan', () => {
    const tmp = setupSrc();
    const cmd = new LearnCommand(tmp);
    const result = cmd.execute('analyze-patterns');
    expect(result.generatedAt).toBeDefined();
  });

  it('execute with list alias triggers status', () => {
    const tmp = setupSrc();
    const cmd = new LearnCommand(tmp);
    cmd.execute('scan');
    const result = cmd.execute('list');
    expect(result).toHaveProperty('patterns');
  });

  it('execute with default action returns status', () => {
    const tmp = setupSrc();
    const cmd = new LearnCommand(tmp);
    const result = cmd.execute();
    expect(result).toHaveProperty('patterns');
  });

  it('extractPatterns handles unreadable files gracefully', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-learn-'));
    const src = path.join(tmp, 'src');
    fs.mkdirSync(src);
    // Create a file, then make it unreadable (on posix)
    const restrictedFile = path.join(src, 'restricted.js');
    fs.writeFileSync(restrictedFile, 'const x = 1;');
    // Remove read permissions
    try {
      fs.chmodSync(restrictedFile, 0o000);
      const cmd = new LearnCommand(tmp);
      const result = cmd.extractPatterns([restrictedFile]);
      // Should not throw, file is skipped
      expect(result.filesAnalyzed).toBe(1);
    } finally {
      // Restore permissions so cleanup can work
      try { fs.chmodSync(restrictedFile, 0o644); } catch {}
    }
  });

  it('extractPatterns with empty file list returns 0 confidence', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-learn-'));
    const cmd = new LearnCommand(tmp);
    const result = cmd.extractPatterns([]);
    expect(result.filesAnalyzed).toBe(0);
    expect(result.confidence).toBe(0);
  });

  it('calculateConfidence returns 0 for zero files', () => {
    const cmd = new LearnCommand('/nonexistent');
    expect(cmd.calculateConfidence({ filesAnalyzed: 0 })).toBe(0);
  });

  it('calculateConfidence increases with module style data', () => {
    const cmd = new LearnCommand('/nonexistent');
    const data = {
      filesAnalyzed: 5,
      moduleStyle: { commonjs: 3, esm: 0 },
      testStyle: { jestVitest: 0, pytest: 0, goTest: 0, rustTest: 0 },
      naming: { camelCase: 0, PascalCase: 0, snake_case: 0 },
      errorHandling: { tryCatch: 0, throws: 0, resultObjects: 0 },
    };
    const score = cmd.calculateConfidence(data);
    expect(score).toBeGreaterThanOrEqual(60);
  });

  it('calculateConfidence maxes at 100', () => {
    const cmd = new LearnCommand('/nonexistent');
    const data = {
      filesAnalyzed: 100,
      moduleStyle: { commonjs: 50, esm: 50 },
      testStyle: { jestVitest: 30, pytest: 10, goTest: 5, rustTest: 5 },
      naming: { camelCase: 50, PascalCase: 50, snake_case: 50 },
      errorHandling: { tryCatch: 10, throws: 5, resultObjects: 5 },
    };
    const score = cmd.calculateConfidence(data);
    expect(score).toBe(100);
  });

  it('renderStyleguide produces markdown with all sections', () => {
    const tmp = setupSrc();
    const cmd = new LearnCommand(tmp);
    const patterns = cmd.execute('scan');
    const md = cmd.renderStyleguide(patterns);
    expect(md).toContain('# Learned Code Patterns');
    expect(md).toContain('Files analyzed:');
    expect(md).toContain('Confidence:');
    expect(md).toContain('Module style:');
    expect(md).toContain('Test style:');
  });

  it('scan finds files in lib directory', () => {
    const tmp = setupLib();
    const cmd = new LearnCommand(tmp);
    const result = cmd.execute('scan');
    expect(result.filesAnalyzed).toBeGreaterThanOrEqual(1);
  });

  it('scan handles project with no source directories', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-learn-'));
    const cmd = new LearnCommand(tmp);
    const result = cmd.execute('scan');
    expect(result.filesAnalyzed).toBe(0);
    expect(result.confidence).toBe(0);
  });

  it('status returns feedbackCount from existing feedback file', () => {
    const tmp = setupSrc();
    const cmd = new LearnCommand(tmp);
    cmd.execute('good', ['first feedback']);
    cmd.execute('bad', ['second feedback']);
    const result = cmd.execute('status');
    expect(result.feedbackCount).toBe(2);
  });

  it('ensureLearningDir creates the directory structure', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-learn-'));
    const cmd = new LearnCommand(tmp);
    const dir = cmd.ensureLearningDir();
    expect(fs.existsSync(dir)).toBe(true);
    expect(dir).toContain('stdd');
    expect(dir).toContain('memory');
    expect(dir).toContain('learning');
  });
});
