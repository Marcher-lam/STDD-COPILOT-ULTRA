/**
 * Graph Run Command
 * Executes STDD workflow steps based on DAG graph topology.
 */

const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const DynamicGraphRouter = require('../../utils/dynamic-router');
const { getPackageRoot } = require('../../utils/path-resolver');
const { FFCommand } = require('./ff');
const { SpecGenerator } = require('./spec-generator');
const { ApplyCommand } = require('./apply');
const { VerifyCommand } = require('./verify');
const { ArchiveCommand } = require('./archive');
const { FixPacketCommand } = require('./fix-packet');
const { OutsideInCommand } = require('./outside-in');
const { resolveWorkspace } = require('../../utils/workspace-detector');

const NODE_COMMAND_MAP = {
  'stdd-propose': 'propose',
  'stdd-spec': 'spec',
  'stdd-plan': 'plan',
  'stdd-outside-in': 'outside-in',
  'stdd-apply': 'apply',
  'stdd-fix-packet': 'fix-packet',
  'stdd-verify': 'verify',
  'stdd-archive': 'archive',
  'stdd-commit': 'commit',
};

class GraphRunCommand {
  constructor(spinner) {
    this.spinner = spinner;
    this.result = { steps: [], changeName: null, failedAt: null };
  }

  _topologicalOrder(graph) {
    const nodes = Object.keys(graph.skills || {});
    const ordered = [];
    const visited = new Set();

    function visit(node) {
      if (visited.has(node)) return;
      visited.add(node);
      const deps = graph.skills[node]?.depends_on || [];
      for (const dep of deps) {
        if (graph.skills[dep]) {
          visit(dep);
        }
      }
      ordered.push(node);
    }

    for (const node of nodes) {
      visit(node);
    }

    return ordered;
  }

  async _executeNode(nodeName, changeName, options = {}) {
    const silentSpinner = {
      text: '', start() {}, stop() {}, succeed() {}, fail() {},
    };

    switch (nodeName) {
      case 'stdd-propose': {
        if (!options.description) {
          const now = new Date();
          const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
          options.description = `graph-run-${ts}`;
        }
        const ff = new FFCommand(silentSpinner);
        await ff.execute(options.description, { changeName, ...(options.proposeOptions || {}) });
        return { status: 'success', node: nodeName };
      }

      case 'stdd-spec': {
        const generator = new SpecGenerator();
        const result = await generator.generateFromTasks(changeName);
        return { status: 'success', node: nodeName, detail: result };
      }

      case 'stdd-plan':
        return { status: 'success', node: nodeName, detail: 'plan step merged with propose/spec' };

      case 'stdd-outside-in': {
        const outsideIn = new OutsideInCommand(process.cwd());
        const registryPath = path.join(process.cwd(), 'stdd', 'tdd-registry.yaml');
        if (!fs.existsSync(registryPath)) {
          outsideIn.execute('init', undefined, { json: false });
        }
        const result = outsideIn.execute('scaffold', changeName, {
          feature: options.feature || changeName,
          json: false,
        });
        return { status: 'success', node: nodeName, detail: result };
      }

      case 'stdd-apply': {
        if (options.skipApply) {
          console.log(chalk.dim(`  [Skipping: ${nodeName}] (--skip-apply)`));
          return { status: 'skipped', node: nodeName, workspace: options.workspaceContext };
        }
        const apply = new ApplyCommand();
        await apply.execute(changeName, { ...(options.applyOptions || {}), workspace: options.workspace });
        return { status: 'success', node: nodeName, workspace: options.workspaceContext };
      }

      case 'stdd-fix-packet': {
        const packet = new FixPacketCommand(process.cwd()).execute(changeName, {
          testCommand: options.applyOptions && options.applyOptions.testCommand,
          silent: true,
        });
        return { status: 'success', node: nodeName, detail: { output: packet.output, jsonOutput: packet.jsonOutput } };
      }

      case 'stdd-verify': {
        if (options.skipApply) {
          console.log(chalk.dim(`  [Skipping: ${nodeName}] (--skip-apply implied)`));
          return { status: 'skipped', node: nodeName, workspace: options.workspaceContext };
        }
        const verify = new VerifyCommand();
        await verify.execute(changeName, { ...(options.verifyOptions || {}), workspace: options.workspace });
        return { status: 'success', node: nodeName, workspace: options.workspaceContext };
      }

      case 'stdd-archive': {
        const archive = new ArchiveCommand();
        await archive.execute(changeName, options.archiveOptions || {});
        return { status: 'success', node: nodeName };
      }

      case 'stdd-type-check': {
        try {
          const { stdout, stderr } = await execAsync('npx tsc --noEmit', {
            cwd: process.cwd(),
            timeout: 120000,
          });
          if (stderr && !stdout) {
            return { status: 'success', node: nodeName, detail: stderr.trim() };
          }
          return { status: 'success', node: nodeName, detail: stdout ? stdout.trim() : 'No type errors' };
        } catch (err) {
          throw new Error(`Type check failed: ${err.message}`);
        }
      }

      default:
        return { status: 'unknown', node: nodeName };
    }
  }

