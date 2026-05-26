const fs = require('fs');
const path = require('path');
const {
  createFileNodeId,
  createSymbolNodeId,
  createExternalNodeId,
  createEdgeId,
  normalizeGraphPath,
} = require('./schema');

const SUPPORTED_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.py']);
const IGNORED_PARTS = new Set(['node_modules', '.git', '.claude', 'coverage', 'dist', 'build', '.next', '__pycache__']);

class CodeGraphScanner {
  constructor(cwd = process.cwd(), options = {}) {
    this.cwd = cwd;
    this.maxFileSize = (options.maxFileSizeKb || 512) * 1024;
    this.ignore = options.ignore || [];
  }

  isSupportedFile(filePath) {
    return SUPPORTED_EXTENSIONS.has(path.extname(filePath));
  }

  isIgnoredPath(filePath) {
    const rel = normalizeGraphPath(this.cwd, filePath);
    const parts = rel.split('/');
    if (parts.some(p => IGNORED_PARTS.has(p))) return true;
    if (rel.startsWith('stdd/graph/cache') || rel.startsWith('stdd/graph/codegraph')) return true;
    return this.ignore.some(pattern => rel === pattern || rel.startsWith(pattern.replace(/\*\*?$/, '')));
  }

  detectLanguage(filePath) {
    const ext = path.extname(filePath);
    if (ext === '.py') return 'python';
    if (ext === '.ts' || ext === '.tsx') return 'typescript';
    return 'javascript';
  }

  scanFile(filePath, options = {}) {
    const abs = path.isAbsolute(filePath) ? filePath : path.join(this.cwd, filePath);
    const rel = normalizeGraphPath(this.cwd, abs);
    if (!this.isSupportedFile(abs) || this.isIgnoredPath(abs)) return null;
    const stat = fs.statSync(abs);
    if (stat.size > this.maxFileSize) return null;

    const content = fs.readFileSync(abs, 'utf8');
    const language = this.detectLanguage(abs);
    const isTest = this.isTestFile(rel);
    const fileNode = {
      id: createFileNodeId(rel),
      kind: 'file',
      name: path.basename(rel),
      path: rel,
      language,
      metadata: { isTest, extension: path.extname(rel) },
    };

    const nodes = [fileNode];
    const edges = [];
    const symbols = this.extractSymbols(content, rel, language);
    for (const symbol of symbols) {
      const node = {
        id: createSymbolNodeId(rel, symbol),
        kind: 'symbol',
        symbolKind: symbol.kind,
        name: symbol.name,
        path: rel,
        language,
        signature: symbol.signature || '',
        exported: Boolean(symbol.exported),
        loc: { start: symbol.line, end: symbol.line },
        metadata: { isTest },
      };
      nodes.push(node);
      edges.push({
        id: createEdgeId('contains', fileNode.id, node.id, `${rel}:${symbol.line}:${symbol.name}`),
        kind: 'contains',
        from: fileNode.id,
        to: node.id,
        confidence: 'regex',
        evidence: { path: rel, line: symbol.line, text: symbol.text || symbol.signature || symbol.name },
      });
      if (node.exported) {
        edges.push({
          id: createEdgeId('exports', fileNode.id, node.id, `${rel}:${symbol.line}:${symbol.name}`),
          kind: 'exports',
          from: fileNode.id,
          to: node.id,
          confidence: 'regex',
          evidence: { path: rel, line: symbol.line, text: symbol.text || symbol.signature || symbol.name },
        });
      }
    }

    const imports = this.extractImports(content, rel, language);
    for (const item of imports) {
      const external = {
        id: createExternalNodeId(item.source),
        kind: 'external',
        name: item.source,
        path: null,
        language: null,
        metadata: { importedBy: rel },
      };
      nodes.push(external);
      edges.push({
        id: createEdgeId('imports', fileNode.id, external.id, `${rel}:${item.line}:${item.source}`),
        kind: 'imports',
        from: fileNode.id,
        to: external.id,
        confidence: 'regex',
        evidence: { path: rel, line: item.line, text: item.text },
      });
    }

    const testTarget = options.knownSourceFiles ? this.inferTestTarget(rel, options.knownSourceFiles) : null;
    if (testTarget) {
      edges.push({
        id: createEdgeId('tests', fileNode.id, createFileNodeId(testTarget), `${rel}:${testTarget}`),
        kind: 'tests',
        from: fileNode.id,
        to: createFileNodeId(testTarget),
        confidence: 'heuristic',
        evidence: { path: rel, line: 1, text: `inferred test target: ${testTarget}` },
      });
    }

    return { relPath: rel, fileNode, nodes: this.uniqueNodes(nodes), edges, stat };
  }

