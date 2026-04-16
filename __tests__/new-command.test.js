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
});
