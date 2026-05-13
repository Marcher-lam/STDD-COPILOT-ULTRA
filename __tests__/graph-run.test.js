const fs = require('fs');
const path = require('path');
const os = require('os');
const { GraphRunCommand } = require('../src/cli/commands/graph-run');
const { FFCommand } = require('../src/cli/commands/ff');
const { SpecGenerator } = require('../src/cli/commands/spec-generator');
const { ApplyCommand } = require('../src/cli/commands/apply');
const { VerifyCommand } = require('../src/cli/commands/verify');
const { ArchiveCommand } = require('../src/cli/commands/archive');
const { FixPacketCommand } = require('../src/cli/commands/fix-packet');
const { OutsideInCommand } = require('../src/cli/commands/outside-in');

jest.mock('../src/cli/commands/ff');
jest.mock('../src/cli/commands/spec-generator');
jest.mock('../src/cli/commands/apply');
jest.mock('../src/cli/commands/verify');
jest.mock('../src/cli/commands/archive');
jest.mock('../src/cli/commands/fix-packet');
jest.mock('../src/cli/commands/outside-in');

jest.mock('child_process', () => ({
  exec: jest.fn((cmd, opts, cb) => cb(null, { stdout: '', stderr: '' })),
}));

const { exec } = require('child_process');

