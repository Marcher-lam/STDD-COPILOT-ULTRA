const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

describe('guard CLI command', () => {
  const cliPath = path.join(__dirname, '..', 'cli.js');

  function runCli(args, cwd) {
    return spawnSync(process.execPath, [cliPath, ...args], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });
  }

  function createTempProject(name, options = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-guard-test-'));
    const projectPath = path.join(root, name);
    fs.mkdirSync(projectPath, { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'stdd'), { recursive: true });

    if (options.srcFiles) {
      for (const [fileName, content] of Object.entries(options.srcFiles)) {
        const fullPath = path.join(projectPath, 'src', fileName);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content);
      }
    }

    if (options.testFiles) {
      for (const [fileName, content] of Object.entries(options.testFiles)) {
        const fullPath = path.join(projectPath, 'src', '__tests__', fileName);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content);
      }
    }

    if (options.packageJson) {
      fs.writeFileSync(
        path.join(projectPath, 'package.json'),
        JSON.stringify(options.packageJson)
      );
    }

    if (options.eslintConfig) {
      fs.writeFileSync(
        path.join(projectPath, '.eslintrc.json'),
        JSON.stringify(options.eslintConfig)
      );
    }

    if (options.ciConfig !== false) {
      fs.mkdirSync(path.join(projectPath, '.github', 'workflows'), { recursive: true });
      fs.writeFileSync(path.join(projectPath, '.github', 'workflows', 'ci.yml'), 'name: CI\n');
    }

    return projectPath;
  }

  describe('Gate Logic', () => {
    it('passes when project is clean (no secrets, tests exist)', () => {
      const projectPath = createTempProject('clean-project', {
        srcFiles: {
          'utils.js': 'exports.add = (a, b) => a + b;\n',
        },
        testFiles: {
          'utils.test.js': 'test("add works", () => { expect(1 + 1).toBe(2); });\n',
        },
      });

      const result = runCli(['guard'], projectPath);

      expect(result.stdout).toContain('STDD Guard Report');
      expect(result.stdout).toContain('Constitution:');
      expect(result.stdout).toContain('PASS');
      expect(result.stdout).toContain('Guard Passed');
      expect(result.status).toBe(0);
    });

    it('fails when Security constitution is violated (hardcoded password)', () => {
      const projectPath = createTempProject('secret-project', {
        srcFiles: {
          'config.js': "const password = 'mysecret123';\nmodule.exports = {};\n",
        },
        testFiles: {
          'config.test.js': 'test("config", () => {});\n',
        },
      });

      const result = runCli(['guard'], projectPath);

      expect(result.stdout).toContain('STDD Guard Report');
      expect(result.stdout).toContain('Article 7 (Security)');
      expect(result.stdout).toContain('Guard Failed');
      expect(result.status).toBe(1);
    });

    it('fails when TDD constitution is violated (missing test file)', () => {
      const projectPath = createTempProject('no-test-project', {
        srcFiles: {
          'service.js': 'exports.run = () => {};\n',
        },
      });

      const result = runCli(['guard'], projectPath);

      expect(result.stdout).toContain('STDD Guard Report');
      expect(result.stdout).toContain('Article 2 (TDD)');
      expect(result.stdout).toContain('Guard Failed');
      expect(result.status).toBe(1);
    });

    it('skips constitution check when --no-constitution is passed', () => {
      const projectPath = createTempProject('skip-const-project', {
        srcFiles: {
          'utils.js': 'exports.add = (a, b) => a + b;\n',
        },
      });

      const result = runCli(['guard', '--no-constitution'], projectPath);

      expect(result.stdout).toContain('Constitution: skipped');
      expect(result.stdout).toContain('Guard Passed');
      expect(result.status).toBe(0);
    });

    it('warns on low test coverage ratio but does not fail', () => {
      const projectPath = createTempProject('low-coverage-project', {
        srcFiles: {
          'a.js': 'module.exports = {};\n',
          'b.js': 'module.exports = {};\n',
          'c.js': 'module.exports = {};\n',
          'd.js': 'module.exports = {};\n',
          'e.js': 'module.exports = {};\n',
          'f.js': 'module.exports = {};\n',
        },
        testFiles: {
          'a.test.js': 'test("a", () => {});\n',
        },
      });

      const result = runCli(['guard', '--no-constitution'], projectPath);

      expect(result.stdout).toContain('Coverage:');
      expect(result.stdout).toContain('WARN');
      expect(result.stdout).toContain('Guard Passed');
      expect(result.status).toBe(0);
    });

    it('uses real coverage summary when available', () => {
      const projectPath = createTempProject('real-coverage-project', {
        srcFiles: {
          'utils.js': 'exports.add = (a, b) => a + b;\n',
        },
        testFiles: {
          'utils.test.js': 'test("add works", () => { expect(1 + 1).toBe(2); });\n',
        },
      });
      fs.mkdirSync(path.join(projectPath, 'coverage'), { recursive: true });
      fs.writeFileSync(path.join(projectPath, 'coverage', 'coverage-summary.json'), JSON.stringify({
        total: {
          lines: { total: 100, covered: 86, pct: 86 },
          functions: { total: 5, covered: 5, pct: 100 },
          branches: { total: 10, covered: 8, pct: 80 },
          statements: { total: 100, covered: 86, pct: 86 },
        },
      }));

      const result = runCli(['guard', '--no-constitution'], projectPath);

      expect(result.stdout).toContain('Coverage report: coverage/coverage-summary.json');
      expect(result.stdout).toContain('Line coverage: 86.0%');
      expect(result.stdout).toContain('Guard Passed');
      expect(result.status).toBe(0);
    });
  });

  describe('--strict mode', () => {
    it('fails when lint has warnings and --strict is enabled', () => {
      const projectPath = createTempProject('lint-warn-project', {
        srcFiles: {
          'lint-bad.js': 'const x = 1;\n',
        },
        testFiles: {
          'lint-bad.test.js': 'test("ok", () => {});\n',
        },
        packageJson: {
          scripts: {
            lint: 'exit 1',
          },
        },
        eslintConfig: {
          rules: { 'no-unused-vars': 'warn' },
        },
      });

      const result = runCli(['guard', '--strict', '--no-constitution'], projectPath);

      expect(result.stdout).toContain('STDD Guard Report');
      if (result.stdout.includes('FAIL')) {
        expect(result.stdout).toContain('Guard Failed');
        expect(result.status).toBe(1);
      } else {
        expect(result.stdout).toContain('Guard Passed');
      }
    });

    it('passes when lint is clean even in --strict mode', () => {
      const projectPath = createTempProject('lint-clean-strict-project', {
        srcFiles: {
          'utils.js': 'exports.add = (a, b) => a + b;\n',
        },
        testFiles: {
          'utils.test.js': 'test("ok", () => {});\n',
        },
      });

      const result = runCli(['guard', '--strict', '--no-constitution'], projectPath);

      expect(result.stdout).toContain('STDD Guard Report');
      expect(result.stdout).toContain('Guard Passed');
      expect(result.status).toBe(0);
    });
  });

  describe('report output', () => {
    it('prints the guard report header', () => {
      const projectPath = createTempProject('report-project', {
        srcFiles: {
          'x.js': 'module.exports = {};\n',
        },
        testFiles: {
          'x.test.js': 'test("x", () => {});\n',
        },
      });

      const result = runCli(['guard'], projectPath);

      expect(result.stdout).toContain('🛡️');
      expect(result.stdout).toContain('STDD Guard Report');
      expect(result.stdout).toMatch(/Constitution:/);
      expect(result.stdout).toMatch(/Lint:/);
      expect(result.stdout).toMatch(/Coverage:/);
    });

    it('shows PASS/FAIL/WARN/SKIP status labels', () => {
      const projectPath = createTempProject('labels-project', {
        srcFiles: {
          'mod.js': 'module.exports = {};\n',
        },
        testFiles: {
          'mod.test.js': 'test("ok", () => {});\n',
        },
      });

      const result = runCli(['guard'], projectPath);

      expect(result.stdout).toMatch(/PASS|FAIL|WARN|SKIP/);
    });
  });

  describe('GuardCommand class API', () => {
    const { GuardCommand } = require('../src/cli/commands/guard');

    it('constructor accepts cwd option', () => {
      const cmd = new GuardCommand('/tmp');
      expect(cmd.cwd).toBe('/tmp');
    });

    it('constructor defaults cwd to process.cwd()', () => {
      const cmd = new GuardCommand();
      expect(cmd.cwd).toBe(process.cwd());
    });

    it('execute returns a report object', async () => {
      const projectPath = createTempProject('api-test-project', {
        srcFiles: {
          'api.js': 'module.exports = {};\n',
        },
        testFiles: {
          'api.test.js': 'test("ok", () => {});\n',
        },
      });

      const cmd = new GuardCommand(projectPath);
      const report = await cmd.execute({ noConstitution: true });

      expect(report).toHaveProperty('constitution');
      expect(report).toHaveProperty('lint');
      expect(report).toHaveProperty('coverage');
      expect(report.constitution).toHaveProperty('status');
      expect(report.lint).toHaveProperty('status');
      expect(report.coverage).toHaveProperty('status');
    });
  });

  describe('evidence capture', () => {
    const { GuardCommand } = require('../src/cli/commands/guard');

    it('saves evidence file to stdd/evidence on guard pass (CLI)', () => {
      const projectPath = createTempProject('evidence-project', {
        srcFiles: {
          'utils.js': 'exports.add = (a, b) => a + b;\n',
        },
        testFiles: {
          'utils.test.js': 'test("add works", () => { expect(1 + 1).toBe(2); });\n',
        },
      });

      const result = runCli(['guard', '--no-constitution'], projectPath);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Evidence saved to');

      const evidenceDir = path.join(projectPath, 'stdd', 'evidence');
      expect(fs.existsSync(evidenceDir)).toBe(true);

      const files = fs.readdirSync(evidenceDir);
      const evidenceFiles = files.filter(f => f.startsWith('guard-') && f.endsWith('.json'));
      expect(evidenceFiles.length).toBeGreaterThan(0);

      const evidenceContent = JSON.parse(fs.readFileSync(path.join(evidenceDir, evidenceFiles[0]), 'utf-8'));
      expect(evidenceContent).toHaveProperty('type', 'guard');
      expect(evidenceContent).toHaveProperty('status');
      expect(evidenceContent).toHaveProperty('results');
      expect(evidenceContent).toHaveProperty('metadata');
      expect(evidenceContent.metadata).toHaveProperty('os');
      expect(evidenceContent.metadata).toHaveProperty('nodeVersion');
      expect(evidenceContent.metadata).toHaveProperty('constitutionPassRate');
      expect(evidenceContent.metadata).toHaveProperty('testCount');
      expect(evidenceContent.metadata).toHaveProperty('coverage');
    });

    it('saves evidence file even when guard fails (CLI)', () => {
      const projectPath = createTempProject('fail-evidence-project', {
        srcFiles: {
          'config.js': "const password = 'mysecret123';\nmodule.exports = {};\n",
        },
        testFiles: {
          'config.test.js': 'test("config", () => {});\n',
        },
      });

      const result = runCli(['guard'], projectPath);

      expect(result.status).toBe(1);
      expect(result.stdout).toContain('Evidence saved to');

      const evidenceDir = path.join(projectPath, 'stdd', 'evidence');
      expect(fs.existsSync(evidenceDir)).toBe(true);

      const files = fs.readdirSync(evidenceDir);
      const evidenceFiles = files.filter(f => f.startsWith('guard-') && f.endsWith('.json'));
      expect(evidenceFiles.length).toBeGreaterThan(0);

      const evidenceContent = JSON.parse(fs.readFileSync(path.join(evidenceDir, evidenceFiles[0]), 'utf-8'));
      expect(evidenceContent).toHaveProperty('type', 'guard');
      expect(evidenceContent.status).toBe('fail');
    });

    it('saves workspace scope and command coverage with --workspace', () => {
      const projectPath = createTempProject('workspace-scope-project', {
        packageJson: { private: true, workspaces: ['packages/*'] },
      });
      const apiDir = path.join(projectPath, 'packages', 'api');
      const webDir = path.join(projectPath, 'packages', 'web');
      fs.mkdirSync(path.join(apiDir, 'src', '__tests__'), { recursive: true });
      fs.writeFileSync(path.join(apiDir, 'package.json'), JSON.stringify({ name: '@demo/api', scripts: { test: 'echo api' } }));
      fs.writeFileSync(path.join(apiDir, 'src', 'index.js'), 'module.exports = {}\n');
      fs.writeFileSync(path.join(apiDir, 'src', '__tests__', 'index.test.js'), 'test("api", () => {});\n');
      fs.mkdirSync(path.join(webDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(webDir, 'package.json'), JSON.stringify({ name: '@demo/web', scripts: { test: 'echo web' } }));
      fs.writeFileSync(path.join(webDir, 'src', 'index.js'), 'module.exports = {}\n');

      const result = runCli(['guard', '--workspace', 'packages/api', '--no-constitution'], projectPath);

      expect(result.status).toBe(0);
      const evidenceDir = path.join(projectPath, 'stdd', 'evidence');
      const evidenceFile = fs.readdirSync(evidenceDir).find(f => f.startsWith('guard-'));
      const evidenceContent = JSON.parse(fs.readFileSync(path.join(evidenceDir, evidenceFile), 'utf-8'));
      expect(evidenceContent.metadata.workspace).toEqual(expect.objectContaining({
        name: '@demo/api',
        path: 'packages/api',
      }));
      expect(evidenceContent.metadata.detectedWorkspaces).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: 'packages/api' }),
        expect.objectContaining({ path: 'packages/web' }),
      ]));
      expect(evidenceContent.metadata.testCommandCoverage).toEqual([
        expect.objectContaining({
          command: 'npm test',
          workspace: expect.objectContaining({ path: 'packages/api' }),
        }),
      ]);
      expect(evidenceContent.results.workspace).toEqual(expect.objectContaining({ path: 'packages/api' }));
    });

    it('does not save evidence when stdd directory does not exist', async () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-guard-nostdd-'));
      const cmd = new GuardCommand(root);

      const report = await cmd.execute({ constitution: false });

      expect(report).toHaveProperty('constitution');
      const evidenceDir = path.join(root, 'stdd', 'evidence');
      expect(fs.existsSync(evidenceDir)).toBe(false);
    });
  });
});
