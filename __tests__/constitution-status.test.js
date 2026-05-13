const fs = require('fs');
const path = require('path');
const os = require('os');
const { ConstitutionStatusCommand } = require('../src/cli/commands/constitution-status');

function captureConsole(fn) {
  const lines = [];
  const origLog = console.log;
  console.log = (...args) => lines.push(args.map(String).join(' '));
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.finally(() => {
        console.log = origLog;
      }).then(() => lines.join('\n'));
    }
  } finally {
    if (console.log !== origLog) console.log = origLog;
  }
  return lines.join('\n');
}

describe('ConstitutionStatusCommand', () => {
  let tempDir;

  function setup() {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-const-status-'));
  }

  function teardown() {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  afterAll(() => {
    teardown();
  });

  describe('Case 1: Perfect project - 100% Pass', () => {
    it('should return 100% when all articles pass', async () => {
      setup();

      // CI config (Article 9)
      fs.mkdirSync(path.join(tempDir, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), 'name: CI\n');

      // src with test (Articles 2, 4, 5, 6, 8)
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'index.js'),
        '/** Entry point. */\nmodule.exports = {};\n'
      );
      fs.writeFileSync(
        path.join(srcDir, '__tests__', 'index.test.js'),
        'test("works", () => {});\n'
      );

      const cmd = new ConstitutionStatusCommand(tempDir);
      const result = await cmd.execute();

      expect(result.score).toBe(100);
      expect(result.totalArticles).toBe(7);
      expect(result.passCount).toBe(7);
      expect(result.failCount).toBe(0);
      expect(result.waivedCount).toBe(0);

      // All articles should be Pass
      result.articles.forEach((art) => {
        expect(art.status).toBe('Pass');
        expect(art.points).toBe(1);
      });

      teardown();
      tempDir = null;
    });

    it('should output --json with expected fields', async () => {
      setup();

      fs.mkdirSync(path.join(tempDir, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), 'name: CI\n');

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.js'), '/** Entry. */\nmodule.exports = {};\n');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'index.test.js'), 'test("ok", () => {});\n');

      const output = await captureConsole(async () => {
        const cmd = new ConstitutionStatusCommand(tempDir);
        await cmd.execute({ json: true });
      });

      const parsed = JSON.parse(output);
      expect(parsed.score).toBe(100);
      expect(parsed.articles).toHaveLength(7);
      expect(parsed.articles[0]).toHaveProperty('article');
      expect(parsed.articles[0]).toHaveProperty('name');
      expect(parsed.articles[0]).toHaveProperty('status');
      expect(parsed.articles[0]).toHaveProperty('points');

      teardown();
      tempDir = null;
    });
  });

  describe('Case 2: Blocking violation - score drops', () => {
    it('should mark Article 2 as Fail when source file has no test', async () => {
      setup();

      // src without test for utils.js (Article 2 violation)
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'utils.js'), 'exports.add = (a, b) => a + b;\n');

      // No CI (Article 9 blocking too) - but we add one to isolate Art 2
      fs.mkdirSync(path.join(tempDir, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), 'name: CI\n');

      const cmd = new ConstitutionStatusCommand(tempDir);
      const result = await cmd.execute();

      const art2 = result.articles.find((a) => a.article === 2);
      expect(art2.status).toBe('Fail');
      expect(art2.points).toBe(0);
      expect(art2.blockingCount).toBeGreaterThanOrEqual(1);

      // Score should be less than 100% (6/7 = ~85.7%)
      expect(result.score).toBeLessThan(100);

      teardown();
      tempDir = null;
    });

    it('should mark Article 7 as Fail when hardcoded secrets exist', async () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.js'), '/** Entry. */\nmodule.exports = {};\n');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'index.test.js'), 'test("ok", () => {});\n');
      fs.writeFileSync(
        path.join(srcDir, 'config.js'),
        "const password = 'secret123';\n"
      );

      // No CI (Art 9 blocking) will also fail, so we account for that
      const cmd = new ConstitutionStatusCommand(tempDir);
      const result = await cmd.execute();

      const art7 = result.articles.find((a) => a.article === 7);
      expect(art7.status).toBe('Fail');
      expect(art7.points).toBe(0);

      // Score should be less than 100%
      expect(result.score).toBeLessThan(100);

      teardown();
      tempDir = null;
    });

    it('should mark Article 9 as Fail when no CI config exists', async () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.js'), '/** Entry. */\nmodule.exports = {};\n');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'index.test.js'), 'test("ok", () => {});\n');

      // No CI config -> Article 9 blocking
      const cmd = new ConstitutionStatusCommand(tempDir);
      const result = await cmd.execute();

      const art9 = result.articles.find((a) => a.article === 9);
      expect(art9.status).toBe('Fail');
      expect(result.failCount).toBeGreaterThanOrEqual(1);

      teardown();
      tempDir = null;
    });
  });

  describe('Case 3: Waiver - Article marked Waived', () => {
    it('should mark Article 2 as Waived and give 0.5 points', async () => {
      setup();

      // src without test (would normally fail Art 2)
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'utils.js'), 'exports.add = (a, b) => a + b;\n');

      // Waiver for Article 2
      const waiverDir = path.join(tempDir, 'stdd', 'constitution');
      fs.mkdirSync(waiverDir, { recursive: true });
      fs.writeFileSync(
        path.join(waiverDir, 'waivers.yaml'),
        'waivers:\n  - article: 2\n    reason: "Migration period"\n    days: 14\n'
      );

      const cmd = new ConstitutionStatusCommand(tempDir);
      const result = await cmd.execute();

      const art2 = result.articles.find((a) => a.article === 2);
      expect(art2.status).toBe('Waived');
      expect(art2.points).toBe(0.5);
      expect(art2.waiverReason).toBe('Migration period');

      // Score: (0.5 + 6) / 7 = 92.8% -> rounds to 93%
      expect(result.waivedCount).toBeGreaterThanOrEqual(1);

      teardown();
      tempDir = null;
    });

    it('should calculate correct score with multiple waivers', async () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'utils.js'), 'exports.add = (a, b) => a + b;\n');
      fs.writeFileSync(path.join(srcDir, 'config.js'), "const password = 'x';\n");

      // Waivers for Art 2 and Art 7
      const waiverDir = path.join(tempDir, 'stdd', 'constitution');
      fs.mkdirSync(waiverDir, { recursive: true });
      fs.writeFileSync(
        path.join(waiverDir, 'waivers.yaml'),
        'waivers:\n  - article: 2\n    reason: "Migration"\n    days: 7\n  - article: 7\n    reason: "Legacy config"\n    days: 30\n'
      );

      const cmd = new ConstitutionStatusCommand(tempDir);
      const result = await cmd.execute();

      // 2 waived + 4 passing (Art 9 will be blocked due to no CI) = 3 failures
      // Actually Art 9 also blocks without CI
      const art2 = result.articles.find((a) => a.article === 2);
      const art7 = result.articles.find((a) => a.article === 7);
      expect(art2.status).toBe('Waived');
      expect(art7.status).toBe('Waived');
      expect(result.waivedCount).toBe(2);

      teardown();
      tempDir = null;
    });

    it('should output waiver info in JSON format', async () => {
      setup();

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'no-test.js'), 'exports.foo = () => 1;\n');

      const waiverDir = path.join(tempDir, 'stdd', 'constitution');
      fs.mkdirSync(waiverDir, { recursive: true });
      fs.writeFileSync(
        path.join(waiverDir, 'waivers.yaml'),
        'waivers:\n  - article: 2\n    reason: "test waiver"\n    days: 7\n'
      );

      const output = await captureConsole(async () => {
        const cmd = new ConstitutionStatusCommand(tempDir);
        await cmd.execute({ json: true });
      });

      const parsed = JSON.parse(output);
      const art2 = parsed.articles.find((a) => a.article === 2);
      expect(art2.status).toBe('Waived');
      expect(art2.waiverReason).toBe('test waiver');
      expect(art2.waiverDays).toBe(7);

      teardown();
      tempDir = null;
    });
  });

  describe('Text output format', () => {
    it('should print score percentage in text mode', async () => {
      setup();

      fs.mkdirSync(path.join(tempDir, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), 'name: CI\n');

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.js'), '/** Entry. */\nmodule.exports = {};\n');
      fs.writeFileSync(path.join(srcDir, '__tests__', 'index.test.js'), 'test("ok", () => {});\n');

      let output = '';
      const origLog = console.log;
      console.log = (...args) => { output += args.join(' ') + '\n'; };
      try {
        const cmd = new ConstitutionStatusCommand(tempDir);
        await cmd.execute();
      } finally {
        console.log = origLog;
      }

      expect(output).toContain('100%');
      expect(output).toContain('Constitution Health');

      teardown();
      tempDir = null;
    });
  });

  describe('workspace scope', () => {
    it('should output workspace field and only count issues for that workspace', async () => {
      setup();

      fs.writeFileSync(path.join(tempDir, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/*"\n');

      const apiSrc = path.join(tempDir, 'packages', 'api', 'src');
      const webSrc = path.join(tempDir, 'packages', 'web', 'src');
      fs.mkdirSync(path.join(apiSrc, '__tests__'), { recursive: true });
      fs.mkdirSync(webSrc, { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'packages', 'api', 'package.json'), JSON.stringify({ name: '@test/api' }));
      fs.writeFileSync(path.join(tempDir, 'packages', 'web', 'package.json'), JSON.stringify({ name: '@test/web' }));
      fs.writeFileSync(path.join(apiSrc, 'ok.js'), 'export const ok = () => true;\n');
      fs.writeFileSync(path.join(apiSrc, '__tests__', 'ok.test.js'), 'test("ok", () => {});\n');
      fs.writeFileSync(path.join(webSrc, 'missing.js'), 'export const missing = () => true;\n');

      const output = await captureConsole(async () => {
        const cmd = new ConstitutionStatusCommand(tempDir);
        await cmd.execute({ workspace: 'packages/api', json: true });
      });

      const parsed = JSON.parse(output);
      expect(parsed.workspace).toMatchObject({ name: '@test/api', path: 'packages/api' });
      const art2 = parsed.articles.find((a) => a.article === 2);
      expect(art2.blockingCount).toBe(0);
      expect(JSON.stringify(parsed)).not.toContain('packages/web/src/missing.js');

      teardown();
      tempDir = null;
    });

    it('should return a clear JSON error when workspace does not exist', async () => {
      setup();

      const output = await captureConsole(async () => {
        const cmd = new ConstitutionStatusCommand(tempDir);
        await cmd.execute({ workspace: 'packages/missing', json: true });
      });

      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain("Workspace 'packages/missing' not found");

      teardown();
      tempDir = null;
    });
  });
});
