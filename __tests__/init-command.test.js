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

  it('should detect Node/Jest tech stack and write to config.yaml', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'node-jest-project');
    fs.mkdirSync(targetPath, { recursive: true });
    fs.writeFileSync(
      path.join(targetPath, 'package.json'),
      JSON.stringify({
        name: 'node-jest-project',
        devDependencies: { jest: '^29.0.0' },
      })
    );

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const configPath = path.join(targetPath, 'stdd', 'config.yaml');
    const configContent = fs.readFileSync(configPath, 'utf8');

    expect(configContent).toContain('language: "node"');
    expect(configContent).toContain('command: "npx jest"');
    expect(configContent).toContain('runner: "jest"');
  });

  it('should detect Python/pytest tech stack and write to config.yaml', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'python-project');
    fs.mkdirSync(targetPath, { recursive: true });
    fs.writeFileSync(
      path.join(targetPath, 'requirements.txt'),
      'flask==2.0\npytest==7.0\n'
    );

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const configPath = path.join(targetPath, 'stdd', 'config.yaml');
    const configContent = fs.readFileSync(configPath, 'utf8');

    expect(configContent).toContain('language: "python"');
    expect(configContent).toContain('command: "pytest"');
    expect(configContent).toContain('runner: "pytest"');
  });

  it('should create foundation.md with detected tech stack info', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'foundation-project');
    fs.mkdirSync(targetPath, { recursive: true });
    fs.writeFileSync(
      path.join(targetPath, 'Cargo.toml'),
      '[package]\nname = "rust-app"\n'
    );

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const foundationPath = path.join(targetPath, 'stdd', 'memory', 'foundation.md');
    const content = fs.readFileSync(foundationPath, 'utf8');

    expect(content).toContain('Detected: rust');
    expect(content).toContain('Rust');
    expect(content).toContain('cargo test');
  });

  it('should create foundation.md for unknown tech stack', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'empty-project');
    fs.mkdirSync(targetPath, { recursive: true });

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const foundationPath = path.join(targetPath, 'stdd', 'memory', 'foundation.md');
    const content = fs.readFileSync(foundationPath, 'utf8');

    expect(content).toContain('Unknown language');
    expect(content).toContain('Not detected');
  });

  it('should register detected pnpm workspaces in config.yaml and foundation.md', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'workspace-project');
    fs.mkdirSync(targetPath, { recursive: true });
    fs.writeFileSync(path.join(targetPath, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
    fs.mkdirSync(path.join(targetPath, 'packages', 'api'), { recursive: true });
    fs.writeFileSync(
      path.join(targetPath, 'packages', 'api', 'package.json'),
      JSON.stringify({ name: '@scope/api' })
    );

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const configPath = path.join(targetPath, 'stdd', 'config.yaml');
    const configContent = fs.readFileSync(configPath, 'utf8');
    const foundationPath = path.join(targetPath, 'stdd', 'memory', 'foundation.md');
    const foundationContent = fs.readFileSync(foundationPath, 'utf8');

    expect(configContent).toContain('workspaces:');
    expect(configContent).toContain('enabled: true');
    expect(configContent).toContain('name: "@scope/api"');
    expect(configContent).toContain('root: "packages/api"');
    expect(configContent).toContain('source_root: "packages/api/src"');
    expect(configContent).toContain('package_json: "packages/api/package.json"');
    expect(foundationContent).toContain('## Monorepo/Workspaces');
    expect(foundationContent).toContain('- @scope/api: packages/api');
  });

  it('should render detected workspaces in PR template for monorepos', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'workspace-pr-template-project');
    fs.mkdirSync(targetPath, { recursive: true });
    fs.writeFileSync(path.join(targetPath, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n  - apps/*\n');
    fs.mkdirSync(path.join(targetPath, 'packages', 'api'), { recursive: true });
    fs.mkdirSync(path.join(targetPath, 'apps', 'web'), { recursive: true });
    fs.writeFileSync(
      path.join(targetPath, 'packages', 'api', 'package.json'),
      JSON.stringify({ name: '@scope/api' })
    );
    fs.writeFileSync(
      path.join(targetPath, 'apps', 'web', 'package.json'),
      JSON.stringify({ name: '@scope/web' })
    );

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const prTemplatePath = path.join(targetPath, '.github', 'PULL_REQUEST_TEMPLATE.md');
    const content = fs.readFileSync(prTemplatePath, 'utf8');

    expect(content).toContain('## Affected Workspaces');
    expect(content).toContain('- [ ] packages/api');
    expect(content).toContain('- [ ] apps/web');
    expect(content).toContain('stdd verify --workspace <workspace>');
    expect(content).toContain('stdd metrics --workspace <workspace>');
  });

  it('should keep generic workspace placeholders in PR template for non-monorepos', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'non-workspace-pr-template-project');
    fs.mkdirSync(targetPath, { recursive: true });

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const prTemplatePath = path.join(targetPath, '.github', 'PULL_REQUEST_TEMPLATE.md');
    const content = fs.readFileSync(prTemplatePath, 'utf8');

    expect(content).toContain('- [ ] packages/api');
    expect(content).toContain('- [ ] apps/web');
    expect(content).toContain('- [ ] root/shared');
  });

  it('should create .github/PULL_REQUEST_TEMPLATE.md during initialization', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'github-templates-project');
    fs.mkdirSync(targetPath, { recursive: true });

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const prTemplatePath = path.join(targetPath, '.github', 'PULL_REQUEST_TEMPLATE.md');

    expect(fs.existsSync(prTemplatePath)).toBe(true);
  });

  it('should include STDD checklist items in PR template', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'pr-checklist-project');
    fs.mkdirSync(targetPath, { recursive: true });

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const prTemplatePath = path.join(targetPath, '.github', 'PULL_REQUEST_TEMPLATE.md');
    const content = fs.readFileSync(prTemplatePath, 'utf8');

    expect(content).toContain('Proposal created');
    expect(content).toContain('Tests pass');
    expect(content).toContain('Specs updated');
    expect(content).toContain('Constitution check');
  });

  it('should create GitHub issue templates', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'issue-templates-project');
    fs.mkdirSync(targetPath, { recursive: true });

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const bugReportPath = path.join(targetPath, '.github', 'ISSUE_TEMPLATE', 'bug_report.md');
    const featureRequestPath = path.join(targetPath, '.github', 'ISSUE_TEMPLATE', 'feature_request.md');

    expect(fs.existsSync(bugReportPath)).toBe(true);
    expect(fs.existsSync(featureRequestPath)).toBe(true);
  });

  it('should not overwrite existing .github/PULL_REQUEST_TEMPLATE.md', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'no-overwrite-project');
    fs.mkdirSync(targetPath, { recursive: true });

    const githubDir = path.join(targetPath, '.github');
    fs.mkdirSync(githubDir, { recursive: true });
    const existingContent = '# Custom PR Template\nThis is my custom template.';
    fs.writeFileSync(path.join(githubDir, 'PULL_REQUEST_TEMPLATE.md'), existingContent);

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const prTemplatePath = path.join(targetPath, '.github', 'PULL_REQUEST_TEMPLATE.md');
    const content = fs.readFileSync(prTemplatePath, 'utf8');

    expect(content).toBe(existingContent);
  });

  it('should include workspace fields in GitHub issue templates', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'issue-workspace-template-project');
    fs.mkdirSync(targetPath, { recursive: true });

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const bugContent = fs.readFileSync(
      path.join(targetPath, '.github', 'ISSUE_TEMPLATE', 'bug_report.md'),
      'utf8'
    );
    const featureContent = fs.readFileSync(
      path.join(targetPath, '.github', 'ISSUE_TEMPLATE', 'feature_request.md'),
      'utf8'
    );

    expect(bugContent).toContain('Affected Workspace(s)');
    expect(bugContent).toContain('stdd context --workspace <workspace> --export');
    expect(featureContent).toContain('Affected Workspace(s)');
    expect(featureContent).toContain('stdd context --workspace <workspace> --export');
  });
});
