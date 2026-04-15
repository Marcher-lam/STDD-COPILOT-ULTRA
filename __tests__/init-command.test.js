const fs = require('fs');
const path = require('path');
const os = require('os');
const { InitCommand } = require('../src/cli/commands/init');

describe('InitCommand', () => {
  let tempDirs = [];
  let logSpy;

  function createTempDir(prefix = 'stdd-init-test-') {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
  }

  const silentSpinner = {
    text: '',
    start() {},
    stop() {},
    succeed() {},
    fail() {}
  };

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    if (logSpy) {
      logSpy.mockRestore();
    }
  });

  afterAll(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('should create config.yaml using target directory name in non-interactive mode', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'my-target-project');
    fs.mkdirSync(targetPath, { recursive: true });

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const configPath = path.join(targetPath, 'stdd', 'config.yaml');
    const configContent = fs.readFileSync(configPath, 'utf8');

    expect(configContent).toContain('name: "my-target-project"');
  });

  it('should honor --skip-skills and leave skills directory empty', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'skip-skills-project');
    fs.mkdirSync(targetPath, { recursive: true });

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const skillsDir = path.join(targetPath, '.claude', 'skills');
    const skillsEntries = fs.readdirSync(skillsDir);

    expect(fs.existsSync(skillsDir)).toBe(true);
    expect(skillsEntries).toHaveLength(0);
  });
});
