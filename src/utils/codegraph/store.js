const fs = require('fs');
const path = require('path');
const { SCHEMA_VERSION } = require('./schema');

class CodeGraphStore {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.dir = path.join(cwd, 'stdd', 'graph', 'codegraph');
    this.memoryDir = path.join(cwd, 'stdd', 'memory');
    this.indexPath = path.join(this.dir, 'index.json');
    this.nodesPath = path.join(this.dir, 'nodes.json');
    this.edgesPath = path.join(this.dir, 'edges.json');
    this.summaryPath = path.join(this.memoryDir, 'codegraph.md');
  }

  ensureDirectories() {
    fs.mkdirSync(this.dir, { recursive: true });
    fs.mkdirSync(this.memoryDir, { recursive: true });
  }

  loadGraph() {
    this.ensureDirectories();
    const index = this.readJSON(this.indexPath, this.defaultIndex());
    const nodes = this.readJSON(this.nodesPath, []);
    const edges = this.readJSON(this.edgesPath, []);
    return { index, nodes, edges };
  }

  saveGraph({ index, nodes, edges }) {
    this.ensureDirectories();
    const nextIndex = {
      ...this.defaultIndex(),
      ...index,
      schemaVersion: SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      stats: this.computeStats(nodes || [], edges || []),
    };
    this.writeJSONAtomic(this.indexPath, nextIndex);
    this.writeJSONAtomic(this.nodesPath, this.sortById(nodes || []));
    this.writeJSONAtomic(this.edgesPath, this.sortById(edges || []));
    return { index: nextIndex, nodes: this.sortById(nodes || []), edges: this.sortById(edges || []) };
  }

  upsertFileGraph(fileGraph) {
    const graph = this.loadGraph();
    const fileNodeId = fileGraph.fileNode.id;
    const ownedNodeIds = new Set([fileNodeId, ...fileGraph.nodes.filter(n => n.kind === 'symbol').map(n => n.id)]);
    const nodes = graph.nodes.filter(n => {
      if (n.id === fileNodeId) return false;
      return !(n.kind === 'symbol' && n.path === fileGraph.relPath);
    });
    const edges = graph.edges.filter(e => !ownedNodeIds.has(e.from) && !ownedNodeIds.has(e.to));
    const merged = this.saveGraph({
      index: this.updateFileRecord(graph.index, fileGraph),
      nodes: [...nodes, ...fileGraph.nodes],
      edges: [...edges, ...fileGraph.edges],
    });
    return merged;
  }

  removeFile(relPath) {
    const graph = this.loadGraph();
    const fileId = `file:${relPath}`;
    const nodes = graph.nodes.filter(n => n.id !== fileId && n.path !== relPath);
    const removedIds = new Set(graph.nodes.filter(n => n.id === fileId || n.path === relPath).map(n => n.id));
    const edges = graph.edges.filter(e => !removedIds.has(e.from) && !removedIds.has(e.to));
    const index = { ...graph.index, files: { ...(graph.index.files || {}) } };
    delete index.files[relPath];
    return this.saveGraph({ index, nodes, edges });
  }

  getStats() {
    return this.loadGraph().index.stats || this.computeStats([], []);
  }

  writeContextSummary(markdown) {
    this.ensureDirectories();
    fs.writeFileSync(this.summaryPath, markdown, 'utf8');
  }

  defaultIndex() {
    const now = new Date().toISOString();
    return {
      schemaVersion: SCHEMA_VERSION,
      projectRoot: '.',
      generatedAt: now,
      updatedAt: now,
      sourceRoots: [],
      workspaces: [],
      stats: { files: 0, symbols: 0, edges: 0, imports: 0, tests: 0 },
      files: {},
    };
  }

  updateFileRecord(index, fileGraph) {
    const next = { ...this.defaultIndex(), ...index, files: { ...(index.files || {}) } };
    next.files[fileGraph.relPath] = {
      path: fileGraph.relPath,
      language: fileGraph.fileNode.language,
      size: fileGraph.stat.size,
      mtimeMs: fileGraph.stat.mtimeMs,
      hash: fileGraph.hash,
      nodeIds: fileGraph.nodes.map(n => n.id),
      edgeIds: fileGraph.edges.map(e => e.id),
      lastScannedAt: new Date().toISOString(),
    };
    return next;
  }

  computeStats(nodes, edges) {
    return {
      files: nodes.filter(n => n.kind === 'file').length,
      symbols: nodes.filter(n => n.kind === 'symbol').length,
      edges: edges.length,
      imports: edges.filter(e => e.kind === 'imports').length,
      tests: edges.filter(e => e.kind === 'tests').length,
    };
  }

  readJSON(filePath, fallback) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (_) {
      return fallback;
    }
  }

  writeJSONAtomic(filePath, data) {
    const tmp = `${filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
    fs.renameSync(tmp, filePath);
  }

  sortById(items) {
    return [...items].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  }
}

module.exports = { CodeGraphStore };
