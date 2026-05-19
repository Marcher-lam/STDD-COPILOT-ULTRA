const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  runChecks: preRunChecks,
  isImplementationFile,
  getCorrespondingTestFile,
  checkCodeStyle,
  checkSecurity,
  formatViolationMessage,
} = require('../src/templates/hooks/pre-file-write');

const {
  analyzeCode,
  isSourceFile,
  hasDocumentation,
  hasEmptyCatch,
  hasNPlusOnePattern,
  extractBraceBody,
  formatSuggestions,
} = require('../src/templates/hooks/post-file-write');

// ========== Pre-file-write tests ==========

describe('pre-file-write.js', () => {
  describe('isImplementationFile', () => {
    test('recognizes files under /src/', () => {
      expect(isImplementationFile('/project/src/utils/helper.js')).toBe(true);
    });

    test('recognizes files under /lib/', () => {
      expect(isImplementationFile('/project/lib/parser.js')).toBe(true);
    });

    test('recognizes files under /app/', () => {
      expect(isImplementationFile('/project/app/controllers/user.js')).toBe(true);
    });

    test('recognizes files under /server/', () => {
      expect(isImplementationFile('/project/server/index.js')).toBe(true);
    });

    test('recognizes files under /modules/', () => {
      expect(isImplementationFile('/project/modules/auth/login.js')).toBe(true);
    });

    test('recognizes files under /services/', () => {
      expect(isImplementationFile('/project/services/payment.js')).toBe(true);
    });

    test('recognizes files under /components/', () => {
      expect(isImplementationFile('/project/components/Button.tsx')).toBe(true);
    });

    test('recognizes files under /pages/', () => {
      expect(isImplementationFile('/project/pages/index.js')).toBe(true);
    });

    test('excludes test files with .test. pattern', () => {
      expect(isImplementationFile('/project/src/utils/helper.test.js')).toBe(false);
    });

    test('excludes test files with .spec. pattern', () => {
      expect(isImplementationFile('/project/src/utils/helper.spec.ts')).toBe(false);
    });

    test('excludes .d.ts declaration files', () => {
      expect(isImplementationFile('/project/src/types/global.d.ts')).toBe(false);
    });

    test('does not match arbitrary directories', () => {
      expect(isImplementationFile('/project/dist/bundle.js')).toBe(false);
    });

    test('does not match root-level files', () => {
      expect(isImplementationFile('config.js')).toBe(false);
    });
  });

  describe('getCorrespondingTestFile', () => {
    let tmpDir;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-hook-test-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('returns co-located .test.js file as first candidate', () => {
      const implPath = path.join(tmpDir, 'src', 'utils.js');
      const result = getCorrespondingTestFile(implPath);
      expect(result).toBe(path.join(tmpDir, 'src', 'utils.test.js'));
    });

    test('returns existing .spec.ts file over missing .test.ts', () => {
      const implPath = path.join(tmpDir, 'src', 'widget.ts');
      const specPath = path.join(tmpDir, 'src', 'widget.spec.ts');
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      fs.writeFileSync(specPath, '');

      const result = getCorrespondingTestFile(implPath);
      expect(result).toBe(specPath);
    });

    test('finds test in __tests__/ nested in source dir', () => {
      const implPath = path.join(tmpDir, 'src', 'module.js');
      const testsDir = path.join(tmpDir, 'src', '__tests__');
      fs.mkdirSync(testsDir, { recursive: true });
      const testPath = path.join(testsDir, 'module.test.js');
      fs.writeFileSync(testPath, '');

      const result = getCorrespondingTestFile(implPath);
      expect(result).toBe(testPath);
    });

    test('handles Python _test.py naming', () => {
      const implPath = path.join(tmpDir, 'src', 'calculator.py');
      const result = getCorrespondingTestFile(implPath);
      expect(result).toMatch(/calculator_test\.py$/);
    });

    test('handles Go _test.go naming', () => {
      const implPath = path.join(tmpDir, 'src', 'handler.go');
      const result = getCorrespondingTestFile(implPath);
      expect(result).toMatch(/handler_test\.go$/);
    });
  });

  describe('checkSecurity', () => {
    test('detects hardcoded password', () => {
      const violations = checkSecurity('const password = "supersecret123";');
      expect(violations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: expect.stringContaining('password') })
        ])
      );
    });

    test('detects hardcoded API key', () => {
      const violations = checkSecurity('api_key = "sk-abc123def456";');
      expect(violations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: expect.stringContaining('API key') })
        ])
      );
    });

    test('detects hardcoded secret', () => {
      const violations = checkSecurity('const secret = "mysecretvalue";');
      expect(violations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: expect.stringContaining('secret') })
        ])
      );
    });

    test('detects hardcoded token', () => {
      const violations = checkSecurity('const token = "abcdefghij1234567890XYZ";');
      expect(violations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: expect.stringContaining('token') })
        ])
      );
    });

    test('does not flag env variable access as hardcoded', () => {
      const violations = checkSecurity('const password = process.env.PASSWORD;');
      expect(violations).toEqual([]);
    });

    test('does not flag process.env references', () => {
      const violations = checkSecurity('apiKey = process.env.API_KEY;');
      expect(violations).toEqual([]);
    });
  });

  describe('checkCodeStyle', () => {
    test('warns on files over 500 lines', () => {
      const longContent = Array(501).fill('console.log("line");').join('\n');
      const violations = checkCodeStyle(longContent);
      expect(violations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ article: 4, level: 'warning' })
        ])
      );
    });

    test('no warning for files under 500 lines', () => {
      const shortContent = 'const x = 1;';
      const violations = checkCodeStyle(shortContent);
      expect(violations).toEqual([]);
    });
  });

  describe('runChecks', () => {
    test('returns block false for non-Write/Edit tools', async () => {
      const result = await preRunChecks({ tool_name: 'Read', tool_input: {} });
      expect(result.block).toBe(false);
    });

    test('blocks when test file is missing for implementation file', async () => {
      const result = await preRunChecks({
        tool_name: 'Write',
        tool_input: {
          file_path: '/nonexistent/src/feature.js',
          content: 'const x = 1;',
        },
      });
      expect(result.block).toBe(true);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    test('does not block non-implementation files', async () => {
      const result = await preRunChecks({
        tool_name: 'Write',
        tool_input: {
          file_path: '/project/docs/README.md',
          content: '# Hello',
        },
      });
      expect(result.block).toBe(false);
    });

    test('blocks on hardcoded secrets', async () => {
      const result = await preRunChecks({
        tool_name: 'Edit',
        tool_input: {
          file_path: '/project/docs/config.md',
          new_string: 'const secret = "hardcoded-value";',
        },
      });
      expect(result.block).toBe(true);
    });
  });

  describe('formatViolationMessage', () => {
    test('formats errors and warnings', () => {
      const violations = [
        { article: 2, level: 'error', message: 'No test', suggestion: 'Write test' },
        { article: 4, level: 'warning', message: 'Too long' },
      ];
      const msg = formatViolationMessage(violations);
      expect(msg).toContain('Blocking Issues');
      expect(msg).toContain('Article 2');
      expect(msg).toContain('Warnings');
      expect(msg).toContain('Article 4');
    });

    test('only errors section when no warnings', () => {
      const violations = [
        { article: 7, level: 'error', message: 'Secret', suggestion: 'Use env' },
      ];
      const msg = formatViolationMessage(violations);
      expect(msg).toContain('Blocking Issues');
      expect(msg).not.toContain('Warnings');
    });
  });
});

