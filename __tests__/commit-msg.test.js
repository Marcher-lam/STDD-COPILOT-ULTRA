const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { CommitCommand, buildSubject, extractProposalTitle, detectType, extractScopeFromChangeName, detectTddPhase, extractIssue, buildPhaseSubject, buildBody } = require('../src/cli/commands/commit-msg');

describe('commit-msg CLI command', () => {
  const cliPath = path.join(__dirname, '..', 'cli.js');

  function runCli(args, cwd) {
    return spawnSync(process.execPath, [cliPath, ...args], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });
  }

  function createTempProject(name, options = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-commit-test-'));
    const projectPath = path.join(root, name);
    const changeDir = options.changeDir || 'demo';
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes', changeDir), { recursive: true });

    const tasksContent = options.tasksContent || '- [x] TASK-001 Write tests\n- [x] TASK-002 Implement feature';
    fs.writeFileSync(
      path.join(projectPath, 'stdd', 'changes', changeDir, 'tasks.md'),
      tasksContent
    );

    if (options.proposalContent) {
      fs.writeFileSync(
        path.join(projectPath, 'stdd', 'changes', changeDir, 'proposal.md'),
        options.proposalContent
      );
    }

    if (options.specs) {
      const specsDir = path.join(projectPath, 'stdd', 'changes', changeDir, 'specs');
      fs.mkdirSync(specsDir, { recursive: true });
      options.specs.forEach(f => {
        fs.writeFileSync(path.join(specsDir, f), '# Spec\n');
      });
    }

    return projectPath;
  }

  it('generates fix: prefix for bugfix type change', () => {
    const projectPath = createTempProject('bugfix-project', {
      changeDir: 'bugfix-20240101-1200',
      proposalContent: '# Bug: fix login crash\n\n## Bug Description\n\nCrash on login.',
    });

    const result = runCli(['commit', 'bugfix-20240101-1200'], projectPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('fix: fix login crash');
  });

  it('generates feat: prefix for ff type change', () => {
    const projectPath = createTempProject('ff-project', {
      changeDir: 'ff-20240101-1200',
      proposalContent: '# Proposal: add dark mode\n\n## Intent\n\nDark mode feature.',
    });

    const result = runCli(['commit', 'ff-20240101-1200'], projectPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('feat: add dark mode');
  });

  it('generates feat(scope): prefix when scope is extractable', () => {
    const result = buildSubject('feat', 'auth', 'add user login');
    expect(result).toBe('feat(auth): add user login');
  });

  it('truncates subject to 50 chars', () => {
    const longDesc = 'this is a very long description that exceeds the fifty character limit significantly';
    const result = buildSubject('feat', null, longDesc);
    expect(result.length).toBeLessThanOrEqual(50);
    expect(result).toMatch(/\.\.\.$/);
  });

  it('truncates subject with scope to 50 chars', () => {
    const longDesc = 'extremely long description that needs truncation';
    const result = buildSubject('feat', 'auth', longDesc);
    expect(result.length).toBeLessThanOrEqual(50);
  });

  it('extracts proposal title from proposal.md', () => {
    const c1 = extractProposalTitle('# Proposal: add authentication\n\n## Intent\n\n...');
    expect(c1).toBe('add authentication');

    const c2 = extractProposalTitle('# Bug: null pointer exception\n\n## Bug Description\n\n...');
    expect(c2).toBe('null pointer exception');

    const c3 = extractProposalTitle('# Simple title\n\nNo prefix here.');
    expect(c3).toBe('Simple title');
  });

  it('returns null for missing proposal title', () => {
    expect(extractProposalTitle(null)).toBe(null);
    expect(extractProposalTitle('')).toBe(null);
  });

  it('detects fix type for bugfix directories', () => {
    expect(detectType('bugfix-20240101-1200')).toBe('fix');
  });

  it('detects feat type for non-bugfix directories', () => {
    expect(detectType('ff-20240101-1200')).toBe('feat');
    expect(detectType('add-dark-mode')).toBe('feat');
  });

  it('extracts scope from ff- change names', () => {
    expect(extractScopeFromChangeName('ff-user-login-20240101-1200')).toBe('user');
    expect(extractScopeFromChangeName('ff-20240101-1200')).toBe(null);
    expect(extractScopeFromChangeName('feature-login')).toBe(null);
  });

  it('outputs json format when --format json is specified', () => {
    const projectPath = createTempProject('json-project', {
      changeDir: 'demo',
      proposalContent: '# Proposal: test feature\n\nIntent here.',
    });

    const result = runCli(['commit', 'demo', '--format', 'json'], projectPath);

    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.type).toBe('feat');
    expect(parsed.description).toBe('test feature');
    expect(parsed.change).toBe('demo');
    expect(parsed.tasksCompleted).toBe(2);
  });

  it('auto-detects first active change when none specified', () => {
    const projectPath = createTempProject('auto-detect-project', {
      changeDir: 'my-change',
      proposalContent: '# Proposal: auto detect\n\nAuto detection test.',
    });

    const result = runCli(['commit'], projectPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('feat: auto detect');
  });

  it('errors when STDD is not initialized', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-commit-nostdd-'));
    const projectPath = path.join(root, 'no-stdd');
    fs.mkdirSync(projectPath, { recursive: true });

    const result = runCli(['commit'], projectPath);

    expect(result.stderr).toContain('STDD not initialized');
    expect(result.status).toBe(1);
  });

  it('errors when change not found', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-commit-nochange-'));
    const projectPath = path.join(root, 'no-change');
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes'), { recursive: true });

    const result = runCli(['commit', 'nonexistent'], projectPath);

    expect(result.status).toBe(1);
    const output = result.stdout + result.stderr;
    expect(output).toContain('not found');
  });

  it('includes spec filenames in body', () => {
    const projectPath = createTempProject('specs-project', {
      changeDir: 'demo',
      proposalContent: '# Proposal: with specs\n\nHas specs.',
      specs: ['auth.feature', 'login.feature'],
    });

    const result = runCli(['commit', 'demo'], projectPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Spec changes:');
    expect(result.stdout).toContain('auth.feature');
    expect(result.stdout).toContain('login.feature');
  });

  it('warns when no completed tasks exist', () => {
    const projectPath = createTempProject('no-tasks-done', {
      changeDir: 'demo',
      tasksContent: '- [ ] TASK-001 Pending task\n- [ ] TASK-002 Still pending',
      proposalContent: '# Proposal: pending work\n\nNo tasks done.',
    });

    const result = runCli(['commit', 'demo'], projectPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('No completed tasks found');
  });
});

describe('CommitCommand class', () => {
  let tempDirs = [];
  let originalCwd;

  function createTempProject(name, options = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-commit-class-'));
    tempDirs.push(root);

    const projectPath = path.join(root, name);
    const changeDir = options.changeDir || 'demo';
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes', changeDir), { recursive: true });

    const tasksContent = options.tasksContent || '- [x] TASK-001 Done';
    fs.writeFileSync(
      path.join(projectPath, 'stdd', 'changes', changeDir, 'tasks.md'),
      tasksContent
    );

    if (options.proposalContent) {
      fs.writeFileSync(
        path.join(projectPath, 'stdd', 'changes', changeDir, 'proposal.md'),
        options.proposalContent
      );
    }

    return projectPath;
  }

  beforeEach(() => {
    originalCwd = process.cwd();
  });

  afterEach(() => {
    process.chdir(originalCwd);
  });

  afterAll(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns full message from execute', async () => {
    const projectPath = createTempProject('class-test', {
      proposalContent: '# Proposal: class test\n\nDesc.',
    });
    process.chdir(projectPath);

    const cmd = new CommitCommand();
    const result = await cmd.execute('demo');

    expect(result).toContain('feat: class test');
  });

  it('returns json string when format is json', async () => {
    const projectPath = createTempProject('class-json-test', {
      proposalContent: '# Proposal: json test\n\nDesc.',
    });
    process.chdir(projectPath);

    const cmd = new CommitCommand();
    const result = await cmd.execute('demo', { format: 'json' });

    const parsed = JSON.parse(result);
    expect(parsed.subject).toBe('feat: json test');
  });

  it('throws when requireIssue is set but no issue found', async () => {
    const projectPath = createTempProject('require-issue-test', {
      proposalContent: '# Proposal: no issue\n\nNo issue ref.',
    });
    process.chdir(projectPath);

    const cmd = new CommitCommand();
    await expect(cmd.execute('demo', { requireIssue: true }))
      .rejects.toThrow('Issue number is required');
  });

  it('uses --issue option', async () => {
    const projectPath = createTempProject('issue-option-test', {
      proposalContent: '# Proposal: with issue\n\nDesc.',
    });
    process.chdir(projectPath);

    const cmd = new CommitCommand();
    const result = await cmd.execute('demo', { issue: '42', format: 'json' });
    const parsed = JSON.parse(result);
    expect(parsed.issue).toBe('42');
  });

  it('uses TDD phase subject with --tdd flag', async () => {
    const projectPath = createTempProject('tdd-phase-test', {
      proposalContent: '# Proposal: tdd phase\n\nDesc.',
    });
    process.chdir(projectPath);

    const cmd = new CommitCommand();
    const result = await cmd.execute('demo', { tdd: true, format: 'json' });
    const parsed = JSON.parse(result);
    expect(parsed.phase).toBeDefined();
  });

  it('uses --phase option for phase subject', async () => {
    const projectPath = createTempProject('phase-option-test', {
      proposalContent: '# Proposal: phase option\n\nDesc.',
    });
    process.chdir(projectPath);

    const cmd = new CommitCommand();
    const result = await cmd.execute('demo', { phase: 'red', format: 'json' });
    const parsed = JSON.parse(result);
    expect(parsed.subject).toContain('red:');
  });

  it('throws when STDD not initialized', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-noinit-'));
    tempDirs.push(root);
    const projectPath = path.join(root, 'no-stdd');
    fs.mkdirSync(projectPath, { recursive: true });
    process.chdir(projectPath);

    const cmd = new CommitCommand();
    await expect(cmd.execute('x')).rejects.toThrow('STDD not initialized');
  });

  it('throws when change not found', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-nochange2-'));
    tempDirs.push(root);
    const projectPath = path.join(root, 'no-change');
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes'), { recursive: true });
    process.chdir(projectPath);

    const cmd = new CommitCommand();
    await expect(cmd.execute('nonexistent')).rejects.toThrow("Change 'nonexistent' not found");
  });

  it('throws when no active changes', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-empty-'));
    tempDirs.push(root);
    const projectPath = path.join(root, 'empty');
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes'), { recursive: true });
    process.chdir(projectPath);

    const cmd = new CommitCommand();
    await expect(cmd.execute()).rejects.toThrow('No active changes found');
  });
});

