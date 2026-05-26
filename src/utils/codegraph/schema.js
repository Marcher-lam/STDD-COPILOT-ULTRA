const path = require('path');
const crypto = require('crypto');

const SCHEMA_VERSION = 'codegraph.v0';

function normalizeGraphPath(cwd, filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
  return path.relative(cwd, abs).replace(/\\/g, '/');
}

function safeIdPart(value) {
  return String(value || '').replace(/\\/g, '/').replace(/\s+/g, '_');
}

function createFileNodeId(relPath) {
  return `file:${safeIdPart(relPath)}`;
}

function createSymbolNodeId(relPath, symbol) {
  const kind = symbol.kind || symbol.symbolKind || 'symbol';
  return `symbol:${safeIdPart(relPath)}#${kind}:${safeIdPart(symbol.name)}`;
}

function createExternalNodeId(name) {
  return `external:${safeIdPart(name)}`;
}

function createEdgeId(kind, from, to, evidenceKey = '') {
  const raw = `${kind}:${from}:${to}:${evidenceKey}`;
  const hash = crypto.createHash('sha1').update(raw).digest('hex').slice(0, 12);
  return `edge:${kind}:${hash}`;
}

function validateNode(node) {
  return Boolean(node && node.id && node.kind && node.name !== undefined);
}

function validateEdge(edge) {
  return Boolean(edge && edge.id && edge.kind && edge.from && edge.to);
}

module.exports = {
  SCHEMA_VERSION,
  normalizeGraphPath,
  createFileNodeId,
  createSymbolNodeId,
  createExternalNodeId,
  createEdgeId,
  validateNode,
  validateEdge,
};