describe('GraphRunCommand', () => {
  let tempDirs = [];
  let originalCwd;
  let logSpy;

  function createTempProject(name, initialized = true) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-graph-run-test-'));
    tempDirs.push(root);
    const projectPath = path.join(root, name);
    fs.mkdirSync(projectPath, { recursive: true });
    if (initialized) {
      fs.mkdirSync(path.join(projectPath, 'stdd', 'changes'), { recursive: true });
      fs.mkdirSync(path.join(projectPath, 'stdd', 'specs'), { recursive: true });
    }
    return projectPath;
  }

  function createWorkspace(projectPath, workspacePath = 'packages/api', pkg = { name: '@demo/api' }) {
    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }));
    const workspaceRoot = path.join(projectPath, workspacePath);
    fs.mkdirSync(path.join(workspaceRoot, 'src'), { recursive: true });
    fs.writeFileSync(path.join(workspaceRoot, 'package.json'), JSON.stringify(pkg));
    return workspaceRoot;
  }

  beforeEach(() => {
    originalCwd = process.cwd();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    FFCommand.mockImplementation(() => ({
      execute: jest.fn().mockResolvedValue(undefined),
    }));
    SpecGenerator.mockImplementation(() => ({
      generateFromTasks: jest.fn().mockResolvedValue({ generated: [], skipped: [] }),
    }));
    ApplyCommand.mockImplementation(() => ({
      execute: jest.fn().mockResolvedValue(undefined),
    }));
    VerifyCommand.mockImplementation(() => ({
      execute: jest.fn().mockResolvedValue(undefined),
    }));
    ArchiveCommand.mockImplementation(() => ({
      execute: jest.fn().mockResolvedValue(undefined),
    }));
    FixPacketCommand.mockImplementation(() => ({
      execute: jest.fn().mockReturnValue({ output: 'stdd/changes/test/evidence/fix-packet.md', jsonOutput: 'stdd/changes/test/evidence/fix-packet.json' }),
    }));
    OutsideInCommand.mockImplementation(() => ({
      execute: jest.fn().mockReturnValue({ plan: 'stdd/changes/test/outside-in/plan.md', skeletons: [] }),
    }));

    exec.mockImplementation((cmd, opts, cb) => cb(null, { stdout: '', stderr: '' }));
    exec.mockClear();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (logSpy) {
      logSpy.mockRestore();
    }
    console.error.mockRestore();
  });

  afterAll(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    jest.restoreAllMocks();
  });

  it('should execute nodes in topological order for feature intent', async () => {
    const projectPath = createTempProject('graph-run-feature');
    process.chdir(projectPath);

    const command = new GraphRunCommand();
    const result = await command.execute('feature', { changeName: 'test-change' });

    expect(result.changeName).toBe('test-change');
    expect(result.failedAt).toBeNull();

    const stepNames = result.steps.map(s => s.node);
    expect(stepNames).toEqual([
      'stdd-propose',
      'stdd-spec',
      'stdd-plan',
      'stdd-outside-in',
      'stdd-apply',
      'stdd-verify',
    ]);

    // Verify each command class was called in order
    expect(FFCommand).toHaveBeenCalled();
    expect(SpecGenerator).toHaveBeenCalled();
    expect(OutsideInCommand).toHaveBeenCalled();
    expect(ApplyCommand).toHaveBeenCalled();
    expect(VerifyCommand).toHaveBeenCalled();
  });

  it('should execute nodes in topological order for hotfix intent', async () => {
    const projectPath = createTempProject('graph-run-hotfix');
    process.chdir(projectPath);

    const command = new GraphRunCommand();
    const result = await command.execute('hotfix', { changeName: 'hotfix-change' });

    expect(result.changeName).toBe('hotfix-change');
    const stepNames = result.steps.map(s => s.node);
    expect(stepNames).toEqual([
      'stdd-propose',
      'stdd-apply',
      'stdd-verify',
      'stdd-commit',
    ]);
  });

  it('should skip apply and verify when --skip-apply is passed', async () => {
    const projectPath = createTempProject('graph-run-skip');
    process.chdir(projectPath);

    const command = new GraphRunCommand();
    const result = await command.execute('feature', { changeName: 'skip-change', skipApply: true });

    const skippedSteps = result.steps.filter(s => s.status === 'skipped');
    expect(skippedSteps.length).toBeGreaterThanOrEqual(2);
    expect(skippedSteps.some(s => s.node === 'stdd-apply')).toBe(true);
    expect(skippedSteps.some(s => s.node === 'stdd-verify')).toBe(true);
  });

  it('should execute repair intent starting with fix-packet', async () => {
    const projectPath = createTempProject('graph-run-repair');
    process.chdir(projectPath);

    const command = new GraphRunCommand();
    const result = await command.execute('repair', { changeName: 'repair-change' });

    const stepNames = result.steps.map(s => s.node);
    expect(stepNames).toEqual(['stdd-fix-packet', 'stdd-apply', 'stdd-verify']);
    expect(FixPacketCommand).toHaveBeenCalled();
  });

  it('should include workspace in skip-apply step results and output', async () => {
    const projectPath = createTempProject('graph-run-workspace-skip');
    createWorkspace(projectPath, 'packages/api');
    process.chdir(projectPath);

    const command = new GraphRunCommand();
    const result = await command.execute('feature', {
      changeName: 'workspace-skip-change',
      skipApply: true,
      workspace: 'packages/api',
    });

    expect(result.workspace).toEqual(expect.objectContaining({
      name: '@demo/api',
      path: 'packages/api',
      sourceDir: 'packages/api/src',
    }));
    const applyStep = result.steps.find(s => s.node === 'stdd-apply');
    const verifyStep = result.steps.find(s => s.node === 'stdd-verify');
    expect(applyStep.workspace.path).toBe('packages/api');
    expect(verifyStep.workspace.path).toBe('packages/api');
    expect(logSpy.mock.calls.flat().join('\n')).toContain('Workspace: @demo/api (packages/api)');
  });

  it('should fail when workspace does not exist', async () => {
    const projectPath = createTempProject('graph-run-workspace-missing');
    createWorkspace(projectPath, 'packages/api');
    process.chdir(projectPath);

    const command = new GraphRunCommand();

    await expect(command.execute('feature', {
      changeName: 'workspace-missing-change',
      skipApply: true,
      workspace: 'packages/missing',
    })).rejects.toThrow("Workspace 'packages/missing' not found.");
  });

  it('should abort when a step fails', async () => {
    const projectPath = createTempProject('graph-run-fail');
    process.chdir(projectPath);

    ApplyCommand.mockImplementation(() => ({
      execute: jest.fn().mockRejectedValue(new Error('test execution failed')),
    }));

    const command = new GraphRunCommand();
    const result = await command.execute('feature', { changeName: 'fail-change' });

    expect(result.failedAt).toBe('stdd-apply');

    const failedStep = result.steps.find(s => s.node === 'stdd-apply');
    expect(failedStep.status).toBe('failed');
    expect(failedStep.error).toBe('test execution failed');

    // Steps after the failure should not exist
    const stepNames = result.steps.map(s => s.node);
    expect(stepNames).not.toContain('stdd-verify');
  });

  it('should use default intent feature when not specified', async () => {
    const projectPath = createTempProject('graph-run-default');
    process.chdir(projectPath);

    const command = new GraphRunCommand();
    const result = await command.execute(undefined, { changeName: 'default-change' });

    const stepNames = result.steps.map(s => s.node);
    expect(stepNames).toContain('stdd-propose');
    expect(stepNames).toContain('stdd-spec');
  });

  it('should generate a change name when not provided', async () => {
    const projectPath = createTempProject('graph-run-autoname');
    process.chdir(projectPath);

    const command = new GraphRunCommand();
    const result = await command.execute('feature');

    expect(result.changeName).toMatch(/^graph-feature-\d{8}-\d{4}$/);
  });

  it('should use fallback graph when graph file is missing', async () => {
    const projectPath = createTempProject('graph-run-no-stdd', false);
    process.chdir(projectPath);

    const command = new GraphRunCommand();
    // Router uses fallback when skills.yaml is missing, so it should succeed
    const result = await command.execute('feature', { changeName: 'fallback-change' });
    expect(result.changeName).toBe('fallback-change');
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('should return result with all steps recorded', async () => {
    const projectPath = createTempProject('graph-run-steps');
    process.chdir(projectPath);

    const command = new GraphRunCommand();
    const result = await command.execute('feature', { changeName: 'steps-change' });

    expect(result.steps.length).toBeGreaterThanOrEqual(4);
    expect(result.steps.every(s => s.node)).toBe(true);
    expect(result.steps.every(s => s.command)).toBe(true);
    expect(result.steps.every(s => s.status)).toBe(true);
  });

  it('should NOT inject type-check when tsconfig.json does not exist', async () => {
    const projectPath = createTempProject('graph-run-no-tsconfig');
    process.chdir(projectPath);

    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({ name: 'test-project' }));

    const command = new GraphRunCommand();
    const result = await command.execute('feature', { changeName: 'no-tsconfig-change' });

    const stepNames = result.steps.map(s => s.node);
    expect(stepNames).toEqual([
      'stdd-propose',
      'stdd-spec',
      'stdd-plan',
      'stdd-outside-in',
      'stdd-apply',
      'stdd-verify',
    ]);
    expect(stepNames).not.toContain('stdd-type-check');
  });

  it('should inject type-check and execute it when tsconfig.json exists', async () => {
    const projectPath = createTempProject('graph-run-with-tsconfig');
    process.chdir(projectPath);
    fs.writeFileSync(path.join(projectPath, 'tsconfig.json'), JSON.stringify({ compilerOptions: {} }));
    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({ name: 'test-project' }));

    const command = new GraphRunCommand();
    const result = await command.execute('feature', { changeName: 'with-tsconfig-change' });

    const stepNames = result.steps.map(s => s.node);
    expect(stepNames).toContain('stdd-type-check');

    const typeCheckIdx = stepNames.indexOf('stdd-type-check');
    const applyIdx = stepNames.indexOf('stdd-apply');
    const verifyIdx = stepNames.indexOf('stdd-verify');
    expect(typeCheckIdx).toBeGreaterThan(applyIdx);
    expect(verifyIdx).toBeGreaterThan(typeCheckIdx);

    expect(exec).toHaveBeenCalled();
  });
});
