const fs = require('fs');
const path = require('path');
const os = require('os');
const { TurboCommand } = require('../src/cli/commands/turbo');

describe('TurboCommand', () => {
  let tempDirs = [];
  let originalCwd;
  let logSpy;

  function createTempProject(name, initialized = true) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-turbo-test-'));
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

  it('should create proposal.md with description', async () => {
    const projectPath = createTempProject('turbo-proposal-project');
    process.chdir(projectPath);

    const turboCommand = new TurboCommand(silentSpinner);
    await turboCommand.execute('add user authentication', { changeName: 'turbo-test-001' });

    const proposalPath = path.join(projectPath, 'stdd', 'changes', 'turbo-test-001', 'proposal.md');
    expect(fs.existsSync(proposalPath)).toBe(true);

    const proposalContent = fs.readFileSync(proposalPath, 'utf8');
    expect(proposalContent).toContain('add user authentication');
  });

  it('should create tasks.md with tasks', async () => {
    const projectPath = createTempProject('turbo-tasks-project');
    process.chdir(projectPath);

    const turboCommand = new TurboCommand(silentSpinner);
    await turboCommand.execute('implement search', { changeName: 'turbo-test-002' });

    const tasksPath = path.join(projectPath, 'stdd', 'changes', 'turbo-test-002', 'tasks.md');
    expect(fs.existsSync(tasksPath)).toBe(true);

    const tasksContent = fs.readFileSync(tasksPath, 'utf8');
    expect(tasksContent).toContain('TASK-');
    expect(tasksContent).toMatch(/TASK-\d+/);
  });

  it('should generate specs/*.feature files by default', async () => {
    const projectPath = createTempProject('turbo-specs-project');
    process.chdir(projectPath);

    const turboCommand = new TurboCommand(silentSpinner);
    await turboCommand.execute('user login feature', { changeName: 'turbo-test-003' });

    const specsDir = path.join(projectPath, 'stdd', 'changes', 'turbo-test-003', 'specs');
    expect(fs.existsSync(specsDir)).toBe(true);

    const featureFiles = fs.readdirSync(specsDir).filter(f => f.endsWith('.feature'));
    expect(featureFiles.length).toBeGreaterThan(0);
  });

  it('should skip spec generation when --no-spec is passed', async () => {
    const projectPath = createTempProject('turbo-nospec-project');
    process.chdir(projectPath);

    const turboCommand = new TurboCommand(silentSpinner);
    await turboCommand.execute('simple task', { changeName: 'turbo-nospec-test', noSpec: true });

    const changeDir = path.join(projectPath, 'stdd', 'changes', 'turbo-nospec-test');
    expect(fs.existsSync(path.join(changeDir, 'proposal.md'))).toBe(true);
    expect(fs.existsSync(path.join(changeDir, 'tasks.md'))).toBe(true);

    const specsDir = path.join(changeDir, 'specs');
    if (fs.existsSync(specsDir)) {
      const featureFiles = fs.readdirSync(specsDir).filter(f => f.endsWith('.feature'));
      expect(featureFiles.length).toBe(0);
    }
  });

  it('should return changeName and producedFiles', async () => {
    const projectPath = createTempProject('turbo-return-project');
    process.chdir(projectPath);

    const turboCommand = new TurboCommand(silentSpinner);
    const result = await turboCommand.execute('test feature', { changeName: 'turbo-return-test' });

    expect(result.changeName).toBe('turbo-return-test');
    expect(result.producedFiles.length).toBeGreaterThan(0);
    expect(result.producedFiles.some(f => f.endsWith('proposal.md'))).toBe(true);
    expect(result.producedFiles.some(f => f.endsWith('tasks.md'))).toBe(true);
  });

  it('should fail with error when description is empty', async () => {
    const projectPath = createTempProject('turbo-empty-project');
    process.chdir(projectPath);

    const turboCommand = new TurboCommand(silentSpinner);

    await expect(turboCommand.execute(''))
      .rejects
      .toThrow('Description is required.');
  });

  it('should fail with error when STDD is not initialized', async () => {
    const projectPath = createTempProject('turbo-uninit-project', false);
    process.chdir(projectPath);

    const turboCommand = new TurboCommand(silentSpinner);

    await expect(turboCommand.execute('test desc', { changeName: 'turbo-uninit-test' }))
      .rejects
      .toThrow('STDD not initialized. Run `stdd init` first.');
  });

  it('should generate feature files with valid BDD structure', async () => {
    const projectPath = createTempProject('turbo-bdd-project');
    process.chdir(projectPath);

    const turboCommand = new TurboCommand(silentSpinner);
    await turboCommand.execute('User Login', { changeName: 'turbo-bdd-test' });

    const specsDir = path.join(projectPath, 'stdd', 'changes', 'turbo-bdd-test', 'specs');
    const featureFiles = fs.readdirSync(specsDir).filter(f => f.endsWith('.feature'));

    for (const file of featureFiles) {
      const content = fs.readFileSync(path.join(specsDir, file), 'utf8');
      expect(content).toContain('Feature:');
      expect(content).toContain('Scenario:');
      expect(content).toContain('Given');
      expect(content).toContain('When');
      expect(content).toContain('Then');
    }
  });

  it('should generate workspace-scoped change and specs when scoped', async () => {
    const projectPath = createTempProject('turbo-workspace-project');
    createWorkspace(projectPath, 'packages/api');
    process.chdir(projectPath);

    const turboCommand = new TurboCommand(silentSpinner);
    const result = await turboCommand.execute('api login feature', {
      changeName: 'turbo-workspace-test',
      workspace: 'packages/api',
    });

    const changeDir = path.join(projectPath, 'stdd', 'changes', 'turbo-workspace-test');
    const proposalContent = fs.readFileSync(path.join(changeDir, 'proposal.md'), 'utf8');
    const tasksContent = fs.readFileSync(path.join(changeDir, 'tasks.md'), 'utf8');
    const featureFiles = fs.readdirSync(path.join(changeDir, 'specs')).filter(f => f.endsWith('.feature'));

    expect(result.workspace).toMatchObject({ name: '@demo/api', path: 'packages/api', tag: 'packages-api' });
    expect(proposalContent).toContain('| Workspace | packages/api |');
    expect(tasksContent).toContain('> Workspace: packages/api');
    expect(featureFiles.length).toBeGreaterThan(0);
    expect(featureFiles.every(f => f.startsWith('packages-api-'))).toBe(true);
    expect(fs.readFileSync(path.join(changeDir, 'specs', featureFiles[0]), 'utf8')).toContain('# Workspace: packages/api');
    expect(logSpy.mock.calls.flat().join('\n')).toContain('Workspace: packages/api');
  });

  it('should fail when scoped workspace does not exist', async () => {
    const projectPath = createTempProject('turbo-missing-workspace-project');
    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }, null, 2));
    process.chdir(projectPath);

    const turboCommand = new TurboCommand(silentSpinner);

    await expect(turboCommand.execute('api login feature', { workspace: 'packages/api' }))
      .rejects
      .toThrow("Workspace 'packages/api' not found.");
  });
});
