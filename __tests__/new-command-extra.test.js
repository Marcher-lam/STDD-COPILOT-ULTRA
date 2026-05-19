/**
 * Extra tests for NewCommand edge cases not covered by new-command.test.js.
 *
 * new-command.test.js covers: createChange, createSpec, generateProposalTemplate,
 * generateSpecTemplate, validateName, ensureWorkspaceDir (ENOENT path).
 *
 * This file covers:
 *   - ensureWorkspaceDir with non-ENOENT errors (EACCES, generic)
 *   - createSpec spec file already exists (not just directory)
 *   - createSpec with validation failure
 *   - createChange with mkdir failure (non-EEXIST)
 *   - Constructor behavior (no spinner vs with spinner)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { NewCommand } = require('../src/cli/commands/new');

jest.mock('chalk', () => {
  const fn = (...args) => args.join('');
  fn.green = fn;
  fn.cyan = fn;
  fn.yellow = fn;
  fn.red = fn;
  fn.dim = fn;
  fn.bold = fn;
  return fn;
});

describe('NewCommand edge cases', () => {
  let tempDirs = [];
  let originalCwd;
  let logSpy;

  function createTempProject(name, initialized = true) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-new-extra-'));
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

  // --- Constructor ---

  describe('constructor', () => {
    it('creates instance without spinner', () => {
      const cmd = new NewCommand();
      expect(cmd.spinner).toBeUndefined();
    });

    it('creates instance with spinner', () => {
      const cmd = new NewCommand(silentSpinner);
      expect(cmd.spinner).toBe(silentSpinner);
    });
  });

  // --- ensureWorkspaceDir ---

  describe('ensureWorkspaceDir', () => {
    it('succeeds when directory exists', async () => {
      const projectPath = createTempProject('access-ok');
      process.chdir(projectPath);

      const cmd = new NewCommand(silentSpinner);
      const changesDir = path.join(projectPath, 'stdd', 'changes');

      // Should not throw
      await expect(cmd.ensureWorkspaceDir(changesDir)).resolves.toBeUndefined();
    });

    it('throws STDD not initialized for ENOENT', async () => {
      const cmd = new NewCommand(silentSpinner);
      await expect(cmd.ensureWorkspaceDir('/nonexistent/path'))
        .rejects.toThrow('STDD not initialized');
    });

    it('throws generic error for non-ENOENT errors', async () => {
      const cmd = new NewCommand(silentSpinner);

      // Mock fs.access to throw EACCES
      const fsPromises = require('fs').promises;
      const origAccess = fsPromises.access;
      fsPromises.access = jest.fn().mockRejectedValue(
        Object.assign(new Error('permission denied'), { code: 'EACCES' })
      );

      await expect(cmd.ensureWorkspaceDir('/some/dir'))
        .rejects.toThrow('Cannot access workspace directory');

      fsPromises.access = origAccess;
    });
  });

  // --- createChange error paths ---

  describe('createChange error paths', () => {
    it('re-throws non-EEXIST mkdir errors', async () => {
      const projectPath = createTempProject('mkdir-error');
      process.chdir(projectPath);

      const cmd = new NewCommand(silentSpinner);

      // Mock fs.mkdir to throw a non-EEXIST error
      const fsPromises = require('fs').promises;
      const origMkdir = fsPromises.mkdir;
      fsPromises.mkdir = jest.fn().mockRejectedValue(
        Object.assign(new Error('disk full'), { code: 'ENOSPC' })
      );

      await expect(cmd.createChange('test-change'))
        .rejects.toThrow('disk full');

      fsPromises.mkdir = origMkdir;
    });

    it('validates name before creating change', async () => {
      const projectPath = createTempProject('validation');
      process.chdir(projectPath);

      const cmd = new NewCommand(silentSpinner);
      await expect(cmd.createChange('')).rejects.toThrow();
    });
  });

  // --- createSpec error paths ---

  describe('createSpec error paths', () => {
    it('re-throws non-ENOENT access errors during spec check', async () => {
      const projectPath = createTempProject('spec-access-error');
      process.chdir(projectPath);

      const cmd = new NewCommand(silentSpinner);

      // First call to access (for specsDir) succeeds
      // Second call (for specFile) throws EACCES
      const fsPromises = require('fs').promises;
      const origAccess = fsPromises.access;
      let callCount = 0;
      fsPromises.access = jest.fn().mockImplementation(async (p) => {
        callCount++;
        if (p.includes('spec.md') && callCount > 1) {
          throw Object.assign(new Error('access denied'), { code: 'EACCES' });
        }
        return undefined;
      });

      await expect(cmd.createSpec('billing'))
        .rejects.toThrow('access denied');

      fsPromises.access = origAccess;
    });

    it('validates name before creating spec', async () => {
      const projectPath = createTempProject('spec-validation');
      process.chdir(projectPath);

      const cmd = new NewCommand(silentSpinner);
      await expect(cmd.createSpec('')).rejects.toThrow();
    });

    it('detects existing spec via access succeeding (not ENOENT)', async () => {
      const projectPath = createTempProject('spec-exists');
      process.chdir(projectPath);

      const cmd = new NewCommand(silentSpinner);

      // Create the spec directory and file to simulate it existing
      const specDir = path.join(projectPath, 'stdd', 'specs', 'existing');
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(path.join(specDir, 'spec.md'), '# Existing Spec\n');

      await expect(cmd.createSpec('existing'))
        .rejects.toThrow("Spec 'existing' already exists.");
    });
  });

  // --- generateProposalTemplate edge cases ---

  describe('generateProposalTemplate edge cases', () => {
    it('uses default placeholder when no description provided', () => {
      const cmd = new NewCommand(silentSpinner);
      const template = cmd.generateProposalTemplate('my-change', 'My Title');
      expect(template).toContain('[描述问题背景');
      expect(template).toContain('my-change');
    });

    it('includes current date in metadata', () => {
      const cmd = new NewCommand(silentSpinner);
      const template = cmd.generateProposalTemplate('dated', 'Dated', 'desc');
      const today = new Date().toISOString().split('T')[0];
      expect(template).toContain(today);
    });

    it('includes all major sections', () => {
      const cmd = new NewCommand(silentSpinner);
      const template = cmd.generateProposalTemplate('full', 'Full', 'Full desc');
      expect(template).toContain('## Intent');
      expect(template).toContain('## Scope');
      expect(template).toContain('In Scope');
      expect(template).toContain('Out of Scope');
      expect(template).toContain('Target Users');
      expect(template).toContain('## Approach');
      expect(template).toContain('Technical Strategy');
      expect(template).toContain('Key Decisions');
      expect(template).toContain('Dependencies');
      expect(template).toContain('## Success Criteria');
      expect(template).toContain('Functional');
      expect(template).toContain('Non-Functional');
      expect(template).toContain('Quality');
      expect(template).toContain('## Risks');
      expect(template).toContain('## Timeline');
      expect(template).toContain('## Open Questions');
      expect(template).toContain('## References');
      expect(template).toContain('## Metadata');
    });
  });

  // --- generateSpecTemplate edge cases ---

  describe('generateSpecTemplate edge cases', () => {
    it('includes current date', () => {
      const cmd = new NewCommand(silentSpinner);
      const template = cmd.generateSpecTemplate('orders');
      const today = new Date().toISOString().split('T')[0];
      expect(template).toContain(today);
    });

    it('includes all major sections', () => {
      const cmd = new NewCommand(silentSpinner);
      const template = cmd.generateSpecTemplate('products');
      expect(template).toContain('# Spec: products');
      expect(template).toContain('## Requirements');
      expect(template).toContain('## Data Models');
      expect(template).toContain('## API Contracts');
      expect(template).toContain('## Notes');
      expect(template).toContain('productsModel');
    });
  });

  // --- validateName edge cases ---

  describe('validateName edge cases', () => {
    it('accepts valid names with hyphens, underscores, dots', () => {
      const cmd = new NewCommand(silentSpinner);
      expect(() => cmd.validateName('my-feature_v2.1')).not.toThrow();
    });

    it('rejects names starting with non-alphanumeric', () => {
      const cmd = new NewCommand(silentSpinner);
      expect(() => cmd.validateName('-invalid')).toThrow();
    });

    it('rejects names with path separators', () => {
      const cmd = new NewCommand(silentSpinner);
      expect(() => cmd.validateName('path/to/change')).toThrow();
    });

    it('rejects names with path traversal', () => {
      const cmd = new NewCommand(silentSpinner);
      expect(() => cmd.validateName('..traversal')).toThrow();
    });

    it('rejects names that are too long', () => {
      const cmd = new NewCommand(silentSpinner);
      const longName = 'a'.repeat(129);
      expect(() => cmd.validateName(longName)).toThrow();
    });
  });
});
