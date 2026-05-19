const ParallelExecutor = require('../src/utils/parallel-executor');
const HeterogeneousAdapter = require('../src/utils/heterogeneous-adapter');

// HeterogeneousAdapter with no config returns empty engines
const stubAdapter = new HeterogeneousAdapter('/nonexistent/engines.yaml');

describe('ParallelExecutor core logic', () => {
  describe('_topologicalLayers', () => {
    it('handles linear chain', () => {
      const graph = {
        skills: {
          A: { depends_on: [] },
          B: { depends_on: ['A'] },
          C: { depends_on: ['B'] },
        },
      };
      const executor = new ParallelExecutor(graph, stubAdapter);
      const layers = executor._topologicalLayers();
      expect(layers).toEqual([['A'], ['B'], ['C']]);
    });

    it('handles diamond dependency', () => {
      const graph = {
        skills: {
          A: { depends_on: [] },
          B: { depends_on: ['A'] },
          C: { depends_on: ['A'] },
          D: { depends_on: ['B', 'C'] },
        },
      };
      const executor = new ParallelExecutor(graph, stubAdapter);
      const layers = executor._topologicalLayers();
      expect(layers.length).toBe(3);
      expect(layers[0]).toEqual(['A']);
      expect(layers[1].sort()).toEqual(['B', 'C']);
      expect(layers[2]).toEqual(['D']);
    });

    it('handles independent nodes', () => {
      const graph = {
        skills: {
          X: { depends_on: [] },
          Y: { depends_on: [] },
          Z: { depends_on: [] },
        },
      };
      const executor = new ParallelExecutor(graph, stubAdapter);
      const layers = executor._topologicalLayers();
      expect(layers.length).toBe(1);
      expect(layers[0].sort()).toEqual(['X', 'Y', 'Z']);
    });

    it('handles empty graph', () => {
      const executor = new ParallelExecutor({ skills: {} }, stubAdapter);
      expect(executor._topologicalLayers()).toEqual([]);
    });

    it('handles cycle by force-breaking', () => {
      const graph = {
        skills: {
          A: { depends_on: ['B'] },
          B: { depends_on: ['A'] },
        },
      };
      const executor = new ParallelExecutor(graph, stubAdapter);
      const layers = executor._topologicalLayers();
      // Should not infinite loop; should produce both nodes
      const allNodes = layers.flat();
      expect(allNodes.sort()).toEqual(['A', 'B']);
    });

    it('handles single node', () => {
      const graph = { skills: { root: { depends_on: [] } } };
      const executor = new ParallelExecutor(graph, stubAdapter);
      expect(executor._topologicalLayers()).toEqual([['root']]);
    });

    it('handles wide+deep graph', () => {
      const graph = {
        skills: {
          root: { depends_on: [] },
          left: { depends_on: ['root'] },
          mid: { depends_on: ['root'] },
          right: { depends_on: ['root'] },
          merge: { depends_on: ['left', 'mid', 'right'] },
        },
      };
      const executor = new ParallelExecutor(graph, stubAdapter);
      const layers = executor._topologicalLayers();
      expect(layers[0]).toEqual(['root']);
      expect(layers[1].sort()).toEqual(['left', 'mid', 'right']);
      expect(layers[2]).toEqual(['merge']);
    });
  });

  describe('_detectFileConflicts', () => {
    it('detects conflicting outputs', () => {
      const graph = {
        skills: {
          A: { depends_on: [], outputs: ['out.js'] },
          B: { depends_on: [], outputs: ['out.js'] },
        },
      };
      const executor = new ParallelExecutor(graph, stubAdapter);
      const conflicts = executor._detectFileConflicts(['A', 'B'], {});
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].filePath).toBe('out.js');
      expect(conflicts[0].conflictingNodes.sort()).toEqual(['A', 'B']);
    });

    it('returns empty when no conflicts', () => {
      const graph = {
        skills: {
          A: { depends_on: [], outputs: ['a.js'] },
          B: { depends_on: [], outputs: ['b.js'] },
        },
      };
      const executor = new ParallelExecutor(graph, stubAdapter);
      expect(executor._detectFileConflicts(['A', 'B'], {})).toEqual([]);
    });

    it('handles nodes without outputs', () => {
      const graph = {
        skills: {
          A: { depends_on: [] },
          B: { depends_on: [] },
        },
      };
      const executor = new ParallelExecutor(graph, stubAdapter);
      expect(executor._detectFileConflicts(['A', 'B'], {})).toEqual([]);
    });
  });

  describe('executeAll', () => {
    it('executes linear chain sequentially', async () => {
      const callOrder = [];
      const graph = {
        skills: {
          A: { depends_on: [] },
          B: { depends_on: ['A'] },
        },
      };
      const executor = new ParallelExecutor(graph, stubAdapter, {
        executeFn: async (nodeName) => {
          callOrder.push(nodeName);
          return { done: nodeName };
        },
      });
      const { results, layers } = await executor.executeAll();
      expect(results.A.done).toBe('A');
      expect(results.B.done).toBe('B');
      expect(layers).toEqual([['A'], ['B']]);
      expect(callOrder).toEqual(['A', 'B']);
    });

    it('executes independent nodes in parallel', async () => {
      const graph = {
        skills: {
          X: { depends_on: [] },
          Y: { depends_on: [] },
        },
      };
      const executor = new ParallelExecutor(graph, stubAdapter, {
        executeFn: async (nodeName) => ({ node: nodeName }),
      });
      const { results } = await executor.executeAll();
      expect(results.X.node).toBe('X');
      expect(results.Y.node).toBe('Y');
    });

    it('captures errors and marks degraded', async () => {
      const graph = {
        skills: {
          A: { depends_on: [] },
        },
      };
      let callCount = 0;
      const executor = new ParallelExecutor(graph, stubAdapter, {
        executeFn: async () => {
          callCount++;
          if (callCount === 1) throw new Error('first fail');
          return { success: true };
        },
      });
      const { results } = await executor.executeAll();
      // First call fails, retry succeeds or marks degraded
      expect(results.A).toBeDefined();
    });
  });

  describe('_getParallelGroups', () => {
    it('extracts groups from metadata', () => {
      const graph = {
        skills: {
          A: { depends_on: [], metadata: { parallel_group: 'verify-group' } },
          B: { depends_on: [], metadata: { parallel_group: 'verify-group' } },
          C: { depends_on: [] },
        },
      };
      const executor = new ParallelExecutor(graph, stubAdapter);
      const groups = executor._getParallelGroups();
      expect(groups['verify-group']).toBeDefined();
      expect(groups['verify-group'].skills.sort()).toEqual(['A', 'B']);
    });

    it('returns empty when no parallel groups', () => {
      const graph = { skills: { A: { depends_on: [] } } };
      const executor = new ParallelExecutor(graph, stubAdapter);
      expect(executor._getParallelGroups()).toEqual({});
    });
  });
});