  extractSymbols(content, relPath, language = this.detectLanguage(relPath)) {
    return language === 'python' ? this.extractPySymbols(content) : this.extractJSSymbols(content);
  }

  extractJSSymbols(content) {
    const symbols = [];
    const lines = content.split('\n');
    const patterns = [
      { kind: 'function', regex: /^\s*export\s+(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/ },
      { kind: 'function', regex: /^\s*(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/ },
      { kind: 'const', regex: /^\s*export\s+const\s+(\w+)\s*=/ },
      { kind: 'const', regex: /^\s*const\s+(\w+)\s*=/ },
      { kind: 'class', regex: /^\s*export\s+class\s+(\w+)/ },
      { kind: 'class', regex: /^\s*class\s+(\w+)/ },
      { kind: 'interface', regex: /^\s*export\s+interface\s+(\w+)/ },
      { kind: 'type', regex: /^\s*export\s+type\s+(\w+)/ },
      { kind: 'exports', regex: /^\s*exports\.(\w+)\s*=/ },
      { kind: 'exports', regex: /^\s*module\.exports\.(\w+)\s*=/ },
    ];
    lines.forEach((line, idx) => {
      for (const pattern of patterns) {
        const match = line.match(pattern.regex);
        if (!match) continue;
        symbols.push({
          kind: pattern.kind,
          name: match[1],
          line: idx + 1,
          signature: line.trim(),
          text: line.trim(),
          exported: /\bexport\b|exports\.|module\.exports/.test(line),
        });
        break;
      }
    });
    return symbols;
  }

  extractPySymbols(content) {
    const symbols = [];
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      let match = line.match(/^def\s+(\w+)\s*\(([^)]*)\)/);
      if (match) {
        symbols.push({ kind: 'function', name: match[1], line: idx + 1, signature: line.trim(), text: line.trim(), exported: true });
        return;
      }
      match = line.match(/^class\s+(\w+)/);
      if (match) {
        symbols.push({ kind: 'class', name: match[1], line: idx + 1, signature: line.trim(), text: line.trim(), exported: true });
      }
    });
    return symbols;
  }

  extractImports(content, relPath, language = this.detectLanguage(relPath)) {
    return language === 'python' ? this.extractPyImports(content) : this.extractJSImports(content);
  }

  extractJSImports(content) {
    const imports = [];
    content.split('\n').forEach((line, idx) => {
      let match = line.match(/import\s+(?:[^'\"]+\s+from\s+)?['\"]([^'\"]+)['\"]/);
      if (!match) match = line.match(/require\(\s*['\"]([^'\"]+)['\"]\s*\)/);
      if (match) imports.push({ source: match[1], line: idx + 1, text: line.trim() });
    });
    return imports;
  }

  extractPyImports(content) {
    const imports = [];
    content.split('\n').forEach((line, idx) => {
      let match = line.match(/^\s*import\s+([\w.]+)/);
      if (!match) match = line.match(/^\s*from\s+([\w.]+)\s+import\s+/);
      if (match) imports.push({ source: match[1], line: idx + 1, text: line.trim() });
    });
    return imports;
  }

  isTestFile(relPath) {
    return /(^|\/)(__tests__|test|tests)\//.test(relPath) || /\.(test|spec)\.(js|jsx|ts|tsx|py)$/.test(relPath);
  }

  inferTestTarget(relPath, knownSourceFiles = []) {
    if (!this.isTestFile(relPath)) return null;
    const base = path.basename(relPath).replace(/\.(test|spec)\.(js|jsx|ts|tsx|py)$/, '');
    return knownSourceFiles.find(file => path.basename(file, path.extname(file)) === base && !this.isTestFile(file)) || null;
  }

  uniqueNodes(nodes) {
    const map = new Map();
    for (const node of nodes) map.set(node.id, node);
    return [...map.values()];
  }
}

module.exports = { CodeGraphScanner, SUPPORTED_EXTENSIONS };
