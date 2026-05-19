const fs = require('fs');
const os = require('os');
const path = require('path');
const { ConstitutionChecker } = require('../src/cli/commands/constitution-checker');

function tmpProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-r23-constitution-'));
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  return dir;
}

function cleanup(dir) {
  if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

describe('round23 constitution-checker branch coverage boosters', () => {
  test('style checker covers eslint/prettier/tslint and fallback line-count branches', () => {
    const cases = [
      { dep: 'eslint', expected: 'eslint' },
      { dep: 'prettier', expected: 'prettier' },
      { dep: 'tslint', expected: 'tslint' },
    ];

    for (const { dep, expected } of cases) {
      const dir = tmpProject();
      try {
        fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ devDependencies: { [dep]: '1.0.0' } }));
        fs.writeFileSync(path.join(dir, 'src', 'index.js'), 'const x = 1;\n');
        const checker = new ConstitutionChecker(dir);
        const linter = checker.detectLinter(path.join(dir, 'src'));
        expect(linter.type).toBe(expected);
      } finally {
        cleanup(dir);
      }
    }

    const fallbackDir = tmpProject();
    try {
      fs.writeFileSync(path.join(fallbackDir, 'src', 'huge.js'), Array.from({ length: 501 }, () => 'const x = 1;').join('\n'));
      const checker = new ConstitutionChecker(fallbackDir);
      checker.checkArticle4Style();
      expect(checker.issues.warning.some(w => w.message.includes('File too long'))).toBe(true);
    } finally {
      cleanup(fallbackDir);
    }
  });

  test('detectLinter covers python and ruby spawnExists branches', () => {
    const dir = tmpProject();
    try {
      fs.writeFileSync(path.join(dir, 'src', 'app.py'), 'print("hi")\n');
      fs.writeFileSync(path.join(dir, 'src', 'app.rb'), 'puts "hi"\n');
      const checker = new ConstitutionChecker(dir);
      const calls = [];
      checker.spawnExists = jest.fn((cmd) => {
        calls.push(cmd);
        return cmd === 'flake8' || cmd === 'rubocop';
      });
      expect(checker.detectLinter(path.join(dir, 'src')).type).toBe('flake8');
      fs.rmSync(path.join(dir, 'src', 'app.py'));
      checker.findSourceFiles = jest.fn(() => [path.join(dir, 'src', 'app.rb')]);
      expect(checker.detectLinter(path.join(dir, 'src')).type).toBe('rubocop');
      expect(calls).toEqual(expect.arrayContaining(['pylint', 'flake8', 'rubocop']));
    } finally {
      cleanup(dir);
    }
  });

  test('security checker covers skip dirs, lockfile, http, SQL, NoSQL and python audit branches', () => {
    const dir = tmpProject();
    try {
      fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'sec', dependencies: { leftpad: '1.0.0' } }));
      fs.writeFileSync(path.join(dir, 'package-lock.json'), '{}');
      fs.mkdirSync(path.join(dir, 'node_modules', 'bad'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'node_modules', 'bad', 'secret.js'), 'const password = "ignored";');
      fs.writeFileSync(path.join(dir, 'src', 'security.js'), [
        'const password = "pw";',
        'const apiKey = "key";',
        'const secret = "secret";',
        'fetch("http://not-local.test/api");',
        'const q = `SELECT * FROM users WHERE id=${id}`;',
        'User.find("name=" + input);',
      ].join('\n'));
      const checker = new ConstitutionChecker(dir);
      checker._scanDependencyVulnerabilities = jest.fn();
      checker.checkArticle7Security();
      const all = checker.issues.blocking.concat(checker.issues.warning).map(i => i.message).join('\n');
      expect(all).toContain('Hardcoded secret');
      expect(all).toContain('Insecure HTTP endpoint');
      expect(all).toContain('SQL/NoSQL Injection');
      expect(all).toContain('NoSQL Injection');
      expect(all).not.toContain('ignored');
    } finally {
      cleanup(dir);
    }

    const pyDir = tmpProject();
    try {
      fs.rmSync(path.join(pyDir, 'src'), { recursive: true, force: true });
      fs.writeFileSync(path.join(pyDir, 'requirements.txt'), 'django==1.0.0\n');
      const checker = new ConstitutionChecker(pyDir);
      checker.checkArticle7Security();
      expect(checker.issues.warning.some(w => w.message.includes('pip-audit'))).toBe(true);
    } finally {
      cleanup(pyDir);
    }
  });

  test('error handling checker covers JS comments-only catch, Python pass, and console branches', () => {
    const dir = tmpProject();
    try {
      fs.writeFileSync(path.join(dir, 'src', 'errors.js'), [
        'console.log("debug");',
        'try { risky(); } catch (err) { }',
        'try { risky(); } catch (err) { // ignored intentionally }',
      ].join('\n'));
      fs.writeFileSync(path.join(dir, 'src', 'errors.py'), [
        'try:',
        '    risky()',
        'except Exception:',
        '    pass',
      ].join('\n'));
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle6ErrorHandling();
      const messages = checker.issues.warning.map(w => w.message).join('\n');
      expect(messages).toContain('console.log');
      expect(messages).toContain('empty catch block');
      expect(messages).toContain('empty except block');
    } finally {
      cleanup(dir);
    }
  });

  test('performance checker covers nested loops, while variants, sync fs and n+1 branches', () => {
    const dir = tmpProject();
    try {
      fs.writeFileSync(path.join(dir, 'src', 'perf.js'), [
        'for (const a of arr) {',
        '  for (const b of arr2) { console.log(a,b); }',
        '}',
        'while (running) { work(); }',
        'while (i < 10) { i++; }',
        'fs.readFileSync("x");',
        'for (const id of ids) { prisma.user.findUnique({ where: { id } }); }',
        'items.map((item) => { db.query(item.id); });',
      ].join('\n'));
      const checker = new ConstitutionChecker(dir);
      checker.checkArticle8Performance();
      const messages = checker.issues.warning.map(w => w.message).join('\n');
      expect(messages).toContain('Nested loop');
      expect(messages).toContain('while loop without');
      expect(messages).toContain('Synchronous fs call');
      expect(messages).toContain('Potential N+1 query');
    } finally {
      cleanup(dir);
    }
  });

  test('CI/CD checker covers missing CI with test script, existing CI, invalid package JSON and waiver branch', () => {
    const missingDir = tmpProject();
    try {
      fs.writeFileSync(path.join(missingDir, 'package.json'), JSON.stringify({ scripts: { test: 'jest' } }));
      const checker = new ConstitutionChecker(missingDir);
      checker.checkArticle9SchemaValidity = jest.fn();
      checker.checkArticle9CICD();
      const messages = checker.issues.blocking.concat(checker.issues.warning).map(i => i.message).join('\n');
      expect(messages).toContain('Missing CI Configuration');
      expect(messages).toContain('test script but no CI');
    } finally {
      cleanup(missingDir);
    }

    const ciDir = tmpProject();
    try {
      fs.mkdirSync(path.join(ciDir, '.github', 'workflows'), { recursive: true });
      const checker = new ConstitutionChecker(ciDir);
      checker.checkArticle9SchemaValidity = jest.fn();
      checker.checkArticle9CICD();
      expect(checker.issues.blocking.some(i => i.message.includes('Missing CI'))).toBe(false);
    } finally {
      cleanup(ciDir);
    }

    const waivedDir = tmpProject();
    try {
      const checker = new ConstitutionChecker(waivedDir);
      checker.waivers.add(9);
      checker.checkArticle9CICD();
      expect(checker.issues.skipped).toEqual(expect.arrayContaining([expect.objectContaining({ article: 9 })]));
    } finally {
      cleanup(waivedDir);
    }
  });
});
