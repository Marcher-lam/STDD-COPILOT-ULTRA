const HeterogeneousAdapter = require('../src/utils/heterogeneous-adapter');
const path = require('path');
const fs = require('fs');
const os = require('os');
const yaml = require('js-yaml');

/**
 * Tests targeting uncovered branches in heterogeneous-adapter.js
 * Lines 42-51: partial tier skill matching + basic tier inject_only matching
 */
describe('HeterogeneousAdapter branch coverage', () => {
  let tmpDir;
  let yamlPath;

  function writeEnginesYaml(engines) {
    const content = yaml.dump(engines);
    fs.writeFileSync(yamlPath, content, 'utf8');
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-ha-'));
    yamlPath = path.join(tmpDir, 'engines.yaml');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('partial tier — supported_skills matching (line 43-45)', () => {
    it('matches skill in partial engine supported_skills list', () => {
      writeEnginesYaml({
        'partial-engine': {
          name: 'Partial Engine',
          type: 'cli',
          enabled: true,
          skills_compatibility: 'partial',
          adaptation: { supported_skills: ['stdd-spec', 'stdd-apply'] },
        },
      });

      const adapter = new HeterogeneousAdapter(yamlPath);
      const result = adapter.findCapableEngines('stdd-spec');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        engine: 'partial-engine',
        tier: 'partial',
        meta: expect.objectContaining({ name: 'Partial Engine' }),
      });
    });

    it('does not match skill missing from partial supported_skills', () => {
      writeEnginesYaml({
        'partial-engine': {
          name: 'Partial Engine',
          type: 'cli',
          enabled: true,
          skills_compatibility: 'partial',
          adaptation: { supported_skills: ['stdd-spec'] },
        },
      });

      const adapter = new HeterogeneousAdapter(yamlPath);
      const result = adapter.findCapableEngines('stdd-apply');
      expect(result).toHaveLength(0);
    });

    it('handles partial engine without adaptation field', () => {
      writeEnginesYaml({
        'partial-engine': {
          name: 'Partial Engine',
          type: 'cli',
          enabled: true,
          skills_compatibility: 'partial',
        },
      });

      const adapter = new HeterogeneousAdapter(yamlPath);
      const result = adapter.findCapableEngines('stdd-spec');
      expect(result).toHaveLength(0);
    });
  });

  describe('basic tier — inject_only matching (line 49-51)', () => {
    it('matches skill via inject_only substring match', () => {
      writeEnginesYaml({
        'basic-engine': {
          name: 'Basic Engine',
          type: 'inject',
          enabled: true,
          skills_compatibility: 'basic',
          adaptation: { inject_only: ['constitution', 'guard'] },
        },
      });

      const adapter = new HeterogeneousAdapter(yamlPath);
      const result = adapter.findCapableEngines('stdd-constitution');
      expect(result).toHaveLength(1);
      expect(result[0].tier).toBe('basic');
    });

    it('does not match skill not in inject_only list', () => {
      writeEnginesYaml({
        'basic-engine': {
          name: 'Basic Engine',
          type: 'inject',
          enabled: true,
          skills_compatibility: 'basic',
          adaptation: { inject_only: ['constitution'] },
        },
      });

      const adapter = new HeterogeneousAdapter(yamlPath);
      const result = adapter.findCapableEngines('stdd-spec');
      expect(result).toHaveLength(0);
    });

    it('handles basic engine without adaptation field', () => {
      writeEnginesYaml({
        'basic-engine': {
          name: 'Basic Engine',
          type: 'inject',
          enabled: true,
          skills_compatibility: 'basic',
        },
      });

      const adapter = new HeterogeneousAdapter(yamlPath);
      const result = adapter.findCapableEngines('stdd-guard');
      expect(result).toHaveLength(0);
    });
  });

  describe('assignEngines reuse path (line 81-83)', () => {
    it('reuses engines when all are already assigned', () => {
      writeEnginesYaml({
        'only-engine': {
          name: 'Only Engine',
          type: 'cli',
          enabled: true,
          skills_compatibility: 'full',
        },
      });

      const adapter = new HeterogeneousAdapter(yamlPath);
      // Two skills but only one engine => second skill reuses the engine
      const assignment = adapter.assignEngines(['stdd-spec', 'stdd-apply']);
      expect(assignment.size).toBe(2);
      expect(assignment.get('stdd-spec')).toBe('only-engine');
      expect(assignment.get('stdd-apply')).toBe('only-engine');
    });

    it('returns empty map when no capable engines exist for a skill', () => {
      writeEnginesYaml({
        'basic-engine': {
          name: 'Basic Engine',
          type: 'inject',
          enabled: true,
          skills_compatibility: 'basic',
          adaptation: { inject_only: ['guard'] },
        },
      });

      const adapter = new HeterogeneousAdapter(yamlPath);
      const assignment = adapter.assignEngines(['stdd-spec']);
      expect(assignment.size).toBe(0);
    });
  });

  describe('degrade with multi-tier engines', () => {
    it('degrades from full to partial tier', () => {
      writeEnginesYaml({
        'full-engine': {
          name: 'Full Engine',
          type: 'cli',
          enabled: true,
          skills_compatibility: 'full',
        },
        'partial-engine': {
          name: 'Partial Engine',
          type: 'cli',
          enabled: true,
          skills_compatibility: 'partial',
          adaptation: { supported_skills: ['stdd-spec'] },
        },
      });

      const adapter = new HeterogeneousAdapter(yamlPath);
      const degraded = adapter.degrade('full-engine', 'stdd-spec');
      expect(degraded).toBe('partial-engine');
    });

    it('degrades from partial to basic tier', () => {
      writeEnginesYaml({
        'partial-engine': {
          name: 'Partial Engine',
          type: 'cli',
          enabled: true,
          skills_compatibility: 'partial',
          adaptation: { supported_skills: ['stdd-guard'] },
        },
        'basic-engine': {
          name: 'Basic Engine',
          type: 'inject',
          enabled: true,
          skills_compatibility: 'basic',
          adaptation: { inject_only: ['guard'] },
        },
      });

      const adapter = new HeterogeneousAdapter(yamlPath);
      const degraded = adapter.degrade('partial-engine', 'stdd-guard');
      expect(degraded).toBe('basic-engine');
    });

    it('returns null when failed engine is unknown', () => {
      writeEnginesYaml({
        'full-engine': {
          name: 'Full Engine',
          type: 'cli',
          enabled: true,
          skills_compatibility: 'full',
        },
      });

      const adapter = new HeterogeneousAdapter(yamlPath);
      const degraded = adapter.degrade('nonexistent-engine', 'stdd-spec');
      // nonexistent engine has no tier => 'basic', no capable engines at that level
      // but full-engine can execute stdd-spec at 'full' tier which is above 'basic'
      // degrade starts from failedTierIdx (basic=2) and goes through end of chain
      // So it won't find full-engine since it's at a higher tier
      expect(degraded).toBeNull();
    });

    it('skips same engine when degrading', () => {
      writeEnginesYaml({
        'only-engine': {
          name: 'Only Engine',
          type: 'cli',
          enabled: true,
          skills_compatibility: 'full',
        },
      });

      const adapter = new HeterogeneousAdapter(yamlPath);
      const degraded = adapter.degrade('only-engine', 'stdd-spec');
      expect(degraded).toBeNull();
    });
  });

  describe('normalizeOutput edge cases', () => {
    it('handles engine with no name or type', () => {
      writeEnginesYaml({
        'bare-engine': {
          name: 'Bare Engine',
          type: 'cli',
          enabled: true,
          skills_compatibility: 'full',
        },
      });

      const adapter = new HeterogeneousAdapter(yamlPath);
      const result = adapter.normalizeOutput('nonexistent', { foo: 'bar' });
      expect(result.engineName).toBe('nonexistent');
      expect(result.engineType).toBe('unknown');
      expect(result.qualityTier).toBe('basic');
    });

    it('uses rawOutput as data when no data field', () => {
      writeEnginesYaml({
        'full-engine': {
          name: 'Full Engine',
          type: 'cli',
          enabled: true,
          skills_compatibility: 'full',
        },
      });

      const adapter = new HeterogeneousAdapter(yamlPath);
      const result = adapter.normalizeOutput('full-engine', { raw: 'value' });
      expect(result.data).toEqual({ raw: 'value' });
    });
  });

  describe('_loadEngines edge cases', () => {
    it('filters out entries without name', () => {
      writeEnginesYaml({
        'valid': { name: 'Valid', type: 'cli', enabled: true, skills_compatibility: 'full' },
        'empty': null,
        'noname': { type: 'cli' },
      });

      const adapter = new HeterogeneousAdapter(yamlPath);
      expect(Object.keys(adapter.engines)).toEqual(['valid']);
    });

    it('returns empty on invalid yaml', () => {
      fs.writeFileSync(yamlPath, '::invalid: yaml: [', 'utf8');
      const adapter = new HeterogeneousAdapter(yamlPath);
      expect(adapter.engines).toEqual({});
    });
  });

  describe('_isEnabled string without env pattern', () => {
    it('returns false for arbitrary string', () => {
      const adapter = new HeterogeneousAdapter('/nonexistent');
      expect(adapter._isEnabled({ enabled: 'random-string' })).toBe(false);
    });
  });

  describe('getStats with mixed engines', () => {
    it('counts engines by tier correctly', () => {
      writeEnginesYaml({
        'full-e': { name: 'Full', type: 'cli', enabled: true, skills_compatibility: 'full' },
        'partial-e': { name: 'Partial', type: 'cli', enabled: true, skills_compatibility: 'partial', adaptation: { supported_skills: [] } },
        'basic-e': { name: 'Basic', type: 'inject', enabled: true, skills_compatibility: 'basic' },
        'disabled-e': { name: 'Disabled', type: 'cli', enabled: false, skills_compatibility: 'full' },
      });

      const adapter = new HeterogeneousAdapter(yamlPath);
      const stats = adapter.getStats();
      expect(stats.total).toBe(4);
      expect(stats.enabled).toBe(3);
      expect(stats.byTier.full).toBe(1);
      expect(stats.byTier.partial).toBe(1);
      expect(stats.byTier.basic).toBe(1);
    });
  });

  describe('findCapableEngines skips disabled engines', () => {
    it('excludes engines with enabled=false', () => {
      writeEnginesYaml({
        'disabled': { name: 'Disabled', type: 'cli', enabled: false, skills_compatibility: 'full' },
      });

      const adapter = new HeterogeneousAdapter(yamlPath);
      const result = adapter.findCapableEngines('stdd-spec');
      expect(result).toHaveLength(0);
    });
  });

  // ─── Additional branch coverage for lines 47, 182, 193, 203 ───

  describe('_getCompatTier — engine without skills_compatibility (line 203)', () => {
    it('returns basic when engine has no skills_compatibility field', () => {
      writeEnginesYaml({
        'no-tier': { name: 'No Tier', type: 'cli', enabled: true },
      });

      const adapter = new HeterogeneousAdapter(yamlPath);
      // _getCompatTier is called internally; verify via getStats
      const stats = adapter.getStats();
      expect(stats.byTier.basic).toBe(1);
    });
  });

  describe('_buildTierMap — unknown tier value (line 182)', () => {
    it('handles engine with unrecognized skills_compatibility value', () => {
      writeEnginesYaml({
        'weird-tier': { name: 'Weird', type: 'cli', enabled: true, skills_compatibility: 'premium' },
      });

      const adapter = new HeterogeneousAdapter(yamlPath);
      // 'premium' is not in tierMap keys, so map[tier] is undefined -> false branch of line 182
      expect(adapter.tierMap.full).toEqual([]);
      expect(adapter.tierMap.partial).toEqual([]);
      expect(adapter.tierMap.basic).toEqual([]);
      // Engine is still counted in total but not in any tier bucket
      const stats = adapter.getStats();
      expect(stats.total).toBe(1);
      expect(stats.enabled).toBe(1);
    });
  });

  describe('findCapableEngines — unknown compat tier (line 47 implicit else)', () => {
    it('skips engines with unrecognized skills_compatibility value', () => {
      writeEnginesYaml({
        'unknown-tier': { name: 'Unknown', type: 'cli', enabled: true, skills_compatibility: 'premium' },
      });

      const adapter = new HeterogeneousAdapter(yamlPath);
      // compat='premium' matches neither 'full', 'partial', nor 'basic'
      const result = adapter.findCapableEngines('stdd-spec');
      expect(result).toHaveLength(0);
    });
  });

  describe('_isEnabled — env var pattern with variable set (line 193)', () => {
    it('returns false when env var is explicitly set to "false"', () => {
      process.env.TEST_ENGINE_FLAG = 'false';
      try {
        const adapter = new HeterogeneousAdapter('/nonexistent');
        const engine = {
          enabled: '${TEST_ENGINE_FLAG:-true}',
        };
        expect(adapter._isEnabled(engine)).toBe(false);
      } finally {
        delete process.env.TEST_ENGINE_FLAG;
      }
    });

    it('returns true when env var is set to "true"', () => {
      process.env.TEST_ENGINE_FLAG = 'true';
      try {
        const adapter = new HeterogeneousAdapter('/nonexistent');
        const engine = {
          enabled: '${TEST_ENGINE_FLAG:-false}',
        };
        expect(adapter._isEnabled(engine)).toBe(true);
      } finally {
        delete process.env.TEST_ENGINE_FLAG;
      }
    });

    it('returns true when env var is set to a non-"false" value', () => {
      process.env.TEST_ENGINE_FLAG = 'yes';
      try {
        const adapter = new HeterogeneousAdapter('/nonexistent');
        const engine = {
          enabled: '${TEST_ENGINE_FLAG:-false}',
        };
        expect(adapter._isEnabled(engine)).toBe(true);
      } finally {
        delete process.env.TEST_ENGINE_FLAG;
      }
    });
  });
});
