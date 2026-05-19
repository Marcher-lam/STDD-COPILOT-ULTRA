const ErrorPropagator = require('../src/utils/error-propagator');

// 构建测试用 DAG
function buildTestGraph() {
  return {
    version: '1.0',
    config: { retry_count: 3 },
    skills: {
      'stdd-propose': {
        phase: 'propose',
        metadata: { category: 'requirement' },
        depends_on: [],
      },
      'stdd-spec': {
        phase: 'spec',
        metadata: { category: 'specification' },
        depends_on: ['stdd-propose'],
      },
      'stdd-plan': {
        phase: 'plan',
        metadata: { category: 'planning' },
        depends_on: ['stdd-spec'],
      },
      'stdd-apply': {
        phase: 'execute',
        metadata: { category: 'execution' },
        depends_on: ['stdd-plan'],
      },
      'stdd-verify': {
        phase: 'verify',
        metadata: { category: 'verification' },
        depends_on: ['stdd-apply'],
      },
    },
  };
}

// Mock cache（无需真实文件系统）
class MockCache {
  constructor() { this.cleared = false; this.deletedNodes = []; }
  clear() { this.cleared = true; }
  deleteByNode(node) { this.deletedNodes.push(node); }
}

describe('ErrorPropagator', () => {
  it('应从执行节点向上传播到最近的决策点（planning 类别）', () => {
    const graph = buildTestGraph();
    const cache = new MockCache();
    const propagator = new ErrorPropagator(graph, cache);

    const result = propagator.propagate('stdd-apply', new Error('Build failed'), {});

    // stdd-apply → stdd-plan (category: planning) = 决策点，1 跳
    expect(result.targetNode).toBe('stdd-plan');
    expect(result.exhausted).toBe(false);
    expect(result.hops).toBe(1);
    expect(result.affectedNodes).toContain('stdd-apply');
    expect(result.affectedNodes).toContain('stdd-plan');
  });

  it('应从深层节点多跳传播', () => {
    const graph = buildTestGraph();
    const cache = new MockCache();
    const propagator = new ErrorPropagator(graph, cache);

    // stdd-verify → stdd-apply (execution, 非决策点) → stdd-plan (planning, 决策点)
    const result = propagator.propagate('stdd-verify', new Error('Test suite failed'), {});

    expect(result.targetNode).toBe('stdd-plan');
    expect(result.hops).toBe(2);
    expect(result.affectedNodes.length).toBe(3); // verify, apply, plan
    expect(result.report.evidenceCount).toBe(2); // 首次失败 + 1 跳传导（到达决策点时直接返回，不额外捕获）
  });

  it('根节点失败时应返回 exhausted', () => {
    const graph = buildTestGraph();
    const cache = new MockCache();
    const propagator = new ErrorPropagator(graph, cache);

    const result = propagator.propagate('stdd-propose', new Error('Root crash'), {});

    expect(result.exhausted).toBe(true);
    expect(result.targetNode).toBeNull();
    expect(result.report.evidenceCount).toBe(1);
    expect(result.message).toContain('Root node reached');
  });

  it('应识别 gate 节点为决策点', () => {
    const graph = buildTestGraph();
    graph.skills['stdd-confirm'] = {
      phase: 'confirm',
      metadata: { category: 'requirement', gate: 'human_approval' },
      depends_on: ['stdd-propose'],
    };
    graph.skills['stdd-spec'].depends_on = ['stdd-confirm'];

    const cache = new MockCache();
    const propagator = new ErrorPropagator(graph, cache);

    // stdd-spec → stdd-confirm (gate: human_approval) = 决策点
    const result = propagator.propagate('stdd-spec', new Error('Spec error'), {});

    expect(result.targetNode).toBe('stdd-confirm');
    expect(result.hops).toBe(1);
  });

  it('超过最大跳数时应降级返回最后到达的节点', () => {
    // 构建一个没有决策点的线性链
    const graph = {
      version: '1.0',
      config: {},
      skills: {
        'a': { phase: 'run', metadata: { category: 'execution' }, depends_on: [] },
        'b': { phase: 'run', metadata: { category: 'execution' }, depends_on: ['a'] },
        'c': { phase: 'run', metadata: { category: 'execution' }, depends_on: ['b'] },
        'd': { phase: 'run', metadata: { category: 'execution' }, depends_on: ['c'] },
        'e': { phase: 'run', metadata: { category: 'execution' }, depends_on: ['d'] },
        'f': { phase: 'run', metadata: { category: 'execution' }, depends_on: ['e'] },
      },
    };
    const cache = new MockCache();
    const propagator = new ErrorPropagator(graph, cache, 2);

    const result = propagator.propagate('f', new Error('Deep failure'), {});

    expect(result.exhausted).toBe(true);
    expect(result.hops).toBe(2);
    // 应该回退了但未找到决策点
    expect(result.targetNode).toBe('d');
  });

  it('证据链应包含结构化指令摘要', () => {
    const graph = buildTestGraph();
    const cache = new MockCache();
    const propagator = new ErrorPropagator(graph, cache);

    const result = propagator.propagate('stdd-verify', new Error('Mutation test failed'), {});

    expect(result.report.instruction).toContain('Reverse self-healing triggered');
    expect(result.report.instruction).toContain('stdd-verify');
    expect(result.report.instruction).toContain('revise the upstream strategy');
    expect(result.report.timeline.length).toBeGreaterThan(0);
  });

  it('clearAffectedCache should call deleteByNode for each affected node', () => {
    const graph = buildTestGraph();
    const cache = new MockCache();
    const propagator = new ErrorPropagator(graph, cache);

    propagator.propagate('stdd-verify', new Error('fail'), {});
    const result = propagator.propagate('stdd-verify', new Error('fail'), {});

    propagator.clearAffectedCache(result.affectedNodes);

    expect(cache.deletedNodes.sort()).toEqual(result.affectedNodes.sort());
    expect(cache.cleared).toBe(false);
  });

  it('clearAffectedCache is safe with empty input', () => {
    const graph = buildTestGraph();
    const cache = new MockCache();
    const propagator = new ErrorPropagator(graph, cache);

    propagator.clearAffectedCache([]);
    propagator.clearAffectedCache(null);

    expect(cache.deletedNodes).toEqual([]);
    expect(cache.cleared).toBe(false);
  });

  it('clearAffectedCache is safe when cache is null', () => {
    const graph = buildTestGraph();
    const propagator = new ErrorPropagator(graph, null);

    // Should not throw when cache is null
    expect(() => propagator.clearAffectedCache(['a', 'b'])).not.toThrow();
  });

  it('getReport returns evidence report', () => {
    const graph = buildTestGraph();
    const cache = new MockCache();
    const propagator = new ErrorPropagator(graph, cache);

    // Before any propagation, report should be empty
    const reportBefore = propagator.getReport();
    expect(reportBefore.evidenceCount).toBe(0);
    expect(reportBefore.instruction).toBe('No evidence captured.');

    // After propagation
    propagator.propagate('stdd-apply', new Error('Some error'), {});
    const reportAfter = propagator.getReport();
    expect(reportAfter.evidenceCount).toBeGreaterThanOrEqual(1);
    expect(reportAfter.fullChain.length).toBeGreaterThanOrEqual(1);
  });

  // --- Branch coverage tests ---

  it('propagate works without context argument (default param)', () => {
    const graph = buildTestGraph();
    const cache = new MockCache();
    const propagator = new ErrorPropagator(graph, cache);

    // Call without third argument to exercise the default `context = {}` branch
    const result = propagator.propagate('stdd-apply', new Error('No context'));
    expect(result.targetNode).toBe('stdd-plan');
    expect(result.hops).toBe(1);
  });

  it('_findPredecessor uses linear fallback when depends_on is missing', () => {
    // Build a graph where nodes have NO depends_on property at all,
    // so the linear fallback path (lines 131-133) is exercised.
    const graph = {
      version: '1.0',
      config: {},
      skills: {
        'alpha': { phase: 'phase-a', metadata: { category: 'execution' } },
        'beta': { phase: 'phase-b', metadata: { category: 'execution' } },
        'gamma': { phase: 'phase-c', metadata: { category: 'execution' } },
      },
    };
    const cache = new MockCache();
    const propagator = new ErrorPropagator(graph, cache);

    // 'gamma' has no depends_on, idx=2 > 0, so linear fallback returns 'beta'
    // 'beta' has no depends_on, idx=1 > 0, so linear fallback returns 'alpha'
    // 'alpha' has no depends_on, idx=0, so linear fallback returns null (root)
    const result = propagator.propagate('gamma', new Error('Linear fallback'), {});
    // alpha is root, not a decision point → exhausted
    expect(result.exhausted).toBe(true);
    expect(result.targetNode).toBeNull();
    expect(result.affectedNodes).toContain('gamma');
    expect(result.affectedNodes).toContain('beta');
    expect(result.affectedNodes).toContain('alpha');
  });

  it('_isDecisionPoint returns false when nodeDef is missing', () => {
    // Graph with a node that references a non-existent predecessor via depends_on.
    // When propagating to a node not in skills, _isDecisionPoint should return false.
    const graph = {
      version: '1.0',
      config: {},
      skills: {
        'orphan': { phase: 'run', metadata: { category: 'execution' }, depends_on: ['ghost'] },
      },
    };
    // 'ghost' does not exist in skills, so nodeDef will be undefined
    // But _findPredecessor looks up depends_on first: orphan depends_on ['ghost'],
    // so predecessor is 'ghost'. Then _isDecisionPoint('ghost') has no nodeDef → returns false.
    // Then _findPredecessor('ghost') — ghost not in skills, keys = ['orphan'], idx = -1 → null.
    // So we should reach root exhaustion.
    const cache = new MockCache();
    const propagator = new ErrorPropagator(graph, cache);

    const result = propagator.propagate('orphan', new Error('Ghost dep'), {});
    expect(result.exhausted).toBe(true);
    expect(result.targetNode).toBeNull();
    expect(result.affectedNodes).toContain('orphan');
    expect(result.affectedNodes).toContain('ghost');
  });

  it('_isDecisionPoint detects fanout > 1 as decision point', () => {
    // Create a graph where one node is depended on by 2+ other nodes (fanout).
    const graph = {
      version: '1.0',
      config: {},
      skills: {
        'hub': { phase: 'plan', metadata: { category: 'execution' }, depends_on: [] },
        'branch-a': { phase: 'run', metadata: { category: 'execution' }, depends_on: ['hub'] },
        'branch-b': { phase: 'run', metadata: { category: 'execution' }, depends_on: ['hub'] },
        'leaf': { phase: 'run', metadata: { category: 'execution' }, depends_on: ['branch-a'] },
      },
    };
    const cache = new MockCache();
    const propagator = new ErrorPropagator(graph, cache);

    // leaf → branch-a (no fanout, not a decision point) → hub (fanout=2, decision point)
    const result = propagator.propagate('leaf', new Error('Fanout test'), {});
    expect(result.targetNode).toBe('hub');
    expect(result.exhausted).toBe(false);
    expect(result.hops).toBe(2);
  });

  it('_getPhase returns null when node has no phase', () => {
    // Create a graph where the predecessor node has no phase property.
    const graph = {
      version: '1.0',
      config: {},
      skills: {
        'no-phase': { metadata: { category: 'execution' }, depends_on: [] },
        'child': { metadata: { category: 'execution' }, depends_on: ['no-phase'] },
      },
    };
    const cache = new MockCache();
    const propagator = new ErrorPropagator(graph, cache);

    const result = propagator.propagate('child', new Error('No phase'), {});
    // no-phase is root (no predecessor, no fanout) → exhausted
    expect(result.exhausted).toBe(true);
    // Verify the evidence was captured without crashing even with null phase
    expect(result.report.evidenceCount).toBeGreaterThanOrEqual(1);
  });

  it('_findPredecessor returns null when graph.skills is null', () => {
    // Edge case: graph has no skills property at all
    const graph = { version: '1.0', config: {} };
    const cache = new MockCache();
    const propagator = new ErrorPropagator(graph, cache);

    // _findPredecessor on any node should return null (skills is undefined, || {} → empty keys)
    // _isDecisionPoint should also handle null skills gracefully
    const result = propagator.propagate('anything', new Error('Null skills'), {});
    expect(result.exhausted).toBe(true);
    expect(result.targetNode).toBeNull();
    expect(result.affectedNodes).toEqual(['anything']);
  });
});
