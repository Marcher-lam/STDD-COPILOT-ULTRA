const fs = require('fs');
const path = require('path');
const os = require('os');
const { UpdateCommand } = require('../src/cli/commands/update');

describe('UpdateCommand', () => {
  let tempDirs = [];
  let logSpy;

  function createTempProject(name) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-update-test-'));
    tempDirs.push(root);

    const projectPath = path.join(root, name);
    fs.mkdirSync(projectPath, { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'stdd'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, '.claude'), { recursive: true });
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

  describe('basic update', () => {
    it('should update schemas recursively including constitution articles', async () => {
      const projectPath = createTempProject('recursive-schema-project');
      const updateCommand = new UpdateCommand(silentSpinner);

      await updateCommand.execute(projectPath, { force: false });

      const articlePath = path.join(
        projectPath,
        'schemas',
        'constitution',
        'articles',
        '01-library-first.md'
      );
      expect(fs.existsSync(articlePath)).toBe(true);
      expect(logSpy.mock.calls.some(call => String(call[0]).includes('Update summary'))).toBe(true);
    });

    it('should report errors and fail when file sync encounters write errors', async () => {
      const projectPath = createTempProject('error-report-project');
      const originalWriteFile = fs.promises.writeFile.bind(fs.promises);
      const writeSpy = jest.spyOn(fs.promises, 'writeFile').mockImplementation(async (...args) => {
        const filePath = String(args[0]);
        if (filePath.endsWith(path.join('schemas', 'spec-driven', 'schema.yaml'))) {
          throw new Error('simulated write failure');
        }
        return originalWriteFile(...args);
      });

      const updateCommand = new UpdateCommand(silentSpinner);
      try {
        await expect(updateCommand.execute(projectPath, { force: true }))
          .rejects
          .toThrow(/Update completed with \d+ error\(s\)/);
      } finally {
        writeSpy.mockRestore();
      }
    });

    it('should add missing GitHub issue templates', async () => {
      const projectPath = createTempProject('github-issue-template-project');
      fs.mkdirSync(path.join(projectPath, '.github'), { recursive: true });
      fs.writeFileSync(
        path.join(projectPath, '.github', 'PULL_REQUEST_TEMPLATE.md'),
        '# Existing PR Template\n'
      );

      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { force: false });

      const bugReportPath = path.join(projectPath, '.github', 'ISSUE_TEMPLATE', 'bug_report.md');
      const featureRequestPath = path.join(projectPath, '.github', 'ISSUE_TEMPLATE', 'feature_request.md');

      expect(fs.existsSync(bugReportPath)).toBe(true);
      expect(fs.existsSync(featureRequestPath)).toBe(true);
      expect(fs.readFileSync(bugReportPath, 'utf8')).toContain('Affected Workspace(s)');
      expect(fs.readFileSync(featureRequestPath, 'utf8')).toContain('stdd context --workspace <workspace> --export');
      expect(fs.readFileSync(path.join(projectPath, '.github', 'PULL_REQUEST_TEMPLATE.md'), 'utf8'))
        .toBe('# Existing PR Template\n');
    });

    it('should render detected workspaces when update adds PR template', async () => {
      const projectPath = createTempProject('github-workspace-template-project');
      fs.writeFileSync(path.join(projectPath, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
      fs.mkdirSync(path.join(projectPath, 'packages', 'api'), { recursive: true });
      fs.writeFileSync(
        path.join(projectPath, 'packages', 'api', 'package.json'),
        JSON.stringify({ name: '@scope/api' })
      );

      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { force: false });

      const prTemplatePath = path.join(projectPath, '.github', 'PULL_REQUEST_TEMPLATE.md');
      const content = fs.readFileSync(prTemplatePath, 'utf8');

      expect(content).toContain('- [ ] packages/api');
      expect(content).toContain('stdd constitution status --workspace <workspace>');
    });
  });

  describe('new skill file detection', () => {
    it('should add missing skill files when project is old', async () => {
      const projectPath = createTempProject('old-project');

      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { force: false });

      const skillsDir = path.join(projectPath, '.claude', 'skills');

      expect(fs.existsSync(skillsDir)).toBe(true);

      const skillsEntries = fs.readdirSync(skillsDir);
      expect(skillsEntries.length).toBeGreaterThan(0);

      const summaryCall = logSpy.mock.calls.find(call =>
        String(call[0]).includes('Update summary')
      );
      expect(summaryCall).toBeDefined();

      const skillsCall = logSpy.mock.calls.find(call => {
        const msg = String(call[0]);
        return msg.includes('Skills:') && msg.includes('added');
      });
      expect(skillsCall).toBeDefined();
    });
  });

  describe('local modification detection', () => {
    it('should skip files that were modified locally', async () => {
      const projectPath = createTempProject('modified-project');

      const existingSkillsDir = path.join(projectPath, '.claude', 'skills');
      const existingSkillDir = path.join(existingSkillsDir, 'stdd-init');
      fs.mkdirSync(existingSkillDir, { recursive: true });
      fs.writeFileSync(
        path.join(existingSkillDir, 'SKILL.md'),
        '# My Custom Modified SKILL\n\nlocal changes here\n'
      );

      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { force: false });

      const content = fs.readFileSync(
        path.join(existingSkillDir, 'SKILL.md'),
        'utf-8'
      );
      expect(content).toBe('# My Custom Modified SKILL\n\nlocal changes here\n');

      const summaryCall = logSpy.mock.calls.find(call =>
        String(call[0]).includes('Update summary')
      );
      expect(summaryCall).toBeDefined();

      const localChangesCall = logSpy.mock.calls.find(call => {
        const msg = String(call[0]);
        return msg.includes('local changes 1') || msg.includes('local changes 2') || msg.includes('local changes 3');
      });
      expect(localChangesCall).toBeDefined();
    });

    it('should skip locally modified schema files', async () => {
      const projectPath = createTempProject('modified-schema-project');

      const targetSchemaDir = path.join(projectPath, 'schemas', 'spec-driven');
      fs.mkdirSync(targetSchemaDir, { recursive: true });
      fs.writeFileSync(
        path.join(targetSchemaDir, 'schema.yaml'),
        '# Modified schema\nmodified: true\n'
      );

      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { force: false });

      const content = fs.readFileSync(
        path.join(targetSchemaDir, 'schema.yaml'),
        'utf-8'
      );
      expect(content).toBe('# Modified schema\nmodified: true\n');
    });
  });

  describe('--force flag', () => {
    it('should overwrite all files including locally modified ones', async () => {
      const projectPath = createTempProject('force-project');

      const existingSkillsDir = path.join(projectPath, '.claude', 'skills');
      const existingSkillDir = path.join(existingSkillsDir, 'stdd-init');
      fs.mkdirSync(existingSkillDir, { recursive: true });
      fs.writeFileSync(
        path.join(existingSkillDir, 'SKILL.md'),
        '# My Custom SKILL\n\nshould be overwritten\n'
      );

      const targetSchemaDir = path.join(projectPath, 'schemas', 'spec-driven');
      fs.mkdirSync(targetSchemaDir, { recursive: true });
      fs.writeFileSync(
        path.join(targetSchemaDir, 'schema.yaml'),
        '# Modified schema\nshould be: overwritten\n'
      );

      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { force: true });

      const skillContent = fs.readFileSync(
        path.join(existingSkillDir, 'SKILL.md'),
        'utf-8'
      );
      expect(skillContent).not.toBe('# My Custom SKILL\n\nshould be overwritten\n');

      const schemaContent = fs.readFileSync(
        path.join(targetSchemaDir, 'schema.yaml'),
        'utf-8'
      );
      expect(schemaContent).not.toBe('# Modified schema\nshould be: overwritten\n');
    });
  });

  describe('--dry-run flag', () => {
    it('should not modify any files in dry-run mode', async () => {
      const projectPath = createTempProject('dryrun-project');

      const existingSkillsDir = path.join(projectPath, '.claude', 'skills');
      const existingSkillDir = path.join(existingSkillsDir, 'stdd-init');
      fs.mkdirSync(existingSkillDir, { recursive: true });

      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { dryRun: true });

      expect(fs.readdirSync(existingSkillsDir).length).toBe(1);

      const dryRunCall = logSpy.mock.calls.find(call =>
        String(call[0]).includes('Dry run complete')
      );
      expect(dryRunCall).toBeDefined();
    });

    it('should show what would be added in dry-run mode', async () => {
      const projectPath = createTempProject('dryrun-show-project');

      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { dryRun: true });

      const addedCall = logSpy.mock.calls.find(call => {
        const msg = String(call[0]);
        return msg.includes('added') && (msg.includes('Skills:') || msg.includes('Engine commands:'));
      });
      expect(addedCall).toBeDefined();
    });

    it('should report workspace registry plan without writing config in dry-run mode', async () => {
      const projectPath = createTempProject('dryrun-workspace-project');
      const configPath = path.join(projectPath, 'stdd', 'config.yaml');
      fs.writeFileSync(configPath, 'version: "1.0"\nname: "dryrun-workspace-project"\n');
      fs.writeFileSync(path.join(projectPath, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
      fs.mkdirSync(path.join(projectPath, 'packages', 'api'), { recursive: true });
      fs.writeFileSync(
        path.join(projectPath, 'packages', 'api', 'package.json'),
        JSON.stringify({ name: '@scope/api' })
      );

      const before = fs.readFileSync(configPath, 'utf8');
      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { dryRun: true });

      expect(fs.readFileSync(configPath, 'utf8')).toBe(before);
      const registryCall = logSpy.mock.calls.find(call =>
        String(call[0]).includes('Workspace registry: would update')
      );
      expect(registryCall).toBeDefined();
    });
  });

  describe('config.yaml merge', () => {
    it('should merge new fields into existing config.yaml', async () => {
      const projectPath = createTempProject('config-merge-project');

      const configPath = path.join(projectPath, 'stdd', 'config.yaml');
      fs.writeFileSync(configPath, `# STDD Copilot Configuration
version: "1.0"
name: "my-project"

project:
  type: "typescript"
  language: "typescript"
`);

      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { force: false });

      const mergedContent = fs.readFileSync(configPath, 'utf-8');
      expect(mergedContent).toContain('name: "my-project"');
      expect(mergedContent).toContain('type: "typescript"');
      expect(mergedContent).toContain('# Added by stdd update');
    });

    it('should skip config if already up to date', async () => {
      const projectPath = createTempProject('config-uptodate-project');

      const defaultConfigPath = path.join(__dirname, '..', 'stdd', 'config.yaml');
      const defaultContent = fs.readFileSync(defaultConfigPath, 'utf-8');

      const configPath = path.join(projectPath, 'stdd', 'config.yaml');
      fs.writeFileSync(configPath, defaultContent);

      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { force: false });

      const configCall = logSpy.mock.calls.find(call => {
        const msg = String(call[0]);
        return msg.includes('Config:') && msg.includes('skipped');
      });
      expect(configCall).toBeDefined();
    });

    it('should merge new workspaces without overwriting custom fields', async () => {
      const projectPath = createTempProject('config-workspace-merge-project');
      const configPath = path.join(projectPath, 'stdd', 'config.yaml');
      fs.writeFileSync(configPath, `version: "1.0"
name: "workspace-merge"
workspaces:
  enabled: true
  items:
    - name: "@scope/api"
      root: "packages/api"
      source_root: "custom/api/src"
      package_json: "packages/api/package.json"
      owner: "platform"
`);
      fs.writeFileSync(path.join(projectPath, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
      fs.mkdirSync(path.join(projectPath, 'packages', 'api'), { recursive: true });
      fs.writeFileSync(
        path.join(projectPath, 'packages', 'api', 'package.json'),
        JSON.stringify({ name: '@scope/api' })
      );
      fs.mkdirSync(path.join(projectPath, 'packages', 'web'), { recursive: true });
      fs.writeFileSync(
        path.join(projectPath, 'packages', 'web', 'package.json'),
        JSON.stringify({ name: '@scope/web' })
      );

      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { force: false });

      const mergedContent = fs.readFileSync(configPath, 'utf8');
      expect(mergedContent).toContain('owner: platform');
      expect(mergedContent).toContain('source_root: "packages/api/src"');
      expect(mergedContent).toContain('name: "@scope/web"');
      expect(mergedContent).toContain('root: "packages/web"');
    });
  });

  describe('STDD not initialized', () => {
    it('should throw error if stdd directory does not exist', async () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-update-not-init-'));
      const projectPath = path.join(root, 'project');
      fs.mkdirSync(projectPath, { recursive: true });
      tempDirs.push(root);

      const updateCommand = new UpdateCommand(silentSpinner);
      await expect(updateCommand.execute(projectPath, {}))
        .rejects
        .toThrow('STDD not initialized');
    });
  });
});