describe('commit-msg unit helpers', () => {
  describe('detectTddPhase', () => {
    it('detects red phase from failing test keywords', () => {
      expect(detectTddPhase([{ description: 'write failing test', isDone: false }])).toBe('red');
    });

    it('detects red phase from 失败测试 keyword', () => {
      expect(detectTddPhase([{ description: '创建失败测试', isDone: false }])).toBe('red');
    });

    it('detects refactor phase', () => {
      expect(detectTddPhase([{ description: 'refactor the code', isDone: true }])).toBe('refactor');
    });

    it('detects green phase as default', () => {
      expect(detectTddPhase([{ description: 'implement feature', isDone: true }])).toBe('green');
    });

    it('respects explicit phase option', () => {
      expect(detectTddPhase([], { phase: 'red' })).toBe('red');
    });

    it('detects red when no tasks completed', () => {
      expect(detectTddPhase([{ description: 'red phase test', isDone: false }])).toBe('red');
    });
  });

  describe('extractIssue', () => {
    it('extracts from #number in content', () => {
      expect(extractIssue('fix bug #42', '')).toBe('42');
    });

    it('extracts from issue: prefix', () => {
      expect(extractIssue('issue-123 fix', '')).toBe('123');
    });

    it('extracts from gh- prefix', () => {
      expect(extractIssue('gh-456 description', '')).toBe('456');
    });

    it('returns null when no issue found', () => {
      expect(extractIssue('no issue here', 'no-change')).toBeNull();
    });

    it('uses explicit option over content', () => {
      expect(extractIssue('#99', '', { issue: '1' })).toBe('1');
    });

    it('strips leading # from option', () => {
      expect(extractIssue('', '', { issue: '#7' })).toBe('7');
    });
  });

  describe('buildPhaseSubject', () => {
    it('builds phase subject with issue', () => {
      expect(buildPhaseSubject('red', '42', 'write tests')).toBe('red: write tests (#42)');
    });

    it('builds phase subject without issue', () => {
      expect(buildPhaseSubject('green', null, 'implement')).toBe('green: implement');
    });

    it('uses default description when none provided', () => {
      expect(buildPhaseSubject('red', null, null)).toBe('red: update implementation');
    });

    it('truncates long subjects', () => {
      const long = 'a'.repeat(60);
      const result = buildPhaseSubject('red', null, long);
      expect(result.length).toBeLessThanOrEqual(50);
      expect(result).toMatch(/\.\.\.$/);
    });
  });

  describe('buildBody', () => {
    let tmpDir;
    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-body-'));
    });
    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('includes completed task descriptions', () => {
      const body = buildBody([{ description: 'write tests' }], 'demo', tmpDir);
      expect(body).toContain('write tests');
    });

    it('returns empty string when no tasks and no specs', () => {
      const body = buildBody([], 'demo', tmpDir);
      expect(body).toBe('');
    });

    it('includes spec filenames when specs dir exists', () => {
      const specsDir = path.join(tmpDir, 'specs');
      fs.mkdirSync(specsDir);
      fs.writeFileSync(path.join(specsDir, 'auth.feature'), '# Spec');
      const body = buildBody([{ description: 'done' }], 'demo', tmpDir);
      expect(body).toContain('Spec changes:');
      expect(body).toContain('auth.feature');
    });
  });
});
