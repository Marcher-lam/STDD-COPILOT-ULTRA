const path = require('path');
const chalk = require('chalk');
const { CodeGraphIndexer } = require('../../utils/codegraph/indexer');

class CodeGraphCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = typeof cwd === 'string' ? cwd : process.cwd();
  }

  execute(action = 'status', args = [], options = {}) {
    if (Array.isArray(action)) {
      options = args || {};
      args = action;
      action = args.shift() || 'status';
    }
    const indexer = new CodeGraphIndexer(this.cwd);
    switch (action) {
      case 'status': return this.status(indexer, options);
      case 'rebuild': return this.rebuild(indexer, options);
      case 'sync': return this.sync(indexer, args, options);
      case 'query': return this.query(indexer, args, options);
      case 'explain': return this.explain(indexer, args, options);
      default: throw new Error(`Unknown codegraph action: ${action}`);
    }
  }

  status(indexer, options = {}) {
    const graph = indexer.ensureFresh({ force: false });
    const result = { status: 'ok', stats: graph.index.stats, updatedAt: graph.index.updatedAt };
    return this.output(result, options, () => {
      console.log(chalk.bold('\nCodeGraph Status\n'));
      console.log(`  Files:   ${graph.index.stats.files}`);
      console.log(`  Symbols: ${graph.index.stats.symbols}`);
      console.log(`  Imports: ${graph.index.stats.imports}`);
      console.log(`  Tests:   ${graph.index.stats.tests}`);
      console.log(`  Updated: ${graph.index.updatedAt}`);
    });
  }

  rebuild(indexer, options = {}) {
    const graph = indexer.build({ force: true });
    const result = { status: 'rebuilt', stats: graph.index.stats };
    return this.output(result, options, () => console.log(chalk.green(`CodeGraph rebuilt: ${graph.index.stats.files} file(s), ${graph.index.stats.symbols} symbol(s)`)));
  }

  sync(indexer, args = [], options = {}) {
    let graph;
    if (options.file) {
      graph = indexer.syncFile(path.resolve(this.cwd, options.file));
    } else if (options.changed) {
      graph = indexer.syncChanged(options);
    } else if (args[0]) {
      graph = indexer.syncFile(path.resolve(this.cwd, args[0]));
    } else {
      graph = indexer.syncChanged(options);
    }
    const result = { status: 'synced', stats: graph.index.stats };
    return this.output(result, options, () => {
      if (!options.silent) console.log(chalk.green(`CodeGraph synced: ${graph.index.stats.files} file(s)`));
    });
  }

  query(indexer, args = [], options = {}) {
    const text = Array.isArray(args) ? args.join(' ') : String(args || '');
    const result = indexer.query(text, options);
    return this.output(result, options, () => {
      console.log(chalk.bold(`\nCodeGraph Query: ${text}\n`));
      for (const item of result.results) console.log(`  ${item.name || item.nodeId} — ${item.path || item.kind} (${item.reason})`);
    });
  }

  explain(indexer, args = [], options = {}) {
    const file = Array.isArray(args) ? args[0] : args;
    const graph = indexer.ensureFresh();
    const rel = file ? path.relative(this.cwd, path.resolve(this.cwd, file)).replace(/\\/g, '/') : '';
    const nodes = graph.nodes.filter(n => n.path === rel);
    const nodeIds = new Set(nodes.map(n => n.id));
    const edges = graph.edges.filter(e => nodeIds.has(e.from) || nodeIds.has(e.to));
    const result = { file: rel, nodes, edges };
    return this.output(result, options, () => {
      console.log(chalk.bold(`\nCodeGraph Explain: ${rel}\n`));
      console.log(`  Nodes: ${nodes.length}`);
      console.log(`  Edges: ${edges.length}`);
    });
  }

  output(result, options, printText) {
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else printText();
    return result;
  }
}

module.exports = { CodeGraphCommand };
