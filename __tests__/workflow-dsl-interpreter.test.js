const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const { WorkflowDslInterpreter } = require('../src/utils/workflow-dsl-interpreter');

describe('WorkflowDslInterpreter', () => {
  let tempDir;
  let interpreter;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-wf-dsl-'));
    const wfDir = path.join(tempDir, 'stdd', 'workflows');
    fs.mkdirSync(wfDir, { recursive: true });
    interpreter = new WorkflowDslInterpreter(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function writeWorkflow(name, def) {
    const filePath = path.join(tempDir, 'stdd', 'workflows', `${name}.yaml`);
    fs.writeFileSync(filePath, yaml.dump(def), 'utf-8');
  }

  describe('listWorkflows', () => {
    test('returns empty when no workflows dir', () => {
      const noDir = new WorkflowDslInterpreter(path.join(tempDir, 'empty'));
      expect(noDir.listWorkflows()).toEqual([]);
    });

    test('lists yaml workflow files', () => {
      writeWorkflow('deploy', { name: 'deploy' });
      writeWorkflow('test', { name: 'test' });
      const names = interpreter.listWorkflows();
      expect(names.sort()).toEqual(['deploy', 'test']);
    });

    test('ignores non-yaml files', () => {
      fs.writeFileSync(path.join(tempDir, 'stdd', 'workflows', 'readme.txt'), 'x');
      writeWorkflow('valid', { name: 'valid' });
      expect(interpreter.listWorkflows()).toEqual(['valid']);
    });
  });

  describe('loadWorkflow', () => {
    test('loads and parses YAML workflow', () => {
      writeWorkflow('feature', {
        name: 'feature',
        steps: [
          { id: 'init', description: 'Init project' },
          { id: 'build', depends_on: ['init'] },
        ],
      });

      const wf = interpreter.loadWorkflow('feature');
      expect(wf.name).toBe('feature');
      expect(wf.steps.length).toBe(2);
    });

    test('loads .yml extension', () => {
      const filePath = path.join(tempDir, 'stdd', 'workflows', 'short.yml');
      fs.writeFileSync(filePath, yaml.dump({ name: 'short' }), 'utf-8');

      const wf = interpreter.loadWorkflow('short');
      expect(wf.name).toBe('short');
    });

    test('throws for missing workflow', () => {
      expect(() => interpreter.loadWorkflow('nonexistent')).toThrow('not found');
    });
  });

  describe('compileDAG', () => {
    test('compiles linear dependency chain', () => {
      const dag = interpreter.compileDAG({
        steps: [
          { id: 'a' },
          { id: 'b', depends_on: ['a'] },
          { id: 'c', depends_on: ['b'] },
        ],
      });

      expect(dag.sorted).toEqual(['a', 'b', 'c']);
      expect(dag.hasCycle).toBe(false);
      expect(dag.edges.length).toBe(2);
    });

    test('compiles diamond dependency', () => {
      const dag = interpreter.compileDAG({
        steps: [
          { id: 'root' },
          { id: 'left', depends_on: ['root'] },
          { id: 'right', depends_on: ['root'] },
          { id: 'merge', depends_on: ['left', 'right'] },
        ],
      });

      expect(dag.sorted[0]).toBe('root');
      expect(dag.sorted[3]).toBe('merge');
      expect(dag.hasCycle).toBe(false);
      expect(dag.layers.length).toBe(3);
    });

    test('computes parallel layers', () => {
      const dag = interpreter.compileDAG({
        steps: [
          { id: 'init' },
          { id: 'test-a', depends_on: ['init'] },
          { id: 'test-b', depends_on: ['init'] },
          { id: 'report', depends_on: ['test-a', 'test-b'] },
        ],
      });

      expect(dag.layers[0]).toEqual(['init']);
      expect(dag.layers[1].sort()).toEqual(['test-a', 'test-b']);
      expect(dag.layers[2]).toEqual(['report']);
      expect(dag.metadata.maxParallelism).toBe(2);
    });

    test('detects cycles', () => {
      const dag = interpreter.compileDAG({
        steps: [
          { id: 'a', depends_on: ['b'] },
          { id: 'b', depends_on: ['a'] },
        ],
      });

      expect(dag.hasCycle).toBe(true);
    });

    test('handles empty workflow', () => {
      const dag = interpreter.compileDAG({ steps: [] });
      expect(dag.sorted).toEqual([]);
      expect(dag.hasCycle).toBe(false);
    });

    test('handles nodes without dependencies', () => {
      const dag = interpreter.compileDAG({
        steps: [
          { id: 'standalone' },
        ],
      });

      expect(dag.sorted).toEqual(['standalone']);
      expect(dag.layers).toEqual([['standalone']]);
    });

    test('throws on unknown dependency', () => {
      expect(() => {
        interpreter.compileDAG({
          steps: [
            { id: 'a', depends_on: ['ghost'] },
          ],
        });
      }).toThrow('unknown step "ghost"');
    });

    test('supports "after" as alias for depends_on', () => {
      const dag = interpreter.compileDAG({
        steps: [
          { id: 'first' },
          { id: 'second', after: ['first'] },
        ],
      });

      expect(dag.sorted).toEqual(['first', 'second']);
    });

    test('supports "dependsOn" as alias', () => {
      const dag = interpreter.compileDAG({
        steps: [
          { id: 'x' },
          { id: 'y', dependsOn: ['x'] },
        ],
      });

      expect(dag.sorted).toEqual(['x', 'y']);
    });

    test('supports string deps (not array)', () => {
      const dag = interpreter.compileDAG({
        steps: [
          { id: 'p' },
          { id: 'q', depends_on: 'p' },
        ],
      });

      expect(dag.sorted).toEqual(['p', 'q']);
      expect(dag.edges).toEqual([{ from: 'p', to: 'q' }]);
    });
  });

  describe('toGraphFormat', () => {
    test('converts DAG to graph engine format', () => {
      const dag = interpreter.compileDAG({
        name: 'test-flow',
        steps: [
          { id: 'setup', description: 'Setup', phase: 'init', timeout: 300 },
          { id: 'build', depends_on: ['setup'], description: 'Build', outputs: ['dist/'] },
        ],
      });

      const graph = interpreter.toGraphFormat(dag);

      expect(graph.version).toBe('1.0');
      expect(graph.name).toBe('test-flow');
      expect(graph.skills.setup.description).toBe('Setup');
      expect(graph.skills.build.depends_on).toEqual(['setup']);
      expect(graph.skills.build.outputs).toEqual(['dist/']);
    });
  });

  describe('validate', () => {
    test('validates correct workflow', () => {
      const result = interpreter.validate({
        steps: [
          { id: 'a' },
          { id: 'b', depends_on: ['a'] },
        ],
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('detects missing steps', () => {
      const result = interpreter.validate({ steps: [] });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Workflow has no steps');
    });

    test('detects duplicate ids', () => {
      const result = interpreter.validate({
        steps: [
          { id: 'dup' },
          { id: 'dup' },
        ],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Duplicate'))).toBe(true);
    });

    test('detects unknown dependencies', () => {
      const result = interpreter.validate({
        steps: [
          { id: 'a', depends_on: ['ghost'] },
        ],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('unknown'))).toBe(true);
    });

    test('detects cycles', () => {
      const result = interpreter.validate({
        steps: [
          { id: 'x', depends_on: ['y'] },
          { id: 'y', depends_on: ['x'] },
        ],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('cycle'))).toBe(true);
    });

    test('warns about orphan steps', () => {
      const result = interpreter.validate({
        steps: [
          { id: 'connected-a' },
          { id: 'connected-b', depends_on: ['connected-a'] },
          { id: 'orphan' },
        ],
      });

      expect(result.warnings.some(w => w.includes('orphan'))).toBe(true);
    });

    test('detects steps without id or name', () => {
      const result = interpreter.validate({
        steps: [
          { description: 'no id' },
        ],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('missing id'))).toBe(true);
    });
  });
});

describe('AgentEngine debate mode', () => {
  const { AgentEngine } = require('../src/runtime/agent-simulator');
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-debate-'));
    const stddRuntime = path.join(tempDir, 'stdd', 'runtime');
    fs.mkdirSync(stddRuntime, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('convergeToProposal', () => {
    test('generates proposal from debate result', () => {
      const engine = new AgentEngine(tempDir);
      const debateResult = {
        topic: 'Should we use microservices?',
        participants: [
          { id: 'po', name: 'Alice', fullName: 'Alice Smith' },
          { id: 'arch', name: 'Bob', fullName: 'Bob Jones' },
        ],
        rounds: [
          {
            round: 1,
            agents: [
              { role: 'po', fullName: 'Alice Smith', name: 'Alice', round: 1, response: 'I agree we should use microservices. We recommend starting with the auth service.' },
              { role: 'arch', fullName: 'Bob Jones', name: 'Bob', round: 1, response: 'I agree with Alice. We must ensure proper service boundaries first.' },
            ],
            summary: {
              themes: ['should (3 mentions)'],
              agreements: ['agree'],
              disagreements: [],
              agentCount: 2,
            },
          },
        ],
        convergence: { score: 75, trend: 'converging', rounds: 1 },
      };

      const proposal = engine.convergeToProposal(debateResult);

      expect(proposal.topic).toBe('Should we use microservices?');
      expect(proposal.agreements).toContain('agree');
      expect(proposal.convergence.score).toBe(75);
      expect(proposal.generatedAt).toBeTruthy();
      expect(proposal.summary).toBeTruthy();
    });

    test('handles empty debate result', () => {
      const engine = new AgentEngine(tempDir);
      const proposal = engine.convergeToProposal({
        topic: 'Test',
        rounds: [],
        convergence: { score: 0, trend: 'insufficient-data' },
      });

      expect(proposal.topic).toBe('Test');
      expect(proposal.agreements).toEqual([]);
    });
  });
});
