const fs = require('fs');
const path = require('path');
const os = require('os');
const { SkillConfigResolver } = require('../src/utils/skill-config-resolver');

describe('SkillConfigResolver', () => {
  let tmpDir;
  let resolver;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-skill-config-'));
    const stddDir = path.join(tmpDir, 'stdd');
    fs.mkdirSync(path.join(stddDir, 'config'), { recursive: true });
    resolver = new SkillConfigResolver(stddDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('resolve', () => {
    it('returns base config when no overrides exist', () => {
      const result = resolver.resolve('stdd:spec', { requireMutation: false, maxTasks: 6 });
      expect(result.requireMutation).toBe(false);
      expect(result.maxTasks).toBe(6);
    });

    it('merges team overrides on top of base', () => {
      const teamPath = path.join(tmpDir, 'stdd', 'config', 'skill-overrides.yaml');
      fs.writeFileSync(teamPath, 'stdd:spec:\n  requireMutation: true\n');

      const result = resolver.resolve('stdd:spec', { requireMutation: false, maxTasks: 6 });
      expect(result.requireMutation).toBe(true);
      expect(result.maxTasks).toBe(6);
    });

    it('caches resolved configs', () => {
      const result1 = resolver.resolve('test', { key: 'val' });
      const result2 = resolver.resolve('test', { key: 'val' });
      expect(result1).toBe(result2);
    });
  });

  describe('override', () => {
    it('writes team override', () => {
      resolver.override('stdd:spec', 'requireMutation', true, 'team');

      const teamPath = path.join(tmpDir, 'stdd', 'config', 'skill-overrides.yaml');
      expect(fs.existsSync(teamPath)).toBe(true);
      const content = fs.readFileSync(teamPath, 'utf8');
      expect(content).toContain('stdd:spec');
      expect(content).toContain('requireMutation');
    });

    it('invalidates cache on override', () => {
      const result1 = resolver.resolve('test', { key: 'old' });
      resolver.override('test', 'key', 'new', 'team');
      const result2 = resolver.resolve('test', { key: 'old' });
      expect(result2.key).toBe('new');
    });
  });

  describe('listOverrides', () => {
    it('shows team and user overrides', () => {
      resolver.override('test', 'a', 1, 'team');
      resolver.override('test', 'b', 2, 'user');

      const overrides = resolver.listOverrides('test');
      expect(overrides.team).toHaveProperty('a');
      expect(overrides.user).toHaveProperty('b');
    });
  });

  describe('resetOverride', () => {
    it('removes a team override', () => {
      resolver.override('test', 'key', 'val', 'team');
      expect(resolver.resetOverride('test', 'key', 'team')).toBe(true);

      const overrides = resolver.listOverrides('test');
      expect(overrides.team).toEqual({});
    });

    it('returns false for non-existent override', () => {
      expect(resolver.resetOverride('test', 'nope', 'team')).toBe(false);
    });
  });

  describe('deep merge', () => {
    it('deep-merges nested objects', () => {
      const teamPath = path.join(tmpDir, 'stdd', 'config', 'skill-overrides.yaml');
      fs.writeFileSync(teamPath, 'stdd:spec:\n  thresholds:\n    coverage: 95\n');

      const result = resolver.resolve('stdd:spec', {
        thresholds: { coverage: 80, branch: 70 },
        maxTasks: 6,
      });
      expect(result.thresholds.coverage).toBe(95);
      expect(result.thresholds.branch).toBe(70);
      expect(result.maxTasks).toBe(6);
    });
  });
});