describe('HeterogeneousAdapter stub', () => {
  it('loads with empty engines when no config', () => {
    expect(stubAdapter.engines).toEqual({});
  });

  it('assignEngines returns empty map for unknown skills', () => {
    const assignment = stubAdapter.assignEngines(['stdd-apply']);
    expect(assignment.size).toBe(0);
  });

  it('normalizeOutput handles unknown engine', () => {
    const result = stubAdapter.normalizeOutput('unknown-engine', { data: 42 });
    expect(result.engineId).toBe('unknown-engine');
    expect(result.success).toBe(true);
    expect(result.data).toBe(42);
  });

  it('normalizeOutput marks success=false when raw says so', () => {
    const result = stubAdapter.normalizeOutput('x', { success: false });
    expect(result.success).toBe(false);
  });

  it('degrade returns null when no engines', () => {
    expect(stubAdapter.degrade('any', 'stdd-apply')).toBeNull();
  });

  it('getStats returns zeros', () => {
    const stats = stubAdapter.getStats();
    expect(stats.total).toBe(0);
    expect(stats.enabled).toBe(0);
  });

  describe('_isEnabled env var logic', () => {
    it('uses env var value when set, ignoring default', () => {
      process.env.STDD_TEST_ENGINE = 'true';
      const result = stubAdapter._isEnabled({ enabled: '${STDD_TEST_ENGINE:-false}' });
      delete process.env.STDD_TEST_ENGINE;
      expect(result).toBe(true);
    });

    it('uses default value when env var not set', () => {
      delete process.env.STDD_TEST_ENGINE_UNDEF;
      const result = stubAdapter._isEnabled({ enabled: '${STDD_TEST_ENGINE_UNDEF:-true}' });
      expect(result).toBe(true);
    });

    it('returns false when default is false and env var not set', () => {
      delete process.env.STDD_TEST_ENGINE_NOPE;
      const result = stubAdapter._isEnabled({ enabled: '${STDD_TEST_ENGINE_NOPE:-false}' });
      expect(result).toBe(false);
    });

    it('returns true for boolean true', () => {
      expect(stubAdapter._isEnabled({ enabled: true })).toBe(true);
    });

    it('returns false for boolean false', () => {
      expect(stubAdapter._isEnabled({ enabled: false })).toBe(false);
    });

    it('returns true for string "true"', () => {
      expect(stubAdapter._isEnabled({ enabled: 'true' })).toBe(true);
    });

    it('returns false for string "false"', () => {
      expect(stubAdapter._isEnabled({ enabled: 'false' })).toBe(false);
    });
  });
});