  async execute(intent = 'feature', options = {}) {
    let router;
    try {
      router = new DynamicGraphRouter();
    } catch (error) {
      throw new Error(`Failed to initialize graph router: ${error.message}`);
    }

    const graph = router.compile(intent);
    this._applyConditions(graph);
    const nodes = this._topologicalOrder(graph);

    if (nodes.length === 0) {
      throw new Error(`No nodes found for intent '${intent}'.`);
    }

    const changeName = options.changeName || this._generateChangeName(intent);
    this.result.changeName = changeName;

    if (options.workspace) {
      const workspace = resolveWorkspace(process.cwd(), options.workspace);
      if (!workspace) {
        throw new Error(`Workspace '${options.workspace}' not found.`);
      }
      options.workspace = workspace;
      options.workspaceContext = {
        name: workspace.name,
        path: path.relative(process.cwd(), workspace.root).replace(/\\/g, '/') || workspace.name,
        sourceDir: path.relative(process.cwd(), workspace.sourceDir).replace(/\\/g, '/'),
      };
      this.result.workspace = options.workspaceContext;
    }

    console.log(chalk.bold(`\n🚀 Graph Run: ${chalk.cyan(graph.name)}`));
    console.log(chalk.dim(`  Intent: ${intent} | Change: ${changeName}`));
    if (options.workspaceContext) {
      console.log(chalk.dim(`  Workspace: ${options.workspaceContext.name} (${options.workspaceContext.path})`));
    }
    console.log(chalk.dim(`  Steps: ${nodes.length}\n`));

    for (const nodeName of nodes) {
      const label = NODE_COMMAND_MAP[nodeName] || nodeName;
      console.log(chalk.yellow(`  [Executing: ${label}]`));

      try {
        const result = await this._executeNode(nodeName, changeName, options);
        this.result.steps.push({ node: nodeName, command: label, ...result });

        if (result.status === 'success') {
          console.log(chalk.green(`    ✓ ${label} completed`));
        } else if (result.status === 'skipped') {
          console.log(chalk.dim(`    ⊘ ${label} skipped`));
        } else {
          console.log(chalk.yellow(`    ? ${label} unknown`));
        }
      } catch (error) {
        this.result.steps.push({ node: nodeName, command: label, status: 'failed', error: error.message });
        this.result.failedAt = nodeName;
        console.log(chalk.red(`    ✗ ${label} failed: ${error.message}`));
        console.log(chalk.red(`\n  Graph run aborted at ${nodeName}.`));
        process.exitCode = 1;
        return this.result;
      }
    }

    console.log(chalk.green(`\n  Graph run completed for ${changeName}.`));
    return this.result;
  }

  _generateChangeName(intent) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const HH = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `graph-${intent}-${yyyy}${MM}${dd}-${HH}${mm}`;
  }

  _loadConditions() {
    const conditionsPath = path.join(getPackageRoot(), 'stdd', 'graph', 'conditions.json');
    try {
      if (fs.existsSync(conditionsPath)) {
        const content = fs.readFileSync(conditionsPath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.log(chalk.dim(`  [Warning: Failed to load conditions.json: ${error.message}]`));
    }
    return { rules: [] };
  }

  _applyConditions(graph) {
    const conditions = this._loadConditions();
    if (!conditions.rules || conditions.rules.length === 0) {
      return;
    }

    console.log(chalk.cyan('  [Evaluating condition rules...]'));

    for (const rule of conditions.rules) {
      if (!rule.if || !rule.then || !rule.then.inject_node) {
        continue;
      }

      const condition = rule.if;
      const injectNode = rule.then.inject_node;
      const afterNode = rule.then.after;

      if (graph.skills && graph.skills[injectNode]) {
        continue;
      }

      if (this._evaluateCondition(condition)) {
        console.log(chalk.green(`  [Condition met: injecting node '${injectNode}' after '${afterNode}']`));

        if (!graph.skills) {
          graph.skills = {};
        }

        const originalDependents = [];
        if (afterNode) {
          for (const [name, node] of Object.entries(graph.skills)) {
            if (name === injectNode || name === afterNode) continue;
            if (node.depends_on && node.depends_on.includes(afterNode)) {
              originalDependents.push(name);
            }
          }
        }
        const dependsOn = afterNode && graph.skills[afterNode] ? [afterNode] : [];
        graph.skills[injectNode] = {
          description: `Condition-injected node: ${injectNode}`,
          phase: 'verify',
          depends_on: dependsOn,
          metadata: { priority: 'high', category: 'condition', injected: true },
        };

        if (afterNode) {
          for (const [name, node] of Object.entries(graph.skills)) {
            if (name === injectNode || name === afterNode) continue;
            if (node.depends_on && node.depends_on.includes(afterNode) && originalDependents.includes(name)) {
              node.depends_on = node.depends_on.filter(d => d !== afterNode);
              node.depends_on.push(injectNode);
            }
          }
        }
      }
    }
  }

  _evaluateCondition(condition) {
    if (condition.has_file) {
      const filePath = path.join(process.cwd(), condition.has_file);
      return fs.existsSync(filePath);
    }

    if (condition.has_dependency) {
      const pkgPath = path.join(process.cwd(), 'package.json');
      if (!fs.existsSync(pkgPath)) return false;
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const deps = {
          ...(pkg.dependencies || {}),
          ...(pkg.devDependencies || {}),
        };
        return condition.has_dependency in deps;
      } catch {
        return false;
      }
    }

    return false;
  }
}

module.exports = { GraphRunCommand, NODE_COMMAND_MAP };
