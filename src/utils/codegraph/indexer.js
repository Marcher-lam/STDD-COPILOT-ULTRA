const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { CodeGraphScanner } = require('./scanner');
const { CodeGraphStore } = require('./store');
const { CodeGraphContextProvider } = require('./context-provider');

class CodeGraphIndexer {
  constructor(cwd = process.cwd(), options = {}) {
    this.cwd = cwd;
    this.options = options;
    this.store = options.store || new CodeGraphStore(cwd);
    this.config = this.loadConfig();
    this.scanner = options.scanner || new CodeGraphScanner(cwd, {
      maxFileSizeKb: this.config.max_file_size_kb,
      ignore: this.config.ignore,
    });
  }

  loadConfig() {
    const defaults = {
      enabled: true,
      auto_index: true,
      auto_sync: true,
      context_layer: true,
      max_file_size_kb: 512,
      source_roots: ['src', 'lib', 'app', 'packages'],
      ignore: ['node_modules', '.git', '.claude', 'coverage', 'dist', 'build', '.next', 'stdd/graph/cache'],
    };
    const configPath = path.join(this.cwd, 'stdd', 'config.yaml');
    try {
      const text = fs.readFileSync(configPath, 'utf8');
      const block = text.match(/codegraph:\n([\s\S]*?)(?:\n\S|$)/);
      if (!block) return defaults;
      const parsed = this.parseSimpleYamlBlock(block[1]);
      return { ...defaults, ...parsed };
    } catch (_) {
      return defaults;
    }
  }

  parseSimpleYamlBlock(text) {
    const result = {};
    let currentList = null;
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const keyMatch = trimmed.match(/^([\w_]+):\s*(.*)$/);
      if (keyMatch) {
        const [, key, value] = keyMatch;
        if (value === '') {
          result[key] = [];
          currentList = key;
        } else if (value === 'true' || value === 'false') {
          result[key] = value === 'true';
          currentList = null;
        } else if (/^\d+$/.test(value)) {
          result[key] = Number(value);
          currentList = null;
        } else {
          result[key] = value;
          currentList = null;
        }
        continue;
      }
      const itemMatch = trimmed.match(/^-\s+(.+)$/);
      if (itemMatch && currentList) result[currentList].push(itemMatch[1]);
    }
    return result;
  }

  resolveSourceRoots(options = {}) {
    const roots = options.sourceRoots || this.config.source_roots || [];
    const existing = [];
    for (const root of roots) {
      const abs = path.join(this.cwd, root);
      if (fs.existsSync(abs)) existing.push(abs);
    }
    const rootFiles = ['index.js', 'index.ts', 'main.js', 'main.ts', 'cli.js', 'app.js'];
    for (const file of rootFiles) {
      const abs = path.join(this.cwd, file);
      if (fs.existsSync(abs)) existing.push(abs);
    }
    return existing;
  }

  findSourceFiles(sourceRoots = this.resolveSourceRoots()) {
    const files = [];
    const visit = (p) => {
      if (!fs.existsSync(p) || this.scanner.isIgnoredPath(p)) return;
      const stat = fs.statSync(p);
      if (stat.isDirectory()) {
        for (const child of fs.readdirSync(p)) visit(path.join(p, child));
        return;
      }
      if (stat.isFile() && this.scanner.isSupportedFile(p)) files.push(p);
    };
    for (const root of sourceRoots) visit(root);
    return [...new Set(files)].sort();
  }

  build(options = {}) {
    this.store.ensureDirectories();
    if (this.config.enabled === false) return this.store.loadGraph();
    const files = this.findSourceFiles(this.resolveSourceRoots(options));
    const knownSourceFiles = files.map(f => path.relative(this.cwd, f).replace(/\\/g, '/'));
    const nodes = [];
    const edges = [];
    let index = this.store.defaultIndex();
    index.sourceRoots = (this.config.source_roots || []).filter(r => fs.existsSync(path.join(this.cwd, r)));

    for (const file of files) {
      const fileGraph = this.scanWithHash(file, knownSourceFiles);
      if (!fileGraph) continue;
      nodes.push(...fileGraph.nodes);
      edges.push(...fileGraph.edges);
      index = this.store.updateFileRecord(index, fileGraph);
    }

    const graph = this.store.saveGraph({ index, nodes: this.uniqueById(nodes), edges: this.uniqueById(edges) });
    this.rebuildContextSummary(graph);
    return graph;
  }

  syncFile(filePath, options = {}) {
    if (this.config.enabled === false) return this.store.loadGraph();
    const abs = path.isAbsolute(filePath) ? filePath : path.join(this.cwd, filePath);
    const rel = path.relative(this.cwd, abs).replace(/\\/g, '/');
    if (!fs.existsSync(abs)) {
      const graph = this.store.removeFile(rel);
      this.rebuildContextSummary(graph);
      return graph;
    }
    const knownSourceFiles = this.findSourceFiles().map(f => path.relative(this.cwd, f).replace(/\\/g, '/'));
    const fileGraph = this.scanWithHash(abs, knownSourceFiles);
    if (!fileGraph) return this.store.loadGraph();
    const graph = this.store.upsertFileGraph(fileGraph);
    this.rebuildContextSummary(graph);
    return graph;
  }

  syncChanged(options = {}) {
    const graph = this.store.loadGraph();
    const files = this.findSourceFiles();
    const current = new Set(files.map(f => path.relative(this.cwd, f).replace(/\\/g, '/')));
    let next = graph;
    for (const rel of Object.keys(graph.index.files || {})) {
      if (!current.has(rel)) next = this.store.removeFile(rel);
    }
    for (const file of files) {
      if (this.isFileStale(file, next.index)) next = this.syncFile(file, options);
    }
    this.rebuildContextSummary(next);
    return this.store.loadGraph();
  }

  removeFile(filePath) {
    const rel = path.relative(this.cwd, path.isAbsolute(filePath) ? filePath : path.join(this.cwd, filePath)).replace(/\\/g, '/');
    const graph = this.store.removeFile(rel);
    this.rebuildContextSummary(graph);
    return graph;
  }

  ensureFresh(options = {}) {
    const graph = this.store.loadGraph();
    if (!fs.existsSync(this.store.indexPath) || !fs.existsSync(this.store.summaryPath)) return this.build(options);
    if (options.force) return this.syncChanged(options);
    return graph;
  }

  rebuildContextSummary(graph = this.store.loadGraph()) {
    const provider = new CodeGraphContextProvider(graph);
    const summary = provider.buildSummary(graph);
    this.store.writeContextSummary(summary);
    return summary;
  }

  query(queryText, options = {}) {
    const provider = new CodeGraphContextProvider(this.store.loadGraph());
    return provider.query(queryText, options);
  }

  scanWithHash(file, knownSourceFiles) {
    const fileGraph = this.scanner.scanFile(file, { knownSourceFiles });
    if (!fileGraph) return null;
    const content = fs.readFileSync(file, 'utf8');
    fileGraph.hash = crypto.createHash('sha256').update(content).digest('hex');
    return fileGraph;
  }

  isFileStale(file, index) {
    const rel = path.relative(this.cwd, file).replace(/\\/g, '/');
    const record = index.files && index.files[rel];
    if (!record) return true;
    const stat = fs.statSync(file);
    return record.size !== stat.size || record.mtimeMs !== stat.mtimeMs;
  }

  uniqueById(items) {
    const map = new Map();
    for (const item of items) map.set(item.id, item);
    return [...map.values()];
  }
}

module.exports = { CodeGraphIndexer };
