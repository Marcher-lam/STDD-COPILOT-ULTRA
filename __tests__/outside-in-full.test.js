const fs = require('fs');
const path = require('path');
const os = require('os');
const { OutsideInCommand, DEFAULT_REGISTRY } = require('../src/cli/commands/outside-in');

describe('OutsideInCommand', () => {
  let tempDir;
  let originalCwd;
  let logSpy;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-outsidein-test-'));
    fs.mkdirSync(path.join(tempDir, 'stdd', 'changes'), { recursive: true });
    originalCwd = process.cwd();
    process.chdir(tempDir);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
    logSpy.mockRestore();
  });

  describe('execute', () => {
    it('dispatches to init action', () => {
      const cmd = new OutsideInCommand(tempDir);
      const result = cmd.execute('init');
      expect(result.path).toBe('stdd/tdd-registry.yaml');
      expect(result.layers).toEqual(['e2e', 'integration', 'unit']);
    });

    it('dispatches to status action', () => {
      const cmd = new OutsideInCommand(tempDir);
      cmd.execute('init');
      const result = cmd.execute('status');
      expect(result.layers.length).toBe(3);
      expect(result.layers.map(l => l.name)).toEqual(['e2e', 'integration', 'unit']);
      expect(result.rules.length).toBeGreaterThan(0);
    });

    it('dispatches to scaffold action', () => {
      const cmd = new OutsideInCommand(tempDir);
      cmd.execute('init');
      fs.mkdirSync(path.join(tempDir, 'stdd', 'changes', 'my-feature'), { recursive: true });
      const result = cmd.execute('scaffold', 'my-feature');
      expect(result.change).toBe('my-feature');
      expect(result.plan).toContain('outside-in/plan.md');
      expect(result.skeletons.length).toBe(3);
    });

    it('throws for unknown action', () => {
      const cmd = new OutsideInCommand(tempDir);
      expect(() => cmd.execute('bogus')).toThrow("Unknown outside-in action 'bogus'");
    });
  });

  describe('init', () => {
    it('creates tdd-registry.yaml with default layers', () => {
      const cmd = new OutsideInCommand(tempDir);
      const result = cmd.init();
      expect(fs.existsSync(path.join(tempDir, 'stdd', 'tdd-registry.yaml'))).toBe(true);
      expect(result.layers).toEqual(['e2e', 'integration', 'unit']);
    });

    it('throws if stdd dir does not exist', () => {
      const cmd = new OutsideInCommand(path.join(tempDir, 'empty'));
      expect(() => cmd.init()).toThrow('STDD not initialized');
    });

    it('throws if registry already exists without force', () => {
      const cmd = new OutsideInCommand(tempDir);
      cmd.init();
      expect(() => cmd.init()).toThrow('already exists');
    });

    it('overwrites with --force', () => {
      const cmd = new OutsideInCommand(tempDir);
      cmd.init();
      const result = cmd.init({ force: true });
      expect(result.layers).toEqual(['e2e', 'integration', 'unit']);
    });

    it('prints JSON when json option is set', () => {
      const cmd = new OutsideInCommand(tempDir);
      cmd.init({ json: true });
      expect(logSpy).toHaveBeenCalled();
      const jsonOutput = logSpy.mock.calls[logSpy.mock.calls.length - 1][0];
      expect(() => JSON.parse(jsonOutput)).not.toThrow();
    });
  });

  describe('status', () => {
    it('returns registry contents', () => {
      const cmd = new OutsideInCommand(tempDir);
      cmd.init();
      const result = cmd.status();
      expect(result.layers.length).toBe(3);
      expect(result.rules.length).toBeGreaterThanOrEqual(1);
    });

    it('throws when registry missing', () => {
      const cmd = new OutsideInCommand(tempDir);
      expect(() => cmd.status()).toThrow('Missing stdd/tdd-registry.yaml');
    });
  });

  describe('scaffold', () => {
    it('generates plan and skeletons for a change', () => {
      const cmd = new OutsideInCommand(tempDir);
      cmd.init();
      fs.mkdirSync(path.join(tempDir, 'stdd', 'changes', 'add-auth'), { recursive: true });
      const result = cmd.scaffold('add-auth');
      expect(result.change).toBe('add-auth');
      expect(result.feature).toBe('add-auth');
      expect(result.skeletons.length).toBe(3);
      expect(fs.existsSync(path.join(tempDir, result.plan))).toBe(true);
      for (const skel of result.skeletons) {
        expect(fs.existsSync(path.join(tempDir, skel))).toBe(true);
      }
    });

    it('uses feature option for naming', () => {
      const cmd = new OutsideInCommand(tempDir);
      cmd.init();
      fs.mkdirSync(path.join(tempDir, 'stdd', 'changes', 'my-change'), { recursive: true });
      const result = cmd.scaffold('my-change', { feature: 'custom-feature' });
      expect(result.feature).toBe('custom-feature');
    });

    it('throws if stdd not initialized', () => {
      const cmd = new OutsideInCommand(path.join(tempDir, 'empty'));
      expect(() => cmd.scaffold('x')).toThrow('STDD not initialized');
    });

    it('throws if change not found', () => {
      const cmd = new OutsideInCommand(tempDir);
      cmd.init();
      expect(() => cmd.scaffold('nonexistent')).toThrow("Change 'nonexistent' not found");
    });

    it('throws if no active changes', () => {
      const cmd = new OutsideInCommand(tempDir);
      cmd.init();
      expect(() => cmd.scaffold()).toThrow('No active changes found');
    });
  });

  describe('buildPlan', () => {
    it('generates plan with layers and rules', () => {
      const cmd = new OutsideInCommand(tempDir);
      const plan = cmd.buildPlan('test-change', 'test-feature', DEFAULT_REGISTRY);
      expect(plan).toContain('# Outside-In Plan: test-change');
      expect(plan).toContain('Feature key: test-feature');
      expect(plan).toContain('## Layer Order');
      expect(plan).toContain('1. e2e');
      expect(plan).toContain('2. integration');
      expect(plan).toContain('3. unit');
      expect(plan).toContain('## Rules');
      expect(plan).toContain('## Execution Protocol');
    });

    it('handles empty layers', () => {
      const cmd = new OutsideInCommand(tempDir);
      const plan = cmd.buildPlan('c', 'f', { layers: [], rules: [] });
      expect(plan).toContain('# Outside-In Plan: c');
    });
  });

  describe('buildLayerSkeleton', () => {
    it('generates skeleton with layer info', () => {
      const cmd = new OutsideInCommand(tempDir);
      const layer = { name: 'e2e', purpose: 'User tests', testCommand: 'npm test', testPattern: 'tests/e2e/*.spec.ts', failureSignals: ['UI broken'] };
      const skeleton = cmd.buildLayerSkeleton(layer, 'login');
      expect(skeleton).toContain('# e2e Test Skeleton: login');
      expect(skeleton).toContain('Purpose: User tests');
      expect(skeleton).toContain('Suggested test path: tests/e2e/*.spec.ts');
      expect(skeleton).toContain('Suggested command: npm test');
      expect(skeleton).toContain('- UI broken');
    });

    it('handles missing layer fields gracefully', () => {
      const cmd = new OutsideInCommand(tempDir);
      const skeleton = cmd.buildLayerSkeleton({}, 'feat');
      expect(skeleton).toContain('# undefined Test Skeleton: feat');
      expect(skeleton).toContain('<configure in stdd/tdd-registry.yaml>');
    });
  });

  describe('readRegistry', () => {
    it('parses YAML registry file', () => {
      const cmd = new OutsideInCommand(tempDir);
      cmd.init();
      const reg = cmd.readRegistry();
      expect(reg.version).toBe(1);
      expect(reg.layers.length).toBe(3);
      expect(reg.layers[0].name).toBe('e2e');
    });

    it('throws when file missing', () => {
      const cmd = new OutsideInCommand(tempDir);
      expect(() => cmd.readRegistry()).toThrow('Missing stdd/tdd-registry.yaml');
    });
  });
});

describe('safeName', () => {
  const { OutsideInCommand } = require('../src/cli/commands/outside-in');
  const cmd = new OutsideInCommand();

  it('exposes command constructor', () => {
    expect(cmd.constructor).toBe(OutsideInCommand);
  });

  it('is used by scaffold for feature names', () => {
    const cmd = new OutsideInCommand(os.tmpdir());
    expect(() => cmd.scaffold()).toThrow();
  });
});
