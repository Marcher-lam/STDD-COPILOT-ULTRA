const fs = require('fs');
const path = require('path');
const os = require('os');
const { NewCommand } = require('../src/cli/commands/new');

describe('NewCommand', () => {
  let tempDirs = [];
  let originalCwd;
  let logSpy;

  function createTempProject(name, initialized = true) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-new-test-'));
    tempDirs.push(root);

    const projectPath = path.join(root, name);
    fs.mkdirSync(projectPath, { recursive: true });

    if (initialized) {
      fs.mkdirSync(path.join(projectPath, 'stdd', 'changes'), { recursive: true });
      fs.mkdirSync(path.join(projectPath, 'stdd', 'specs'), { recursive: true });
    }

    return projectPath;
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
    const projectPath = createTempProject('create-change-project');
    process.chdir(projectPath);

    const newCommand = new NewCommand(silentSpinner);
    await newCommand.createChange('add-dark-mode', {
      title: 'Add Dark Mode',
      description: 'Introduce a dark theme for the UI.'
    });

    const changeDir = path.join(projectPath, 'stdd', 'changes', 'add-dark-mode');
    expect(fs.existsSync(path.join(changeDir, 'proposal.md'))).toBe(true);
    expect(fs.existsSync(path.join(changeDir, 'specs'))).toBe(true);
    expect(fs.existsSync(path.join(changeDir, 'tasks.md'))).toBe(true);
  });

  it('should create a spec file under the requested domain', async () => {
    const projectPath = createTempProject('create-spec-project');
    process.chdir(projectPath);

    const newCommand = new NewCommand(silentSpinner);
    await newCommand.createSpec('auth');

    const specFile = path.join(projectPath, 'stdd', 'specs', 'auth', 'spec.md');
    expect(fs.existsSync(specFile)).toBe(true);
    expect(fs.readFileSync(specFile, 'utf8')).toContain('# Spec: auth');
  });

  it('should fail with a friendly error when STDD is not initialized', async () => {
    const projectPath = createTempProject('uninitialized-project', false);
    process.chdir(projectPath);

    const newCommand = new NewCommand(silentSpinner);

    await expect(newCommand.createChange('add-dark-mode'))
      .rejects
      .toThrow('STDD not initialized. Run `stdd init` first.');
  });

  it('should reject duplicate change name', async () => {
    const projectPath = createTempProject('dup-change-project');
    process.chdir(projectPath);

    const newCommand = new NewCommand(silentSpinner);
    await newCommand.createChange('existing-change');

    await expect(newCommand.createChange('existing-change'))
      .rejects
      .toThrow("Change 'existing-change' already exists.");
  });

  it('should reject duplicate spec domain', async () => {
    const projectPath = createTempProject('dup-spec-project');
    process.chdir(projectPath);

    const newCommand = new NewCommand(silentSpinner);
    await newCommand.createSpec('billing');

    await expect(newCommand.createSpec('billing'))
      .rejects
      .toThrow("Spec 'billing' already exists.");
  });

  it('should create change with custom title and description', async () => {
    const projectPath = createTempProject('custom-change-project');
    process.chdir(projectPath);

    const newCommand = new NewCommand(silentSpinner);
    await newCommand.createChange('my-feature', {
      title: 'Custom Feature',
      description: 'A detailed description',
    });

    const proposal = fs.readFileSync(
      path.join(projectPath, 'stdd', 'changes', 'my-feature', 'proposal.md'),
      'utf8'
    );
    expect(proposal).toContain('# Proposal: Custom Feature');
    expect(proposal).toContain('A detailed description');
  });

  it('should create change with default title when none provided', async () => {
    const projectPath = createTempProject('default-title-project');
    process.chdir(projectPath);

    const newCommand = new NewCommand(silentSpinner);
    await newCommand.createChange('default-feature');

    const proposal = fs.readFileSync(
      path.join(projectPath, 'stdd', 'changes', 'default-feature', 'proposal.md'),
      'utf8'
    );
    expect(proposal).toContain('# Proposal: default-feature');
  });

  it('should include tasks with default template', async () => {
    const projectPath = createTempProject('tasks-project');
    process.chdir(projectPath);

    const newCommand = new NewCommand(silentSpinner);
    await newCommand.createChange('with-tasks');

    const tasks = fs.readFileSync(
      path.join(projectPath, 'stdd', 'changes', 'with-tasks', 'tasks.md'),
      'utf8'
    );
    expect(tasks).toContain('# Tasks: with-tasks');
    expect(tasks).toContain('TASK-001');
    expect(tasks).toContain('TASK-004');
  });

  it('should generate proposal template with metadata', () => {
    const newCommand = new NewCommand(silentSpinner);
    const template = newCommand.generateProposalTemplate('test-change', 'Test Title', 'Test description');
    expect(template).toContain('# Proposal: Test Title');
    expect(template).toContain('Test description');
    expect(template).toContain('## Intent');
    expect(template).toContain('## Scope');
    expect(template).toContain('## Success Criteria');
    expect(template).toContain('## Risks');
    expect(template).toContain('test-change');
  });

  it('should generate spec template with domain info', () => {
    const newCommand = new NewCommand(silentSpinner);
    const template = newCommand.generateSpecTemplate('orders');
    expect(template).toContain('# Spec: orders');
    expect(template).toContain('## Requirements');
    expect(template).toContain('ordersModel');
    expect(template).toContain('/api/orders');
  });

  it('should fail to create spec when STDD not initialized', async () => {
    const projectPath = createTempProject('uninit-spec-project', false);
    process.chdir(projectPath);

    const newCommand = new NewCommand(silentSpinner);
    await expect(newCommand.createSpec('no-init'))
      .rejects
      .toThrow('STDD not initialized');
  });

  it('should validate change name via validateChangeName', () => {
    const newCommand = new NewCommand(silentSpinner);
    expect(() => newCommand.validateName('valid-name')).not.toThrow();
  });

  it('should reject invalid change names', () => {
    const newCommand = new NewCommand(silentSpinner);
    expect(() => newCommand.validateName('')).toThrow();
  });

  it('should print next steps after creating a change', async () => {
    const projectPath = createTempProject('next-steps-project');
    process.chdir(projectPath);

    const newCommand = new NewCommand(silentSpinner);
    await newCommand.createChange('next-test');

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Change 'next-test' created"));
  });

  it('should print next steps after creating a spec', async () => {
    const projectPath = createTempProject('spec-next-project');
    process.chdir(projectPath);

    const newCommand = new NewCommand(silentSpinner);
    await newCommand.createSpec('payments');

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Spec 'payments' created"));
  });
});
