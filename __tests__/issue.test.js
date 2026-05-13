const fs = require('fs');
const path = require('path');
const os = require('os');
const { IssueCommand } = require('../src/cli/commands/issue');

describe('IssueCommand', () => {
  let tempDirs = [];
  let originalCwd;
  let logSpy;

  function createTempProject(name, initialized = true) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-issue-test-'));
    tempDirs.push(root);

    const projectPath = path.join(root, name);
    fs.mkdirSync(projectPath, { recursive: true });

    if (initialized) {
      fs.mkdirSync(path.join(projectPath, 'stdd', 'changes'), { recursive: true });
      fs.mkdirSync(path.join(projectPath, 'stdd', 'specs'), { recursive: true });
    }

    return projectPath;
  }

  function createWorkspace(projectPath, workspacePath, name = '@demo/api') {
    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }, null, 2));
    const root = path.join(projectPath, workspacePath);
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name }, null, 2));
  }

  const silentSpinner = {
    text: '',
    start() {},
    stop() {},
    succeed() {},
    fail() {}
  };

  beforeEach(() => {
    originalCwd = process.cwd();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (logSpy) {
      logSpy.mockRestore();
    }
  });

  afterAll(() => {
    if (originalCwd && process.cwd() !== originalCwd) {
      process.chdir(originalCwd);
    }
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('should create a change with proposal, specs directory, and tasks file', async () => {
    const projectPath = createTempProject('issue-basic-project');
    process.chdir(projectPath);

    const issueCommand = new IssueCommand(silentSpinner);
    await issueCommand.execute('login crashes on submit', { changeName: 'bugfix-test-001' });

    const changeDir = path.join(projectPath, 'stdd', 'changes', 'bugfix-test-001');
    expect(fs.existsSync(path.join(changeDir, 'proposal.md'))).toBe(true);
    expect(fs.existsSync(path.join(changeDir, 'specs'))).toBe(true);
    expect(fs.existsSync(path.join(changeDir, 'tasks.md'))).toBe(true);
  });

  it('should include Steps to Reproduce in proposal.md', async () => {
    const projectPath = createTempProject('issue-steps-project');
    process.chdir(projectPath);

    const issueCommand = new IssueCommand(silentSpinner);
    await issueCommand.execute('null pointer in payment', { changeName: 'bugfix-steps-test' });

    const proposalPath = path.join(projectPath, 'stdd', 'changes', 'bugfix-steps-test', 'proposal.md');
    const proposalContent = fs.readFileSync(proposalPath, 'utf8');
    expect(proposalContent).toContain('Steps to Reproduce');
  });

  it('should include Expected Behavior in proposal.md', async () => {
    const projectPath = createTempProject('issue-expected-project');
    process.chdir(projectPath);

    const issueCommand = new IssueCommand(silentSpinner);
    await issueCommand.execute('button misaligned', { changeName: 'bugfix-expected-test' });

    const proposalPath = path.join(projectPath, 'stdd', 'changes', 'bugfix-expected-test', 'proposal.md');
    const proposalContent = fs.readFileSync(proposalPath, 'utf8');
    expect(proposalContent).toContain('Expected Behavior');
  });

  it('should include Actual Behavior in proposal.md', async () => {
    const projectPath = createTempProject('issue-actual-project');
    process.chdir(projectPath);

    const issueCommand = new IssueCommand(silentSpinner);
    await issueCommand.execute('timeout on API call', { changeName: 'bugfix-actual-test' });

    const proposalPath = path.join(projectPath, 'stdd', 'changes', 'bugfix-actual-test', 'proposal.md');
    const proposalContent = fs.readFileSync(proposalPath, 'utf8');
    expect(proposalContent).toContain('Actual Behavior');
  });

  it('should have first task about writing failing test (Red)', async () => {
    const projectPath = createTempProject('issue-tasks-project');
    process.chdir(projectPath);

    const issueCommand = new IssueCommand(silentSpinner);
    await issueCommand.execute('race condition in cache', { changeName: 'bugfix-tasks-test' });

    const tasksPath = path.join(projectPath, 'stdd', 'changes', 'bugfix-tasks-test', 'tasks.md');
    const tasksContent = fs.readFileSync(tasksPath, 'utf8');
    const taskLines = tasksContent.split('\n').filter(line => line.includes('TASK-'));

    expect(taskLines.length).toBe(3);
    expect(taskLines[0]).toContain('编写失败测试');
  });

  it('should have TASK-002 as Green fix task', async () => {
    const projectPath = createTempProject('issue-green-project');
    process.chdir(projectPath);

    const issueCommand = new IssueCommand(silentSpinner);
    await issueCommand.execute('memory leak', { changeName: 'bugfix-green-test' });

    const tasksPath = path.join(projectPath, 'stdd', 'changes', 'bugfix-green-test', 'tasks.md');
    const tasksContent = fs.readFileSync(tasksPath, 'utf8');
    const taskLines = tasksContent.split('\n').filter(line => line.includes('TASK-'));

    expect(taskLines[1]).toContain('代码修复使测试通过');
  });

  it('should have TASK-003 as regression test task', async () => {
    const projectPath = createTempProject('issue-regression-project');
    process.chdir(projectPath);

    const issueCommand = new IssueCommand(silentSpinner);
    await issueCommand.execute('off-by-one error', { changeName: 'bugfix-regression-test' });

    const tasksPath = path.join(projectPath, 'stdd', 'changes', 'bugfix-regression-test', 'tasks.md');
    const tasksContent = fs.readFileSync(tasksPath, 'utf8');
    const taskLines = tasksContent.split('\n').filter(line => line.includes('TASK-'));

    expect(taskLines[2]).toContain('边界测试与回归验证');
  });

  it('should include severity in proposal.md', async () => {
    const projectPath = createTempProject('issue-severity-project');
    process.chdir(projectPath);

    const issueCommand = new IssueCommand(silentSpinner);
    await issueCommand.execute('security bypass', { changeName: 'bugfix-severity-test', severity: 'high' });

    const proposalPath = path.join(projectPath, 'stdd', 'changes', 'bugfix-severity-test', 'proposal.md');
    const proposalContent = fs.readFileSync(proposalPath, 'utf8');
    expect(proposalContent).toContain('high');
  });

  it('should use custom title in proposal.md', async () => {
    const projectPath = createTempProject('issue-title-project');
    process.chdir(projectPath);

    const issueCommand = new IssueCommand(silentSpinner);
    await issueCommand.execute('some bug', {
      changeName: 'bugfix-title-test',
      title: 'Critical: Auth Token Leak'
    });

    const proposalPath = path.join(projectPath, 'stdd', 'changes', 'bugfix-title-test', 'proposal.md');
    const proposalContent = fs.readFileSync(proposalPath, 'utf8');
    expect(proposalContent).toContain('# Bug: Critical: Auth Token Leak');
  });

  it('should generate bugfix-YYYYMMDD-XXXX change name format', async () => {
    const projectPath = createTempProject('issue-autoname-project');
    process.chdir(projectPath);

    const issueCommand = new IssueCommand(silentSpinner);
    await issueCommand.execute('auto name bug');

    const changesDir = path.join(projectPath, 'stdd', 'changes');
    const entries = fs.readdirSync(changesDir);
    const bugfixEntries = entries.filter(e => e.startsWith('bugfix-'));
    expect(bugfixEntries.length).toBe(1);

    const autoName = bugfixEntries[0];
    expect(autoName).toMatch(/^bugfix-\d{8}-\d{4}$/);
  });

  it('should fail when STDD not initialized', async () => {
    const projectPath = createTempProject('issue-uninit-project', false);
    process.chdir(projectPath);

    const issueCommand = new IssueCommand(silentSpinner);

    await expect(issueCommand.execute('test bug'))
      .rejects
      .toThrow('STDD not initialized. Run `stdd init` first.');
  });

  it('should fail when description is empty', async () => {
    const projectPath = createTempProject('issue-empty-desc-project');
    process.chdir(projectPath);

    const issueCommand = new IssueCommand(silentSpinner);

    await expect(issueCommand.execute(''))
      .rejects
      .toThrow('Description is required.');
  });

  it('should fail when change name already exists', async () => {
    const projectPath = createTempProject('issue-dup-project');
    process.chdir(projectPath);

    const issueCommand = new IssueCommand(silentSpinner);
    await issueCommand.execute('first bug', { changeName: 'bugfix-dup-test' });

    await expect(issueCommand.execute('second bug', { changeName: 'bugfix-dup-test' }))
      .rejects
      .toThrow("Change 'bugfix-dup-test' already exists.");
  });

  it('should write workspace metadata and scoped apply/verify hints when scoped', async () => {
    const projectPath = createTempProject('issue-workspace-project');
    createWorkspace(projectPath, 'packages/api');
    process.chdir(projectPath);

    const issueCommand = new IssueCommand(silentSpinner);
    const result = await issueCommand.execute('api returns 500', {
      changeName: 'bugfix-workspace-test',
      workspace: 'packages/api',
    });

    const changeDir = path.join(projectPath, 'stdd', 'changes', 'bugfix-workspace-test');
    const proposalContent = fs.readFileSync(path.join(changeDir, 'proposal.md'), 'utf8');
    const tasksContent = fs.readFileSync(path.join(changeDir, 'tasks.md'), 'utf8');

    expect(result.workspace).toMatchObject({ name: '@demo/api', path: 'packages/api', tag: 'packages-api' });
    expect(proposalContent).toContain('## Workspace');
    expect(proposalContent).toContain('| Workspace | packages/api |');
    expect(tasksContent).toContain('> Workspace: packages/api');
    expect(tasksContent).toContain('stdd apply bugfix-workspace-test --workspace packages/api');
    expect(tasksContent).toContain('stdd verify bugfix-workspace-test --workspace packages/api');
  });

  it('should fail when scoped workspace does not exist', async () => {
    const projectPath = createTempProject('issue-missing-workspace-project');
    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }, null, 2));
    process.chdir(projectPath);

    const issueCommand = new IssueCommand(silentSpinner);

    await expect(issueCommand.execute('api returns 500', { workspace: 'packages/api' }))
      .rejects
      .toThrow("Workspace 'packages/api' not found.");
  });
});