// ========== Post-file-write tests ==========

describe('post-file-write.js', () => {
  describe('isSourceFile', () => {
    test('recognizes .ts files', () => {
      expect(isSourceFile('app.ts')).toBe(true);
    });

    test('recognizes .js files', () => {
      expect(isSourceFile('app.js')).toBe(true);
    });

    test('recognizes .py files', () => {
      expect(isSourceFile('app.py')).toBe(true);
    });

    test('recognizes .go files', () => {
      expect(isSourceFile('app.go')).toBe(true);
    });

    test('recognizes .java files', () => {
      expect(isSourceFile('App.java')).toBe(true);
    });

    test('does not match .md files', () => {
      expect(isSourceFile('README.md')).toBe(false);
    });

    test('does not match .json files', () => {
      expect(isSourceFile('package.json')).toBe(false);
    });
  });

  describe('hasDocumentation', () => {
    test('recognizes JSDoc block comments', () => {
      const content = '/**\n * Adds two numbers\n * @param {number} a\n */\nfunction add(a, b) {}';
      expect(hasDocumentation(content)).toBe(true);
    });

    test('recognizes single-line // comments with 10+ chars', () => {
      const content = '// This is a long enough comment that explains something\nconst x = 1;';
      expect(hasDocumentation(content)).toBe(true);
    });

    test('does not count short // comments', () => {
      const content = '// short\nconst x = 1;';
      expect(hasDocumentation(content)).toBe(false);
    });

    test('recognizes /* */ block comments', () => {
      const content = '/* This is a regular block comment for documentation */\nconst x = 1;';
      expect(hasDocumentation(content)).toBe(true);
    });

    test('returns false for code with no comments', () => {
      expect(hasDocumentation('const x = 1;\nconst y = 2;')).toBe(false);
    });

    test('returns false for empty content', () => {
      expect(hasDocumentation('')).toBe(false);
    });

    test('recognizes inline // comment with exactly 10 chars after //', () => {
      expect(hasDocumentation('// 1234567890\n')).toBe(true);
    });

    test('does not count // comments with only 9 chars after //', () => {
      expect(hasDocumentation('// short\n')).toBe(false);
    });
  });

  describe('hasEmptyCatch', () => {
    test('detects empty catch block', () => {
      expect(hasEmptyCatch('try { foo(); } catch (e) {}')).toBe(true);
    });

    test('does not flag catch with error handling', () => {
      expect(hasEmptyCatch('try { foo(); } catch (e) { console.error(e); }')).toBe(false);
    });
  });

  describe('hasNPlusOnePattern', () => {
    test('detects for loop with await db call inside', () => {
      const code = `for (const id of ids) {
        const user = await db.findById(id);
        results.push(user);
      }`;
      expect(hasNPlusOnePattern(code)).toBe(true);
    });

    test('detects for-of with findMany', () => {
      const code = `for (const batch of batches) {
        const items = await db.findMany({ where: { batchId: batch.id } });
      }`;
      expect(hasNPlusOnePattern(code)).toBe(true);
    });

    test('detects while loop with findOne', () => {
      const code = `while (hasNext()) {
        const record = await db.findOne({ id: cursor });
      }`;
      expect(hasNPlusOnePattern(code)).toBe(true);
    });

    test('detects for loop with query call', () => {
      const code = `for (let i = 0; i < items.length; i++) {
        const result = await db.query('SELECT * FROM users WHERE id = $1', [items[i]]);
      }`;
      expect(hasNPlusOnePattern(code)).toBe(true);
    });

    test('detects for loop with select call', () => {
      const code = `for (const user of users) {
        const orders = await db.select().from('orders').where('userId', user.id);
      }`;
      expect(hasNPlusOnePattern(code)).toBe(true);
    });

    test('detects for loop with findAll call', () => {
      const code = `for (const group of groups) {
        const members = await repo.findAll({ groupId: group.id });
      }`;
      expect(hasNPlusOnePattern(code)).toBe(true);
    });

    test('does not flag loop without db call in body', () => {
      const code = `for (const item of items) {
        console.log(item);
      }
      const all = await db.findMany();`;
      expect(hasNPlusOnePattern(code)).toBe(false);
    });

    test('does not flag standalone db call without loop', () => {
      expect(hasNPlusOnePattern('const users = await db.findMany({ active: true });')).toBe(false);
    });

    test('does not flag unrelated loop', () => {
      const code = `for (let i = 0; i < 10; i++) {
        sum += i;
      }`;
      expect(hasNPlusOnePattern(code)).toBe(false);
    });
  });

  describe('extractBraceBody', () => {
    test('extracts simple brace body', () => {
      const result = extractBraceBody('{ return 1; }', 1);
      expect(result).toBe(' return 1; ');
    });

    test('handles nested braces', () => {
      const result = extractBraceBody('{ if (x) { y; } }', 1);
      expect(result).toBe(' if (x) { y; } ');
    });
  });

  describe('analyzeCode', () => {
    test('returns empty for non-Write/Edit tools', async () => {
      const result = await analyzeCode({ tool_name: 'Read', tool_input: {} });
      expect(result).toEqual([]);
    });

    test('detects missing documentation in source file', async () => {
      const result = await analyzeCode({
        tool_name: 'Write',
        tool_input: {
          file_path: '/project/src/utils.js',
          content: 'const x = 1;',
        },
      });
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ article: 5 })
        ])
      );
    });

    test('detects empty catch block', async () => {
      const result = await analyzeCode({
        tool_name: 'Edit',
        tool_input: {
          file_path: '/project/src/handler.js',
          new_string: 'try { foo(); } catch (e) {}',
        },
      });
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ article: 6 })
        ])
      );
    });

    test('detects N+1 pattern', async () => {
      const result = await analyzeCode({
        tool_name: 'Write',
        tool_input: {
          file_path: '/project/src/service.js',
          content: 'for (const id of ids) {\n  await db.findById(id);\n}',
        },
      });
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ article: 8 })
        ])
      );
    });

    test('no suggestions for well-written code', async () => {
      const result = await analyzeCode({
        tool_name: 'Write',
        tool_input: {
          file_path: '/project/src/good.js',
          content: '/** Adds two numbers */\nfunction add(a, b) { return a + b; }',
        },
      });
      expect(result).toEqual([]);
    });
  });

  describe('formatSuggestions', () => {
    test('formats suggestions with icons', () => {
      const suggestions = [
        { article: 5, level: 'suggestion', message: 'No docs', suggestion: 'Add JSDoc' },
        { article: 6, level: 'warning', message: 'Empty catch', suggestion: 'Handle error' },
      ];
      const msg = formatSuggestions(suggestions);
      expect(msg).toContain('Suggestion Article 5');
      expect(msg).toContain('Warning Article 6');
      expect(msg).toContain('Add JSDoc');
    });
  });
});
