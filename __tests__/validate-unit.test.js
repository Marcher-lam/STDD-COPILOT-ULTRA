/**
 * Unit tests for ValidateCommand internal methods.
 * Focuses on: lineDiagnostics, compareTasksToSpecs, taskAppearsInSpecs,
 * writeRewriteSuggestions, execute() with full report, Spec Guardian mode.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { ValidateCommand } = require('../src/cli/commands/validate');

jest.mock('chalk', () => {
  const fn = (...args) => args.join('');
  fn.bold = fn;
  fn.green = fn;
  fn.yellow = fn;
  fn.red = fn;
  fn.cyan = fn;
  fn.dim = fn;
  return fn;
});

function makeTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-val-unit-'));
}

function makeStddWithSpecs(root, specFiles = {}) {
  const stdd = path.join(root, 'stdd');
  const specs = path.join(stdd, 'specs');
  const changes = path.join(stdd, 'changes');
  fs.mkdirSync(specs, { recursive: true });
  fs.mkdirSync(changes, { recursive: true });

  for (const [name, content] of Object.entries(specFiles)) {
    fs.writeFileSync(path.join(specs, name), content);
  }

  return stdd;
}

function makeChangeWithSpecs(stdd, name, opts = {}) {
  const dir = path.join(stdd, 'changes', name);
  fs.mkdirSync(dir, { recursive: true });

  if (opts.specs) {
    const specsDir = path.join(dir, 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
    for (const [fname, content] of Object.entries(opts.specs)) {
      fs.writeFileSync(path.join(specsDir, fname), content);
    }
  }

  if (opts.tasks) {
    fs.writeFileSync(path.join(dir, 'tasks.md'), opts.tasks);
  }

  return dir;
}

describe('lineDiagnostics', () => {
  // We need to require the unexported lineDiagnostics via internal test.
  // Since it is module-scoped, we test it indirectly through execute().
  // But we can also use a trick: load the module source and eval.
  // Instead, test via ValidateCommand.execute() with carefully crafted spec files.

  it('detects missing-scenario warning for feature file without Scenario', () => {
    const root = makeTmp();
    makeStddWithSpecs(root, {
      'no-scenario.feature': 'Feature: Empty\nJust some text\n',
    });

    const cmd = new ValidateCommand(root);
    const result = cmd.execute(null, { json: true });

    expect(result.diagnostics.some(d => d.rule === 'missing-scenario')).toBe(true);
  });

  it('detects missing-gwt for scenario without Given/When/Then', () => {
    const root = makeTmp();
    makeStddWithSpecs(root, {
      'no-gwt.feature': 'Feature: Bad\n  Scenario: Empty\n    Just a note\n',
    });

    const cmd = new ValidateCommand(root);
    const result = cmd.execute(null, { json: true });

    expect(result.diagnostics.some(d => d.rule === 'missing-gwt')).toBe(true);
  });

  it('passes with valid GWT structure', () => {
    const root = makeTmp();
    makeStddWithSpecs(root, {
      'clean.feature': 'Feature: Login\n  Scenario: Valid user\n    Given a user\n    When they login\n    Then success\n',
    });

    const cmd = new ValidateCommand(root);
    const result = cmd.execute(null, { json: true });

    expect(result.blocking).toBe(0);
    expect(result.diagnostics.some(d => d.rule === 'missing-scenario')).toBe(false);
    expect(result.diagnostics.some(d => d.rule === 'missing-gwt')).toBe(false);
  });

  it('detects database-detail rule', () => {
    const root = makeTmp();
    makeStddWithSpecs(root, {
      'db.feature': 'Feature: Data\n  Scenario: Store\n    Given a SQL table\n    When data inserted\n    Then stored\n',
    });

    const cmd = new ValidateCommand(root);
    const result = cmd.execute(null, { json: true });

    expect(result.diagnostics.some(d => d.rule === 'database-detail')).toBe(true);
  });

  it('detects api-detail rule', () => {
    const root = makeTmp();
    makeStddWithSpecs(root, {
      'api.feature': 'Feature: API\n  Scenario: Call\n    Given a GET /users endpoint\n    When called\n    Then response\n',
    });

    const cmd = new ValidateCommand(root);
    const result = cmd.execute(null, { json: true });

    expect(result.diagnostics.some(d => d.rule === 'api-detail')).toBe(true);
  });
});

describe('taskAppearsInSpecs', () => {
  it('matches meaningful words from task description', () => {
    const root = makeTmp();
    const cmd = new ValidateCommand(root);

    const specText = 'the user should be able to login with valid credentials';
    const result = cmd.taskAppearsInSpecs('Implement user login validation', specText);

    expect(result).toBe(true);
  });

  it('returns true when description has no meaningful words', () => {
    const root = makeTmp();
    const cmd = new ValidateCommand(root);

    // Short words (< 3 chars) are filtered out, leaving empty array
    const result = cmd.taskAppearsInSpecs('AB CD', 'some spec text');

    expect(result).toBe(true); // empty words => true
  });

  it('handles Chinese text correctly', () => {
    const root = makeTmp();
    const cmd = new ValidateCommand(root);

    const specText = '用户可以通过登录页面进行身份验证，支持 user login 功能';
    const result = cmd.taskAppearsInSpecs('implement user login', specText);

    expect(result).toBe(true);
  });

  it('returns false when no words match spec text', () => {
    const root = makeTmp();
    const cmd = new ValidateCommand(root);

    const specText = 'billing invoice payment processing';
    const result = cmd.taskAppearsInSpecs('Implement authentication token refresh', specText);

    expect(result).toBe(false);
  });
});

describe('compareTasksToSpecs', () => {
  it('reports covered and uncovered tasks', () => {
    const root = makeTmp();
    const stdd = makeStddWithSpecs(root, {
      'auth.feature': 'Feature: Auth\n  Scenario: Login\n    Given user credentials\n    When they submit\n    Then access granted\n',
    });

    const changeDir = makeChangeWithSpecs(stdd, 'auth-change', {
      tasks: '- [ ] Implement user login\n- [ ] Build payment gateway\n',
    });

    const cmd = new ValidateCommand(root);
    const specFiles = [path.join(stdd, 'specs', 'auth.feature')];
    const report = cmd.compareTasksToSpecs(changeDir, specFiles);

    expect(report.total).toBe(2);
    expect(report.covered).toBe(1);
    expect(report.uncovered).toHaveLength(1);
    expect(report.uncovered[0]).toContain('payment');
  });

  it('reports all covered when tasks match spec text', () => {
    const root = makeTmp();
    const stdd = makeStddWithSpecs(root, {
      'login.feature': 'Feature: Login\n  Scenario: Valid\n    Given user credentials\n',
    });

    const changeDir = makeChangeWithSpecs(stdd, 'login-change', {
      tasks: '- [ ] Implement user login\n',
    });

    const cmd = new ValidateCommand(root);
    const specFiles = [path.join(stdd, 'specs', 'login.feature')];
    const report = cmd.compareTasksToSpecs(changeDir, specFiles);

    expect(report.total).toBe(1);
    expect(report.covered).toBe(1);
    expect(report.uncovered).toHaveLength(0);
  });
});

describe('writeRewriteSuggestions', () => {
  it('writes suggestion file with diagnostics', () => {
    const root = makeTmp();
    const stdd = makeStddWithSpecs(root);

    const cmd = new ValidateCommand(root);
    const diagnostics = [{
      file: 'stdd/specs/bad.feature',
      line: 5,
      rule: 'code-path',
      severity: 'blocking',
      message: 'Source path leak',
      text: 'Given src/app.js is loaded',
      suggestion: 'Rewrite as domain behavior',
    }];

    const output = cmd.writeRewriteSuggestions(stdd, diagnostics);
    const outputPath = path.join(root, output);

    expect(fs.existsSync(outputPath)).toBe(true);
    const content = fs.readFileSync(outputPath, 'utf8');
    expect(content).toContain('Spec Guardian Rewrite Suggestions');
    expect(content).toContain('code-path');
    expect(content).toContain('blocking');
    expect(content).toContain('src/app.js');
  });
});

describe('execute with spec-guardian mode', () => {
  it('reports spec-guardian mode when option is set', () => {
    const root = makeTmp();
    makeStddWithSpecs(root, {
      'ok.feature': 'Feature: OK\n  Scenario: S\n    Given a\n    When b\n    Then c\n',
    });

    const cmd = new ValidateCommand(root);
    const result = cmd.execute(null, { json: true, specGuardian: true });

    expect(result.mode).toBe('spec-guardian');
  });
});

describe('execute with fix option', () => {
  it('generates rewrite suggestions file', () => {
    const root = makeTmp();
    makeStddWithSpecs(root, {
      'leaky.feature': 'Feature: Bad\n  Scenario: Leak\n    Given src/app/handler.js is loaded\n',
    });

    const cmd = new ValidateCommand(root);
    const result = cmd.execute(null, { json: true, fix: true });

    expect(result.fixOutput).toBeDefined();
    expect(result.fixOutput).toContain('spec-guardian-suggestions.md');
  });
});

describe('execute for specific change', () => {
  it('validates change-level specs', () => {
    const root = makeTmp();
    const stdd = makeStddWithSpecs(root);
    makeChangeWithSpecs(stdd, 'feat-x', {
      specs: {
        'change-spec.feature': 'Feature: X\n  Scenario: Y\n    Given a\n    When b\n    Then c\n',
      },
      tasks: '- [ ] Implement feature X\n',
    });

    const cmd = new ValidateCommand(root);
    const result = cmd.execute('feat-x', { json: true });

    expect(result.change).toBe('feat-x');
    expect(result.blocking).toBe(0);
    expect(result.tasks).toBeDefined();
    expect(result.tasks.total).toBe(1);
  });

  it('throws when change not found', () => {
    const root = makeTmp();
    makeStddWithSpecs(root);

    const cmd = new ValidateCommand(root);
    expect(() => cmd.execute('nonexistent', { json: true })).toThrow("Change 'nonexistent' not found.");
  });
});
