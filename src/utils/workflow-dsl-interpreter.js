const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { createLogger } = require('./logger');
const log = createLogger('workflow-dsl');

class WorkflowDslInterpreter {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.workflowsDir = path.join(cwd, 'stdd', 'workflows');
  }

  /**
   * List available workflow files
   * @returns {string[]} Workflow names (without extension)
   */
  listWorkflows() {
    if (!fs.existsSync(this.workflowsDir)) return [];
    return fs.readdirSync(this.workflowsDir)
      .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
      .map(f => f.replace(/\.(yaml|yml)$/, ''));
  }

  /**
   * Load and parse a workflow YAML file
   * @param {string} name - Workflow name
   * @returns {object} Parsed workflow definition
   */
  loadWorkflow(name) {
    const filePath = this._resolveWorkflowPath(name);
    if (!filePath) {
      throw new Error(`Workflow "${name}" not found in ${this.workflowsDir}`);
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return yaml.load(content);
  }

  _resolveWorkflowPath(name) {
    for (const ext of ['.yaml', '.yml']) {
      const p = path.join(this.workflowsDir, name + ext);
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  /**
   * Compile a workflow into an execution DAG
   * Uses Kahn's topological sort for dependency ordering
   * @param {object} workflow - Parsed workflow definition
   * @returns {object} Compiled DAG with execution order
   */
  compileDAG(workflow) {
    const steps = workflow.steps || workflow.nodes || [];
    if (steps.length === 0) {
      return { nodes: {}, edges: [], layers: [], sorted: [], hasCycle: false, metadata: { totalSteps: 0, maxParallelism: 1, estimatedDepth: 0 } };
    }

    const nodeMap = {};
    const adjacency = {};
    const inDegree = {};

    for (const step of steps) {
      const id = step.id || step.name;
      nodeMap[id] = step;
      adjacency[id] = [];
      inDegree[id] = 0;
    }

    // Build edges from depends_on
    for (const step of steps) {
      const id = step.id || step.name;
      const deps = step.depends_on || step.dependsOn || step.after || [];
      const depsArr = Array.isArray(deps) ? deps : [deps];

      for (const dep of depsArr) {
        if (!adjacency[dep]) {
          throw new Error(`Step "${id}" depends on unknown step "${dep}"`);
        }
        adjacency[dep].push(id);
        inDegree[id]++;
      }
    }

    // Kahn's topological sort
    const queue = [];
    for (const id of Object.keys(inDegree)) {
      if (inDegree[id] === 0) queue.push(id);
    }

    const sorted = [];
    const visited = new Set();

    while (queue.length > 0) {
      const current = queue.shift();
      sorted.push(current);
      visited.add(current);

      for (const neighbor of adjacency[current]) {
        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) {
          queue.push(neighbor);
        }
      }
    }

    const hasCycle = sorted.length < Object.keys(nodeMap).length;

    // Build layers for parallel execution
    const layers = this._computeLayers(steps, adjacency);

    // Build edges list
    const edges = [];
    for (const step of steps) {
      const id = step.id || step.name;
      const deps = step.depends_on || step.dependsOn || step.after || [];
      const depsArr = Array.isArray(deps) ? deps : [deps];
      for (const dep of depsArr) {
        edges.push({ from: dep, to: id });
      }
    }

    return {
      name: workflow.name,
      nodes: nodeMap,
      edges,
      layers,
      sorted,
      hasCycle,
      metadata: {
        totalSteps: steps.length,
        maxParallelism: Math.max(...layers.map(l => l.length), 1),
        estimatedDepth: layers.length,
      },
    };
  }

  /**
   * Compute parallel execution layers using BFS-based approach
   * Each layer contains steps that can run concurrently
   */
  _computeLayers(steps, adjacency) {
    const nodeIds = steps.map(s => s.id || s.name);
    const depsOf = {};

    for (const step of steps) {
      const id = step.id || step.name;
      const deps = step.depends_on || step.dependsOn || step.after || [];
      depsOf[id] = new Set(Array.isArray(deps) ? deps : [deps]);
    }

    const layers = [];
    const assigned = new Set();

    while (assigned.size < nodeIds.length) {
      const layer = [];
      for (const id of nodeIds) {
        if (assigned.has(id)) continue;
        const deps = depsOf[id];
        const allDepsAssigned = [...deps].every(d => assigned.has(d));
        if (allDepsAssigned) {
          layer.push(id);
        }
      }
      if (layer.length === 0) break; // cycle or error
      for (const id of layer) assigned.add(id);
      layers.push(layer);
    }

    return layers;
  }

  /**
   * Convert a compiled DAG into graph engine compatible format
   * Maps to stdd/graph/skills.yaml structure
   * @param {object} dag - Compiled DAG from compileDAG()
   * @returns {object} Graph engine compatible definition
   */
  toGraphFormat(dag) {
    const skills = {};
    for (const [id, node] of Object.entries(dag.nodes)) {
      const deps = node.depends_on || node.dependsOn || node.after || [];
      const depsArr = Array.isArray(deps) ? deps : deps ? [deps] : [];

      skills[id] = {
        description: node.description || node.name || id,
        phase: node.phase || 'execute',
        ...(depsArr.length > 0 ? { depends_on: depsArr } : {}),
        ...(node.condition ? { condition: node.condition } : {}),
        ...(node.parallel_with ? { parallel_with: node.parallel_with } : {}),
        ...(node.timeout ? { timeout: node.timeout } : {}),
        ...(node.outputs ? { outputs: node.outputs } : {}),
        ...(node.inputs ? { inputs: node.inputs } : {}),
        metadata: {
          ...(node.gate ? { gate: node.gate } : {}),
          ...(node.auto_advance !== undefined ? { auto_advance: node.auto_advance } : {}),
          ...node.metadata,
        },
      };
    }

    return {
      version: '1.0',
      name: dag.name || 'custom-workflow',
      config: {
        max_parallel: dag.metadata.maxParallelism,
      },
      skills,
      dependencies: this._buildDependencies(dag),
    };
  }

  _buildDependencies(dag) {
    const deps = {};
    for (const edge of dag.edges) {
      if (!deps[edge.to]) deps[edge.to] = { requires: [] };
      deps[edge.to].requires.push(edge.from);
    }
    return deps;
  }

  /**
   * Validate a workflow definition for common issues
   * @param {object} workflow - Parsed workflow
   * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
   */
  validate(workflow) {
    const errors = [];
    const warnings = [];
    const steps = workflow.steps || workflow.nodes || [];

    if (steps.length === 0) {
      errors.push('Workflow has no steps');
      return { valid: false, errors, warnings };
    }

    const ids = new Set();
    for (const step of steps) {
      const id = step.id || step.name;
      if (!id) {
        errors.push(`Step missing id/name: ${JSON.stringify(step).slice(0, 80)}`);
        continue;
      }
      if (ids.has(id)) {
        errors.push(`Duplicate step id: "${id}"`);
      }
      ids.add(id);
    }

    // Check dependency references
    for (const step of steps) {
      const id = step.id || step.name;
      if (!id) continue;
      const deps = step.depends_on || step.dependsOn || step.after || [];
      const depsArr = Array.isArray(deps) ? deps : deps ? [deps] : [];
      for (const dep of depsArr) {
        if (!ids.has(dep)) {
          errors.push(`Step "${id}" depends on unknown step "${dep}"`);
        }
      }
    }

    // Check for cycles via compile
    try {
      const dag = this.compileDAG(workflow);
      if (dag.hasCycle) {
        errors.push('Workflow contains a dependency cycle');
      }
    } catch (err) {
      errors.push(`DAG compilation error: ${err.message}`);
    }

    // Warnings
    const orphanSteps = steps.filter(s => {
      const id = s.id || s.name;
      const hasDeps = (s.depends_on || s.dependsOn || s.after || []).length > 0;
      const isDependedOn = steps.some(other => {
        const otherDeps = other.depends_on || other.dependsOn || other.after || [];
        return Array.isArray(otherDeps) ? otherDeps.includes(id) : otherDeps === id;
      });
      return !hasDeps && !isDependedOn && steps.length > 1;
    });

    for (const orphan of orphanSteps) {
      warnings.push(`Step "${orphan.id || orphan.name}" has no dependencies and nothing depends on it`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}

module.exports = { WorkflowDslInterpreter };
