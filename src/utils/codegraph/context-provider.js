class CodeGraphContextProvider {
  constructor(graph = null) {
    this.graph = graph;
  }

  buildSummary(graph = this.graph) {
    const g = graph || { index: {}, nodes: [], edges: [] };
    const stats = g.index.stats || { files: 0, symbols: 0, imports: 0, tests: 0, edges: 0 };
    const files = g.nodes.filter(n => n.kind === 'file');
    const symbols = g.nodes.filter(n => n.kind === 'symbol');
    const highConnectivity = this.highConnectivityFiles(g).slice(0, 10);
    const testEdges = g.edges.filter(e => e.kind === 'tests').slice(0, 10);
    const entryPoints = files.filter(f => /(^|\/)(index|main|cli|app)\.(js|ts|tsx|py)$/.test(f.path)).slice(0, 10);

    const lines = ['# CodeGraph Memory', ''];
    lines.push(`Generated: ${g.index.updatedAt || new Date().toISOString()}`);
    lines.push(`Schema: ${g.index.schemaVersion || 'codegraph.v0'}`);
    lines.push('');
    lines.push('## Overview');
    lines.push('');
    lines.push(`- Files indexed: ${stats.files || 0}`);
    lines.push(`- Symbols indexed: ${stats.symbols || 0}`);
    lines.push(`- Import edges: ${stats.imports || 0}`);
    lines.push(`- Test edges: ${stats.tests || 0}`);
    lines.push(`- Total edges: ${stats.edges || 0}`);
    lines.push('');

    lines.push('## Entry Points');
    lines.push('');
    if (entryPoints.length === 0) lines.push('- None detected yet');
    for (const file of entryPoints) lines.push(`- ${file.path}`);
    lines.push('');

    lines.push('## High-Connectivity Files');
    lines.push('');
    if (highConnectivity.length === 0) lines.push('- None detected yet');
    for (const item of highConnectivity) lines.push(`- ${item.path} (${item.count} edge(s))`);
    lines.push('');

    lines.push('## Top Symbols');
    lines.push('');
    if (symbols.length === 0) lines.push('- None detected yet');
    for (const symbol of symbols.slice(0, 20)) lines.push(`- ${symbol.name} (${symbol.symbolKind}) — ${symbol.path}:${symbol.loc?.start || 1}`);
    lines.push('');

    lines.push('## Test Links');
    lines.push('');
    if (testEdges.length === 0) lines.push('- None detected yet');
    for (const edge of testEdges) lines.push(`- ${edge.from} tests ${edge.to}`);
    lines.push('');

    lines.push('## Usage');
    lines.push('');
    lines.push('This layer is loaded by default by `stdd context` and maintained automatically by STDD CodeGraph sync.');
    return lines.join('\n');
  }

  query(queryText, options = {}) {
    const q = String(queryText || '').toLowerCase();
    const g = this.graph || { nodes: [], edges: [] };
    const limit = options.limit || 20;
    const results = [];
    for (const node of g.nodes) {
      const name = String(node.name || '').toLowerCase();
      const p = String(node.path || '').toLowerCase();
      let score = 0;
      let reason = '';
      if (name === q) { score = 1; reason = 'exact name match'; }
      else if (name.includes(q)) { score = 0.8; reason = 'name match'; }
      else if (p.includes(q)) { score = 0.6; reason = 'path match'; }
      if (score > 0) results.push({ nodeId: node.id, score, path: node.path, kind: node.kind, name: node.name, reason });
    }
    return { query: queryText, results: results.sort((a, b) => b.score - a.score).slice(0, limit) };
  }

  getNeighbors(nodeId, options = {}) {
    const g = this.graph || { nodes: [], edges: [] };
    const depth = options.depth || 1;
    const visited = new Set([nodeId]);
    const frontier = [nodeId];
    const edges = [];
    for (let d = 0; d < depth; d++) {
      const next = [];
      for (const id of frontier) {
        for (const edge of g.edges) {
          if (edge.from !== id && edge.to !== id) continue;
          edges.push(edge);
          const other = edge.from === id ? edge.to : edge.from;
          if (!visited.has(other)) {
            visited.add(other);
            next.push(other);
          }
        }
      }
      frontier.splice(0, frontier.length, ...next);
    }
    const nodes = g.nodes.filter(n => visited.has(n.id));
    return { nodes, edges };
  }

  highConnectivityFiles(graph) {
    const files = new Map();
    for (const node of graph.nodes || []) {
      if (node.kind === 'file') files.set(node.id, { path: node.path, count: 0 });
    }
    for (const edge of graph.edges || []) {
      if (files.has(edge.from)) files.get(edge.from).count++;
      if (files.has(edge.to)) files.get(edge.to).count++;
    }
    return [...files.values()].filter(f => f.count > 0).sort((a, b) => b.count - a.count);
  }
}

module.exports = { CodeGraphContextProvider };
